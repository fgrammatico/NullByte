import {
  world,
  system,
  Player,
  GameMode,
  BlockVolume,
  CommandPermissionLevel,
  CustomCommandParamType,
} from "@minecraft/server";
import type {
  CustomCommandRegistry,
  CustomCommandOrigin,
  CustomCommandResult,
  Vector3,
} from "@minecraft/server";
import { CustomCommandStatus } from "@minecraft/server";
import { GAME_CONFIG } from "./game-config.js";

// ---------------------------------------------------------------------------
// Scoreboard objective keys
// ---------------------------------------------------------------------------

const OBJ = GAME_CONFIG.objectives;

const ALL_OBJECTIVES = Object.values(OBJ);
const GLOBAL_PARTICIPANT = GAME_CONFIG.globalParticipant;

// ---------------------------------------------------------------------------
// Map boundary (update after first build session — /gamerule showcoordinates true)
// Walk to each corner of the playable area and record the X,Z values below.
// ---------------------------------------------------------------------------

const BOUNDARY = GAME_CONFIG.boundary;

// ---------------------------------------------------------------------------
// Noise thresholds
// ---------------------------------------------------------------------------

const NOISE_MAX        = 100;
const NOISE_DECAY_RATE = 1;    // points lost per second (every 20 ticks)
const NOISE_ALERT      = 50;   // ALERT threshold
const NOISE_ALARM      = 100;  // full alarm — vex spawns, counter increments

const LOCK_ALERT_TICKS = 10 * 20;
const LOCK_BREACH_TICKS = 30 * 20;
const LOCK_LOCKDOWN_TICKS = 60 * 20;
const LOCKDOWN_BOSS_MOB = "minecraft:warden";

const PERM_GUEST = 0;
const PERM_USER = 1;
const PERM_ADMIN = 2;
const PERM_ROOT = 3;
const LOGIN_USERNAME = GAME_CONFIG.login.username;
const LOGIN_PASSWORD = GAME_CONFIG.login.password;

// Progress flags (p01..p07) and the context shown when each one is captured,
// whether it is unlocked by gameplay or set manually via /scoreboard.
const FLAG_KEYS = [
  OBJ.p01,
  OBJ.p02,
  OBJ.p03,
  OBJ.p04,
  OBJ.p05,
  OBJ.p06,
  OBJ.p07,
] as const;

const FLAG_META: Record<string, { name: string; hint: string }> = {
  [OBJ.p01]: { name: "Credentials", hint: "nb:login <user> <pass> is now available." },
  [OBJ.p02]: { name: "Core Route", hint: "The End gateway route is available." },
  [OBJ.p03]: { name: "Exploit Token", hint: "nb:exploit firewall is now available." },
  [OBJ.p04]: { name: "Sudo Secret", hint: "nb:sudo is now available." },
  [OBJ.p05]: { name: "IDS Bypass Module", hint: "nb:exploit ids is now available." },
  [OBJ.p06]: { name: "Encryption Key", hint: "nb:exploit encryption is now available." },
  [OBJ.p07]: { name: "Port Knock", hint: "The root endpoint is open." },
};

// ---------------------------------------------------------------------------
// Startup — register custom commands before world loads
// ---------------------------------------------------------------------------

system.beforeEvents.startup.subscribe((event) => {
  const startupEvent = event as { customCommandRegistry?: CustomCommandRegistry };
  const registry = startupEvent.customCommandRegistry;
  if (registry) {
    try {
      registerCommands(registry);
    } catch {
      // Continue with fallback paths on platforms where custom command
      // registration is not fully supported.
    }
  }
  registerChatFallbackCommands();
  registerScriptEventFallbackCommands();
});

let objectivesRegistered = false;

world.afterEvents.worldLoad.subscribe(() => {
  ensureSharedStateRegistered();
  clearLegacyNoiseDisplay();
});

// ---------------------------------------------------------------------------
// Scoreboard initialisation (idempotent)
// ---------------------------------------------------------------------------

function registerAllObjectives(): void {
  const sb = world.scoreboard;
  for (const key of ALL_OBJECTIVES) {
    if (!sb.getObjective(key)) {
      sb.addObjective(key, key);
    }
  }
}

function ensureObjectivesRegistered(): void {
  if (objectivesRegistered) return;
  registerAllObjectives();

  // Command fallback for environments where scoreboard API objective creation
  // is unreliable in the current callback context.
  for (const key of ALL_OBJECTIVES) {
    try {
      world.getDimension("overworld").runCommand(`scoreboard objectives add ${key} dummy`);
    } catch {
      // Ignore "already exists" and restricted-context errors.
    }
  }

  objectivesRegistered = true;
}

function clearLegacyNoiseDisplay(): void {
  try {
    world.getDimension("overworld").runCommand("scoreboard objectives setdisplay sidebar");
  } catch {
    // Ignore failures on restricted worlds.
  }
}

function ensureSharedStateRegistered(): void {
  ensureObjectivesRegistered();
  for (const key of ALL_OBJECTIVES) {
    const objective = world.scoreboard.getObjective(key);
    if (!objective) continue;
    try {
      if (objective.getScore(GLOBAL_PARTICIPANT) === undefined) {
        objective.setScore(GLOBAL_PARTICIPANT, 0);
      }
    } catch {
      try {
        objective.setScore(GLOBAL_PARTICIPANT, 0);
      } catch {
        // Ignore initialization failures and let later ticks retry.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPlayer(origin: CustomCommandOrigin): Player | undefined {
  return origin.sourceEntity instanceof Player ? origin.sourceEntity : undefined;
}

function runDeferredPlayerCommand(
  origin: CustomCommandOrigin,
  action: (player: Player) => void,
): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  // Use next tick to avoid restricted execution edge cases in command callbacks.
  system.runTimeout(() => {
    ensureSharedStateRegistered();
    if (getScore(OBJ.victory) >= 1) {
      player.sendMessage("§a[terminal]§r  HEXCORE is offline. Root access has already been achieved.");
      return;
    }
    const lockTicks = getScore(OBJ.locked);
    if (lockTicks > 0) {
      const remaining = Math.ceil(lockTicks / 20);
      player.sendMessage(`§c[terminal]§r  TERMINAL LOCKED — ${remaining}s remaining`);
      player.onScreenDisplay.setActionBar(`§cTERMINAL LOCKED — ${remaining}s§r`);
      return;
    }

    action(player);
  }, 1);

  return { status: CustomCommandStatus.Success };
}

function setLockTicks(ticks: number): void {
  const current = getScore(OBJ.locked);
  if (ticks > current) {
    setScore(OBJ.locked, ticks);
  }
}

function setPermission(permission: number): void {
  setScore(OBJ.perm, permission);
}

function revokeToGuest(): void {
  setPermission(PERM_GUEST);
  for (const player of world.getAllPlayers()) {
    player.onScreenDisplay.setTitle("§cACCESS REVOKED", {
      subtitle: "§7Threat level critical",
      fadeInDuration: 0,
      stayDuration: 50,
      fadeOutDuration: 10,
    });
  }
}

function getScore(objective: string): number {
  const scoreboardObjective = world.scoreboard.getObjective(objective);
  if (!scoreboardObjective) return 0;
  try {
    return scoreboardObjective.getScore(GLOBAL_PARTICIPANT) ?? 0;
  } catch {
    return 0;
  }
}

function setScore(objective: string, value: number): void {
  const scoreboardObjective = world.scoreboard.getObjective(objective);
  if (!scoreboardObjective) return;
  try {
    scoreboardObjective.setScore(GLOBAL_PARTICIPANT, value);
  } catch {
    // Ignore write failures; the next writable tick retries.
  }
}

function addNoise(amount: number): void {
  ensureSharedStateRegistered();
  const current = getScore(OBJ.noise);
  setScore(OBJ.noise, Math.max(0, Math.min(NOISE_MAX, current + amount)));
}

type NoiseBand = "CLEAN" | "WARNING" | "ALERT" | "BREACH" | "LOCKDOWN";

function getNoiseBand(level: number): NoiseBand {
  if (level >= 100) return "LOCKDOWN";
  if (level >= 75) return "BREACH";
  if (level >= 50) return "ALERT";
  if (level >= 25) return "WARNING";
  return "CLEAN";
}

function getMisuseSpawnCount(level: number): number {
  const band = getNoiseBand(level);
  switch (band) {
    case "CLEAN":
      return 0;
    case "WARNING":
      return 1;
    case "ALERT":
      return 2;
    case "BREACH":
      return 3;
    case "LOCKDOWN":
      return 4;
    default:
      return 1;
  }
}

function getPatrolMobForBand(band: NoiseBand): string {
  switch (band) {
    case "ALERT":
      return "minecraft:vindicator";
    case "BREACH":
      return "minecraft:ravager";
    case "LOCKDOWN":
      return "minecraft:vindicator";
    case "WARNING":
    case "CLEAN":
    default:
      return "minecraft:zombie";
  }
}

function spawnPatrolEntity(
  player: Player,
  entityType: string,
  x: number,
  y: number,
  z: number,
): void {
  const dim = player.dimension;
  try {
    dim.spawnEntity(entityType, { x, y, z });
  } catch {
    try {
      const cmdId = entityType.replace("minecraft:", "");
      dim.runCommand(`summon ${cmdId} ${x} ${y} ${z}`);
    } catch {
      // Ignore if both paths fail.
    }
  }
}

function findSafeSpawnLocation(player: Player, x: number, z: number): Vector3 | undefined {
  const baseY = Math.floor(player.location.y);
  for (let y = baseY + 4; y >= baseY - 8; y--) {
    try {
      const floor = player.dimension.getBlock({ x, y, z });
      const body = player.dimension.getBlock({ x, y: y + 1, z });
      const head = player.dimension.getBlock({ x, y: y + 2, z });
      if (floor && body && head && !floor.isAir && body.isAir && head.isAir) {
        return { x: x + 0.5, y: y + 1, z: z + 0.5 };
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function getPatrolMarkers(player: Player): Vector3[] {
  const center = player.location;
  const radius = 64;
  const verticalRange = 16;
  try {
    const volume = new BlockVolume(
      {
        x: Math.floor(center.x) - radius,
        y: Math.floor(center.y) - verticalRange,
        z: Math.floor(center.z) - radius,
      },
      {
        x: Math.floor(center.x) + radius,
        y: Math.floor(center.y) + verticalRange,
        z: Math.floor(center.z) + radius,
      },
    );
    const matches = player.dimension.getBlocks(
      volume,
      { includeTypes: ["minecraft:chiseled_stone_bricks"] },
      true,
    );
    return [...matches.getBlockLocationIterator()]
      .sort((a, b) => {
        const distanceA = ((a.x - center.x) ** 2) + ((a.z - center.z) ** 2);
        const distanceB = ((b.x - center.x) ** 2) + ((b.z - center.z) ** 2);
        return distanceA - distanceB;
      });
  } catch {
    return [];
  }
}

function spawnMisusePatrols(
  player: Player,
  count: number,
  band: NoiseBand,
  includeLockdownBoss = true,
): void {
  if (count <= 0) return;

  const offsets = [
    { x: 12, z: 0 },
    { x: -12, z: 0 },
    { x: 0, z: 12 },
    { x: 0, z: -12 },
    { x: 10, z: 10 },
    { x: -10, z: 10 },
    { x: 10, z: -10 },
    { x: -10, z: -10 },
    { x: 18, z: 0 },
    { x: -18, z: 0 },
    { x: 0, z: 18 },
    { x: 0, z: -18 },
    { x: 15, z: 15 },
    { x: -15, z: 15 },
    { x: 15, z: -15 },
    { x: -15, z: -15 },
    { x: 20, z: 5 },
    { x: -20, z: -5 },
    { x: 5, z: 20 },
    { x: -5, z: -20 },
  ];

  const loc = player.location;
  const primaryMob = getPatrolMobForBand(band);
  const markers = getPatrolMarkers(player);

  const getSpawnLocation = (index: number): Vector3 | undefined => {
    const marker = markers[index % Math.max(1, markers.length)];
    if (marker) {
      return findSafeSpawnLocation(player, marker.x, marker.z) ?? {
        x: marker.x + 0.5,
        y: marker.y + 1,
        z: marker.z + 0.5,
      };
    }
    const offset = offsets[index % offsets.length];
    return findSafeSpawnLocation(
      player,
      Math.floor(loc.x + offset.x),
      Math.floor(loc.z + offset.z),
    );
  };

  let i = 0;

  // LOCKDOWN includes one boss-tier spawn before support units.
  if (band === "LOCKDOWN" && includeLockdownBoss) {
    const spawn = getSpawnLocation(0);
    if (spawn) {
      spawnPatrolEntity(player, LOCKDOWN_BOSS_MOB, spawn.x, spawn.y, spawn.z);
    }
    i = 1;
  }

  for (; i < count; i++) {
    const spawn = getSpawnLocation(i);
    if (spawn) {
      spawnPatrolEntity(player, primaryMob, spawn.x, spawn.y, spawn.z);
    }
  }
}

function applyCommandPenalty(player: Player, reason: string, baseNoise: number): void {
  ensureSharedStateRegistered();

  addNoise(baseNoise);
  const updatedNoise = getScore(OBJ.noise);
  const band = getNoiseBand(updatedNoise);
  const spawnCount = getMisuseSpawnCount(updatedNoise);
  spawnMisusePatrols(player, spawnCount, band);
  player.onScreenDisplay.setTitle("§cSENTINEL", {
    fadeInDuration: 0,
    stayDuration: 36,
    fadeOutDuration: 8,
    subtitle: "§cIntrusion detected",
  });

  player.sendMessage(
    `§c[terminal]§r  ${reason} §7(noise +${baseNoise}, patrol +${spawnCount}, now ${updatedNoise}/100)§r`,
  );
}

function noiseBar(level: number): string {
  const filled = Math.min(10, Math.floor(level / 10));
  const color  = level >= NOISE_ALARM ? "§c" : level >= NOISE_ALERT ? "§e" : "§a";
  return `${color}${"█".repeat(filled)}§8${"░".repeat(10 - filled)}§r`;
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

function registerCommands(registry: CustomCommandRegistry): void {
  registry.registerCommand(
    {
      name: "nb:menu",
      description: "Show the terminal command menu.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handleHelp,
  );

  registry.registerCommand(
    {
      name: "nb:whoami",
      description: "Display current user identity and access level.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handleWhoami,
  );

  registry.registerCommand(
    {
      name: "nb:scan",
      description: "Scan the local network for active services.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handleScan,
  );

  registry.registerCommand(
    {
      name: "nb:status",
      description: "Display current session progress.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handleStatus,
  );

  registry.registerCommand(
    {
      name: "nb:login",
      description: "Authenticate with local system credentials (usage: nb:login <username> <password>).",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      optionalParameters: [
        { name: "username", type: CustomCommandParamType.String },
        { name: "password", type: CustomCommandParamType.String },
      ],
    },
    handleLogin,
  );

  registry.registerCommand(
    {
      name: "nb:sudo",
      description: "Execute a privileged command (usage: nb:sudo <action>).",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      optionalParameters: [
        { name: "action", type: CustomCommandParamType.String },
      ],
    },
    handleSudo,
  );

  registry.registerCommand(
    {
      name: "nb:ls",
      description: "List known system paths.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handleLs,
  );

  registry.registerCommand(
    {
      name: "nb:cat",
      description: "Read a system file. Usage: /nb:cat auth.log  or  /nb:cat config  (no leading slash in argument).",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      optionalParameters: [
        { name: "path", type: CustomCommandParamType.String },
      ],
    },
    handleCat,
  );

  registry.registerCommand(
    {
      name: "nb:exploit",
      description: "Execute an exploit action (usage: nb:exploit <firewall|ids|encryption|root>).",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      optionalParameters: [
        { name: "target", type: CustomCommandParamType.String },
      ],
    },
    handleExploit,
  );

  registry.registerCommand(
    {
      name: "nb:patch_covers",
      description: "Reduce trace noise with cooldown.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handlePatchCovers,
  );

  registry.registerCommand(
    {
      name: "nb:kill_patrol",
      description: "Eliminate nearby defense patrols.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handleKillPatrol,
  );

  registry.registerCommand(
    {
      name: "nb:reset",
      description: "Operator only. Clear all shared progress so the game can be replayed from the start.",
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: true,
    },
    handleReset,
  );
}

// ---------------------------------------------------------------------------
// Chat fallback command registration
// Use this on platforms/builds where CustomCommandRegistry commands do not show.
// Players can type: nb:menu, nb:scan, nb:login user pass, nb:sudo action
// ---------------------------------------------------------------------------

const lastChatDispatch = new Map<string, string>();

function dispatchChatCommand(sender: Player, rawMessage: string): boolean {
  ensureSharedStateRegistered();

  const raw = rawMessage.trim();
  if (!raw) return false;

  // Support both `nb:menu` and `/nb:menu` if slash-form reaches chat pipeline.
  const normalized = raw.startsWith("/") ? raw.slice(1) : raw;
  if (!normalized.toLowerCase().startsWith("nb:")) return false;

  // Prevent duplicate handling when both beforeEvents and afterEvents fire.
  const stamp = `${tickCount}:${normalized.toLowerCase()}`;
  const key = sender.name;
  if (lastChatDispatch.get(key) === stamp) return true;
  lastChatDispatch.set(key, stamp);

  const parts = normalized.split(/\s+/);
  const cmd = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  const origin = ({ sourceEntity: sender } as unknown) as CustomCommandOrigin;

  switch (cmd) {
    case "nb:menu":
      handleHelp(origin);
      return true;
    case "nb:whoami":
      handleWhoami(origin);
      return true;
    case "nb:scan":
      handleScan(origin);
      return true;
    case "nb:status":
      handleStatus(origin);
      return true;
    case "nb:login":
      handleLogin(origin, ...args);
      return true;
    case "nb:sudo":
      handleSudo(origin, ...args);
      return true;
    case "nb:ls":
      handleLs(origin);
      return true;
    case "nb:cat":
      handleCat(origin, ...args);
      return true;
    case "nb:exploit":
      handleExploit(origin, ...args);
      return true;
    case "nb:patch_covers":
      handlePatchCovers(origin);
      return true;
    case "nb:kill_patrol":
      handleKillPatrol(origin);
      return true;
    case "nb:reset":
      handleReset(origin);
      return true;
    default:
      applyCommandPenalty(sender, "Unknown command. Type nb:menu.", 2);
      return true;
  }
}

function registerChatFallbackCommands(): void {
  const worldAny = world as unknown as {
    beforeEvents?: { chatSend?: { subscribe: (cb: (ev: unknown) => void) => void } };
    afterEvents?: { chatSend?: { subscribe: (cb: (ev: unknown) => void) => void } };
  };

  const beforeChat = worldAny.beforeEvents?.chatSend;
  if (beforeChat) {
    beforeChat.subscribe((ev: unknown) => {
      const event = ev as { message?: string; sender?: unknown; cancel?: boolean };
      if (!(event.sender instanceof Player)) return;

      const message = event.message ?? "";
      const normalized = message.trim().startsWith("/")
        ? message.trim().slice(1)
        : message.trim();

      if (!normalized.toLowerCase().startsWith("nb:")) return;

      // beforeEvents chat callbacks are read-only. Defer command execution so
      // scoreboard writes and mob spawns work reliably.
      event.cancel = true;
      const sender = event.sender;
      system.run(() => {
        dispatchChatCommand(sender, message);
      });
    });
  }

  const afterChat = worldAny.afterEvents?.chatSend;
  if (afterChat) {
    afterChat.subscribe((ev: unknown) => {
      const event = ev as {
        message?: string;
        sender?: unknown;
        senderPlayer?: unknown;
      };
      const sender = event.senderPlayer ?? event.sender;
      if (!(sender instanceof Player)) return;
      dispatchChatCommand(sender, event.message ?? "");
    });
  }
}

// ---------------------------------------------------------------------------
// Script event fallback command registration
// Use this when both custom commands and chat hooks are unavailable. Puzzle
// command blocks also send nb:knock events for the shared Port Knock state.
// Example usage in chat:
//   /scriptevent nb:menu
//   /scriptevent nb:status
//   /scriptevent nb:login user pass
//   /scriptevent nb:sudo whoami
// ---------------------------------------------------------------------------

function registerScriptEventFallbackCommands(): void {
  const systemAny = system as unknown as {
    afterEvents?: {
      scriptEventReceive?: {
        subscribe: (cb: (ev: unknown) => void) => void;
      };
    };
  };

  const signal = systemAny.afterEvents?.scriptEventReceive;
  if (!signal) return;

  signal.subscribe((ev: unknown) => {
    const event = ev as {
      id?: string;
      message?: string;
      sourceEntity?: unknown;
      initiator?: unknown;
    };

    const id = (event.id ?? "").trim().toLowerCase();
    if (!id.startsWith("nb:")) return;

    const msg = (event.message ?? "").trim();
    if (id === "nb:knock") {
      handlePortKnock(msg);
      return;
    }

    const sender = (event.sourceEntity ?? event.initiator) as unknown;
    if (!(sender instanceof Player)) return;

    const combined = msg.length > 0 ? `${id} ${msg}` : id;
    dispatchChatCommand(sender, combined);
  });
}

function handlePortKnock(rawPort: string): void {
  ensureSharedStateRegistered();
  if (getScore(OBJ.p07) >= 1 || getScore(OBJ.victory) >= 1) return;

  const sequence = GAME_CONFIG.portKnockSequence;
  const state = Math.max(0, Math.min(2, getScore(OBJ.knock)));
  const port = rawPort.trim();

  if (port !== sequence[state]) {
    setScore(OBJ.knock, 0);
    addNoise(2);
    world.sendMessage(`§c[PORT KNOCK]§r  Sequence rejected at port ${port || "?"}. State reset. §7(noise +2)§r`);
    return;
  }

  if (state < sequence.length - 1) {
    setScore(OBJ.knock, state + 1);
    world.sendMessage(`§7[PORT KNOCK]§r  SYN acknowledged (${state + 1}/${sequence.length}).`);
    return;
  }

  setScore(OBJ.knock, 0);
  setScore(OBJ.p07, 1);
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

function handleHelp(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();
    const hasCredentials  = getScore(OBJ.p01) >= 1;
    const hasCoreRoute    = getScore(OBJ.p02) >= 1;
    const hasExploitToken = getScore(OBJ.p03) >= 1;
    const hasSudoSecret   = getScore(OBJ.p04) >= 1;
    const hasIdsBypass    = getScore(OBJ.p05) >= 1;
    const hasEncKey       = getScore(OBJ.p06) >= 1;
    const hasPortKnock    = getScore(OBJ.p07) >= 1;
    const encryptionBroken = getScore(OBJ.enc) >= 1;
    const isUser  = getScore(OBJ.perm) >= PERM_USER;
    const isAdmin = getScore(OBJ.perm) >= PERM_ADMIN;

    // Always visible
    const lines: string[] = [
      "§a[HEXCORE TERMINAL v0.0.26]§r",
      "§7Commands available:§r",
      "  §fnb:menu§r      — this output",
      "  §fnb:whoami§r    — current identity",
      "  §fnb:status§r    — session progress",
    ];

    // Unlocked by p01 (credentials found)
    if (hasCredentials) {
      lines.push("  §fnb:login§r     — authenticate");
      lines.push("  §fnb:ls§r        — list known files");
      lines.push("  §fnb:cat§r       — read known files §8(usage: /nb:cat auth.log  or  /nb:cat config)§r");
      lines.push("  §fnb:scan§r      — enumerate services");
    }

    // Available after the shared session has authenticated.
    if (isUser) {
      lines.push("  §fnb:patch_covers§r — reduce trace noise §8(60s cooldown)§r");
    }

    // Exploit chain — show each sub-target only when its token is present
    if (hasExploitToken || hasIdsBypass || hasEncKey || (hasPortKnock && encryptionBroken)) {
      lines.push("  §fnb:exploit§r   — exploit chain:");
      if (hasExploitToken) lines.push("    §8›§r firewall" + (isUser ? "" : " §8[user required]§r"));
      if (hasIdsBypass)    lines.push("    §8›§r ids"      + (isUser ? "" : " §8[user required]§r"));
      if (hasEncKey)       lines.push("    §8›§r encryption" + (isAdmin ? "" : " §8[admin required]§r"));
      if (hasPortKnock && encryptionBroken) {
        lines.push("    §8›§r root §8[End dimension required]§r" + (isAdmin ? "" : " §8[admin required]§r"));
      }
    }

    if (hasSudoSecret && isUser && !isAdmin) {
      lines.push("  §fnb:sudo§r      — privileged exec");
    }
    if (isAdmin) {
      lines.push("  §fnb:kill_patrol§r — clear nearby patrols");
    }

    // Flag summary for debugging / player awareness
    const flagSummary = [
      `p01=${hasCredentials ? 1 : 0}`,
      `p02=${hasCoreRoute ? 1 : 0}`,
      `p03=${hasExploitToken ? 1 : 0}`,
      `p04=${hasSudoSecret ? 1 : 0}`,
      `p05=${hasIdsBypass ? 1 : 0}`,
      `p06=${hasEncKey ? 1 : 0}`,
      `p07=${hasPortKnock ? 1 : 0}`,
    ].join("  ");
    lines.push(`§7Flags:§r  ${flagSummary}`);

    player.sendMessage(lines.join("\n"));
  });
}

function handleWhoami(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();
    const permission = getScore(OBJ.perm);
    let role: string;
    if (permission >= PERM_ROOT) role = "§aroot§r";
    else if (permission >= PERM_ADMIN) role = "§cadmin§r";
    else if (permission >= PERM_USER) role = "§euser§r";
    else role = "§8guest§r";
    const uid = Math.abs(
      player.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 9999,
    );
    player.sendMessage(`§7[whoami]§r  operator=${player.name}  shared_role=${role}  uid=${uid}`);
  });
}

function handleScan(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();

    if (getScore(OBJ.p01) < 1) {
      applyCommandPenalty(player, "[scan] Access denied. Credentials not discovered.", 4);
      return;
    }

    addNoise(15);

    const firewallBypassed = getScore(OBJ.fwall) >= 1;
    const idsDisabled = getScore(OBJ.ids) >= 1;
    const isAdmin = getScore(OBJ.perm) >= PERM_ADMIN;

    const lines = [
      "§7[scan]§r  Scanning local subnet... §7(noise +15)§r",
      `  §f22/tcp§r   open  §assh§r    OpenSSH 8.4`,
      `  §f80/tcp§r   open  §ahttp§r   nginx/1.18`,
      `  §f443/tcp§r  open  §ahttps§r  nginx/1.18   ` + (firewallBypassed ? "§a[CLEARED]§r" : "§e[FIREWALL ACTIVE]§r"),
      `  §f3306/tcp§r open  §amysql§r              ` + (idsDisabled ? "§a[UNMONITORED]§r" : "§8[IDS MONITORED]§r"),
      `  §f9999/tcp§r open  §aadmin§r              ` + (isAdmin ? "§a[CLEARED]§r" : "§c[RESTRICTED]§r"),
      "§8  tip: run /nb:ls to list known files, then /nb:cat auth.log or /nb:cat config to read them.§r",
    ];
    player.sendMessage(lines.join("\n"));
  });
}

function handleStatus(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();
    const solved = [OBJ.p01, OBJ.p02, OBJ.p03, OBJ.p04, OBJ.p05, OBJ.p06, OBJ.p07]
      .filter((key) => getScore(key) >= 1).length;
    const noise = getScore(OBJ.noise);
    const alarms = getScore(OBJ.alarms);
    player.sendMessage(
      `§7[status]§r  Challenges: §a${solved}/7§r  Noise: ${noiseBar(noise)} ${noise}  Alarms: §c${alarms}§r`,
    );
  });
}

function isOperator(player: Player): boolean {
  try {
    return player.commandPermissionLevel >= CommandPermissionLevel.GameDirectors;
  } catch {
    return false;
  }
}

// Deliberately bypasses runDeferredPlayerCommand: reset must still work when the
// terminal is locked or victory has already been recorded.
function handleReset(origin: CustomCommandOrigin): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  system.runTimeout(() => {
    if (!isOperator(player)) {
      player.sendMessage("§c[reset]§r  Denied. Operator permission required.");
      return;
    }

    resetSharedState();

    player.sendMessage(
      [
        "§a[reset]§r  Shared state cleared. All objectives are back to 0.",
        "§7Physical state does NOT reset. Fix these by hand:§r",
        "  §8- gates opened with setblock: replace the block§r",
        "  §8- latched hopper filters in the End vault§r",
        "  §8- keycards already in player inventories§r",
        "  §8- NPC scenes: /dialogue change @e[tag=soc_triage_npc] soc_triage_locked§r",
      ].join("\n"),
    );
    world.sendMessage("§e[SYSTEM]§r  Session reset by operator. All progress cleared.");
  }, 1);

  return { status: CustomCommandStatus.Success };
}

function resetSharedState(): void {
  ensureObjectivesRegistered();

  // Wipes builder-created objectives too (nb_sshlog, nb_fwall_tp, nb_p02_tp).
  try {
    world.getDimension("overworld").runCommand(`scoreboard players reset ${GLOBAL_PARTICIPANT}`);
  } catch {
    // Ignore; the explicit writes below still clear every known objective.
  }

  for (const key of ALL_OBJECTIVES) {
    setScore(key, 0);
  }

  lastNoiseBand = undefined;
  lastFlagState.clear();
  lastDimension.clear();
  lastChatDispatch.clear();
}

function handleLogin(origin: CustomCommandOrigin, ...args: unknown[]): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();

    // Custom command registry passes parameters as separate arguments, while
    // the chat fallback spreads its parsed tokens. Normalize both into a list.
    const params = args.filter((a): a is string => typeof a === "string");
    if (params.length < 2) {
      applyCommandPenalty(player, "[login] Usage: nb:login <username> <password>", 2);
      return;
    }

    if (getScore(OBJ.p01) < 1) {
      applyCommandPenalty(player, "[login] Authentication failed. Invalid credentials.", 4);
      return;
    }

    const username = params[0].toLowerCase();
    const password = params[1];
    if (username !== LOGIN_USERNAME || password !== LOGIN_PASSWORD) {
      applyCommandPenalty(player, "[login] Authentication failed. Invalid credentials.", 4);
      return;
    }

    if (getScore(OBJ.perm) >= PERM_USER) {
      player.sendMessage("§7[login]§r  Shared user session is already active.");
      return;
    }

    addNoise(10);
    setPermission(PERM_USER);
    player.sendMessage(`§a[login]§r  Welcome, ${username}. Session token established.`);
    for (const onlinePlayer of world.getAllPlayers()) {
      onlinePlayer.onScreenDisplay.setTitle("§aACCESS GRANTED");
    }
  });
}

function handleSudo(origin: CustomCommandOrigin, ...args: unknown[]): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();

    const params = args.filter((a): a is string => typeof a === "string");
    if (params.length < 1) {
      applyCommandPenalty(player, "[sudo] Usage: nb:sudo <action>", 2);
      return;
    }

    if (getScore(OBJ.perm) < PERM_USER) {
      applyCommandPenalty(player, "[sudo] User session required.", 4);
      return;
    }

    if (getScore(OBJ.p04) < 1) {
      const currentNoise = getScore(OBJ.noise);
      const noisePenalty = currentNoise >= 75 ? 6 : 4;
      applyCommandPenalty(player, "[sudo] Permission denied. Admin verification required.", noisePenalty);
      return;
    }

    if (getScore(OBJ.perm) >= PERM_ADMIN) {
      player.sendMessage("§7[sudo]§r  Shared admin session is already active.");
      return;
    }

    addNoise(25);
    setPermission(PERM_ADMIN);
    const action = params[0];
    player.sendMessage(`§a[sudo]§r  Executing: §f${action}§r`);
    player.sendMessage("§7[sudo]§r  Done.");
  });
}

function handleLs(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();
    if (getScore(OBJ.p01) < 1) {
      applyCommandPenalty(player, "[ls] Access denied. Credentials not discovered.", 3);
      return;
    }
    addNoise(1);

    const lines = [
      "§7[ls]§r  /",
      "  §f/var/log/auth.log§r",
      "  §f/etc/config§r",
      "  §8/opt/exploits/firewall.bin§r",
      "  §8/opt/exploits/ids.bin§r",
      "  §8/opt/keys/encryption.key§r",
      "§7[ls]§r  complete §7(noise +1)§r",
      "§8  tip: read files with /nb:cat auth.log  or  /nb:cat config§r",
    ];
    player.sendMessage(lines.join("\n"));
  });
}

function handleCat(origin: CustomCommandOrigin, ...args: unknown[]): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();

    if (getScore(OBJ.p01) < 1) {
      applyCommandPenalty(player, "[cat] Access denied. Credentials not discovered.", 4);
      return;
    }

    const params = args.filter((a): a is string => typeof a === "string");
    if (params.length < 1) {
      applyCommandPenalty(player, "[cat] Usage: nb:cat <auth|config>", 2);
      return;
    }

    // The Bedrock native command parser rejects a leading slash argument, so
    // accept slash-free keywords (auth, config) as well as full path forms
    // that arrive through the chat fallback.
    const norm = params
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join("/")
      .replace(/^\/+/, "")
      .replace(/\/+/g, "/")
      .toLowerCase();

    const isAuth =
      norm === "auth" ||
      norm === "authlog" ||
      norm === "auth.log" ||
      norm === "var/log/auth.log";
    const isConfig = norm === "config" || norm === "etc/config";

    if (isAuth) {
      addNoise(1);
      player.sendMessage(
        [
          "§7[cat] /var/log/auth.log§r",
          "  04:11 auth: default account policy active",
          "  04:13 auth: token check moved to vault puzzle flag",
          "  04:17 auth: legacy guest password removed",
          "§7[cat]§r  read complete §7(noise +1)§r",
        ].join("\n"),
      );
      return;
    }

    if (isConfig) {
      addNoise(1);
      player.sendMessage(
        [
          "§7[cat] /etc/config§r",
          "  firewall.mode=strict",
          "  ids.mode=active",
          "  encryption.layer=core",
          "  note: exploit chain requires token, ids bypass, and core key",
          "§7[cat]§r  read complete §7(noise +1)§r",
        ].join("\n"),
      );
      return;
    }

    applyCommandPenalty(player, `[cat] File not found: ${norm}`, 3);
  });
}

function handleExploit(origin: CustomCommandOrigin, ...args: unknown[]): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();

    const params = args.filter((a): a is string => typeof a === "string");
    if (params.length < 1) {
      applyCommandPenalty(player, "[exploit] Usage: nb:exploit <firewall|ids|encryption|root>", 2);
      return;
    }

    const target = params[0].toLowerCase();
    const permission = getScore(OBJ.perm);

    if (target === "firewall") {
      if (permission < PERM_USER) {
        applyCommandPenalty(player, "[exploit firewall] User permission required.", 4);
        return;
      }
      if (getScore(OBJ.p03) < 1) {
        applyCommandPenalty(player, "[exploit firewall] Missing exploit token.", 20);
        return;
      }
      if (getScore(OBJ.fwall) >= 1) {
        player.sendMessage("§7[exploit firewall]§r  Firewall bypass is already active.");
        return;
      }
      addNoise(15);
      setScore(OBJ.fwall, 1);
      player.sendMessage("§a[exploit firewall]§r  Firewall bypassed. Access route opened.");
      return;
    }

    if (target === "ids") {
      if (permission < PERM_USER) {
        applyCommandPenalty(player, "[exploit ids] User permission required.", 4);
        return;
      }
      if (getScore(OBJ.p05) < 1) {
        applyCommandPenalty(player, "[exploit ids] IDS bypass module not found.", 18);
        return;
      }
      if (getScore(OBJ.ids) >= 1) {
        player.sendMessage("§7[exploit ids]§r  IDS bypass is already active.");
        return;
      }
      addNoise(12);
      setScore(OBJ.ids, 1);
      player.sendMessage("§a[exploit ids]§r  IDS bypass active. Noise now decays twice as fast.");
      return;
    }

    if (target === "encryption") {
      if (permission < PERM_ADMIN) {
        applyCommandPenalty(player, "[exploit encryption] Admin permission required.", 6);
        return;
      }
      if (getScore(OBJ.p06) < 1) {
        applyCommandPenalty(player, "[exploit encryption] Encryption key not found.", 25);
        return;
      }
      if (getScore(OBJ.enc) >= 1) {
        player.sendMessage("§7[exploit encryption]§r  Core encryption is already broken.");
        return;
      }
      addNoise(20);
      setScore(OBJ.enc, 1);
      player.sendMessage("§a[exploit encryption]§r  Core encryption broken. Complete the Port Knock to expose root.");
      return;
    }

    if (target === "root") {
      if (permission < PERM_ADMIN) {
        applyCommandPenalty(player, "[exploit root] Admin permission required.", 6);
        return;
      }
      if (getScore(OBJ.enc) < 1) {
        applyCommandPenalty(player, "[exploit root] Core encryption is still active.", 30);
        return;
      }
      if (getScore(OBJ.p07) < 1) {
        applyCommandPenalty(player, "[exploit root] Port Knock sequence incomplete.", 30);
        return;
      }
      if (player.dimension.id !== "minecraft:the_end") {
        applyCommandPenalty(player, "[exploit root] Must execute from the End system core.", 30);
        return;
      }
      addNoise(50);
      setPermission(PERM_ROOT);
      setScore(OBJ.victory, 1);
      setScore(OBJ.locked, 0);
      player.sendMessage("§a[exploit root]§r  Root access granted. Core shutdown sequence initiated...");
      player.onScreenDisplay.setTitle("§aROOT ACCESS", {
        subtitle: "§7System core compromised",
        fadeInDuration: 0,
        stayDuration: 40,
        fadeOutDuration: 10,
      });

      // Staged shutdown sequence.
      const loc = { x: player.location.x, y: player.location.y, z: player.location.z };
      const dim = player.dimension;

      system.runTimeout(() => {
        try { player.sendMessage("§c[SYSTEM]§r  WARNING: Core destabilising. Emergency containment failed."); } catch {}
      }, 40);

      system.runTimeout(() => {
        try { world.sendMessage("§6[SYSTEM]§r  SENTINEL processes terminated."); } catch {}
      }, 80);

      system.runTimeout(() => {
        try {
          dim.runCommand(`summon lightning_bolt ${Math.round(loc.x)} ${Math.round(loc.y)} ${Math.round(loc.z)}`);
          player.sendMessage("§4[SYSTEM]§r  CRITICAL: Power surge detected.");
        } catch {}
      }, 120);

      system.runTimeout(() => {
        try {
          player.onScreenDisplay.setTitle("§c[SYSTEM OFFLINE]", {
            subtitle: "§7HEXCORE terminal shutting down...",
            fadeInDuration: 10,
            stayDuration: 80,
            fadeOutDuration: 20,
          });
          world.sendMessage(
            "§a[NullByte]§r  §lMISSION COMPLETE§r\n" +
            `  ${player.name} executed the root exploit.\n` +
            "  The network has been dismantled.",
          );
        } catch {}
      }, 200);

      return;
    }

    applyCommandPenalty(player, `[exploit] Unknown target: ${target}`, 2);
  });
}

function handlePatchCovers(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();

    if (getScore(OBJ.perm) < PERM_USER) {
      applyCommandPenalty(player, "[patch_covers] User permission required.", 4);
      return;
    }

    const now = world.getAbsoluteTime();
    const readyTick = getScore(OBJ.patchReady);
    if (readyTick > now) {
      const waitSeconds = Math.ceil((readyTick - now) / 20);
      applyCommandPenalty(player, `[patch_covers] Cooldown active (${waitSeconds}s remaining).`, 5);
      return;
    }

    addNoise(5);
    const reduced = Math.max(0, getScore(OBJ.noise) - 15);
    setScore(OBJ.noise, reduced);
    setScore(OBJ.patchReady, now + (60 * 20));
    player.sendMessage("§a[patch_covers]§r  Logs sanitized. Noise reduced by 15. Cooldown 60s.");
  });
}

function handleKillPatrol(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensureSharedStateRegistered();

    if (getScore(OBJ.perm) < PERM_ADMIN) {
      applyCommandPenalty(player, "[kill_patrol] Admin permission required.", 10);
      return;
    }

    const defenseTypes = new Set([
      "minecraft:zombie",
      "minecraft:vindicator",
      "minecraft:ravager",
      "minecraft:warden",
      "minecraft:vex",
    ]);

    let killed = 0;
    for (const entity of player.dimension.getEntities({
      location: player.location,
      maxDistance: 32,
    })) {
      if (entity instanceof Player) continue;
      if (!defenseTypes.has(entity.typeId)) continue;
      try {
        entity.kill();
        killed++;
      } catch {
        // Skip entities that cannot be killed in this context.
      }
    }

    addNoise(5);
    player.sendMessage(`§a[kill_patrol]§r  Neutralized ${killed} defense entities. §7(noise +5)§r`);
  });
}

// ---------------------------------------------------------------------------
// Game tick loop
// ---------------------------------------------------------------------------

let tickCount = 0;
let lastNoiseBand: NoiseBand | undefined;
let lastPatrolTick = 0;
const lastDimension = new Map<string, string>();

// Puzzle flags are immutable shared discoveries. Seed their baseline once when
// the script starts, then announce and reward every later 0 -> 1 transition.
const lastFlagState = new Map<string, number>();
let flagBaselineSeeded = false;

function announceFlagGains(): void {
  for (const key of FLAG_KEYS) {
    const value = getScore(key);
    if (flagBaselineSeeded) {
      const prev = lastFlagState.get(key) ?? 0;
      if (prev < 1 && value >= 1) {
        const meta = FLAG_META[key];
        addNoise(-3);
        world.sendMessage(
          `§a[FLAG CAPTURED]§r  §e${meta.name}§r unlocked! §7${meta.hint} Noise -3.§r`,
        );
        for (const player of world.getAllPlayers()) {
          player.onScreenDisplay.setTitle("§aFLAG CAPTURED", {
            subtitle: meta.name,
            fadeInDuration: 0,
            stayDuration: 30,
            fadeOutDuration: 10,
          });
        }
      }
    }
    lastFlagState.set(key, value);
  }
  flagBaselineSeeded = true;
}

function getPatrolIntervalTicks(band: NoiseBand): number {
  switch (band) {
    case "WARNING":
      return 40 * 20;
    case "ALERT":
      return 20 * 20;
    case "BREACH":
      return 10 * 20;
    case "LOCKDOWN":
      return 10 * 20;
    case "CLEAN":
    default:
      return 0;
  }
}

function getScheduledPatrolCount(band: NoiseBand): number {
  switch (band) {
    case "WARNING":
      return 3;
    case "ALERT":
      return 6;
    case "BREACH":
      return 12;
    case "LOCKDOWN":
      return 20;
    case "CLEAN":
    default:
      return 0;
  }
}

function spawnSharedPatrols(count: number, band: NoiseBand): void {
  const players = world.getAllPlayers();
  if (players.length === 0 || count <= 0) return;

  const baseCount = Math.floor(count / players.length);
  let remainder = count % players.length;
  for (let index = 0; index < players.length; index++) {
    const playerCount = baseCount + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    if (playerCount <= 0) continue;
    spawnMisusePatrols(players[index], playerCount, band, index === 0);
  }
}

function onBandEscalation(from: NoiseBand, to: NoiseBand): void {
  if (from === to) return;

  const bandRank = { CLEAN: 0, WARNING: 1, ALERT: 2, BREACH: 3, LOCKDOWN: 4 } as const;
  if (bandRank[to] >= bandRank.ALERT) {
    setScore(OBJ.alarms, getScore(OBJ.alarms) + 1);
    if (getScore(OBJ.fwall) >= 1) {
      setScore(OBJ.fwall, 0);
      world.sendMessage("§6[SENTINEL]§r  Defense team patched the firewall exploit.");
    }
  }

  if (to === "WARNING") {
    spawnSharedPatrols(3, "WARNING");
    world.sendMessage("§e[SENTINEL]§r  Warning threshold reached.");
    return;
  }

  if (to === "ALERT") {
    spawnSharedPatrols(6, "ALERT");
    setLockTicks(LOCK_ALERT_TICKS);
    world.sendMessage("§6[SENTINEL]§r  ALERT state active. Terminal lockout: 10s.");
    return;
  }

  if (to === "BREACH") {
    spawnSharedPatrols(12, "BREACH");
    setLockTicks(LOCK_BREACH_TICKS);
    revokeToGuest();
    const overworld = world.getDimension("overworld");
    for (const player of world.getAllPlayers()) {
      player.teleport(
        { x: BOUNDARY.spawnX, y: BOUNDARY.spawnY, z: BOUNDARY.spawnZ },
        { dimension: overworld },
      );
    }
    world.sendMessage("§c[SENTINEL]§r  BREACH state. Shared permission revoked.");
    return;
  }

  if (to === "LOCKDOWN") {
    spawnSharedPatrols(20, "LOCKDOWN");
    setLockTicks(LOCK_LOCKDOWN_TICKS);
    revokeToGuest();
    world.sendMessage("§4[SENTINEL]§r  LOCKDOWN active. Terminal disabled.");
  }
}

function checkDimensionEntry(player: Player): void {
  const currentDimension = player.dimension.id;
  const previousDimension = lastDimension.get(player.name);
  lastDimension.set(player.name, currentDimension);
  if (!previousDimension || previousDimension === currentDimension) return;

  if (currentDimension === "minecraft:nether" && getScore(OBJ.fwall) < 1) {
    addNoise(8);
    world.sendMessage(`§c[SENTINEL]§r  ${player.name} entered the Nether before the firewall was bypassed. Noise +8.`);
  }

  if (currentDimension === "minecraft:the_end" && getScore(OBJ.p02) < 1) {
    addNoise(8);
    world.sendMessage(`§c[SENTINEL]§r  ${player.name} entered the End before the core route was opened. Noise +8.`);
  }
}

function gameTick(): void {
  tickCount++;
  ensureSharedStateRegistered();

  const players = world.getAllPlayers();
  if (getScore(OBJ.victory) >= 1) {
    for (const player of players) {
      player.onScreenDisplay.setActionBar("§aROOT ACCESS — HEXCORE OFFLINE§r");
    }
    system.run(gameTick);
    return;
  }

  const lockTicks = getScore(OBJ.locked);
  if (lockTicks > 0) {
    setScore(OBJ.locked, lockTicks - 1);
  }

  const noise = getScore(OBJ.noise);
  const band = getNoiseBand(noise);
  const previousBand = lastNoiseBand ?? band;
  if (band !== previousBand) {
    const bandRank = { CLEAN: 0, WARNING: 1, ALERT: 2, BREACH: 3, LOCKDOWN: 4 } as const;
    if (bandRank[band] > bandRank[previousBand]) {
      onBandEscalation(previousBand, band);
      lastPatrolTick = tickCount;
    } else if (bandRank[previousBand] >= bandRank.ALERT && bandRank[band] < bandRank.ALERT) {
      world.sendMessage("§a[SENTINEL]§r  Threat reduced. Re-authentication available.");
    }
    lastNoiseBand = band;
  } else if (lastNoiseBand === undefined) {
    lastNoiseBand = band;
    lastPatrolTick = tickCount;
  }

  const interval = getPatrolIntervalTicks(band);
  if (interval > 0 && tickCount - lastPatrolTick >= interval) {
    spawnSharedPatrols(getScheduledPatrolCount(band), band);
    lastPatrolTick = tickCount;
  }

  for (const player of players) {
    if (lockTicks > 1) {
      const remaining = Math.ceil((lockTicks - 1) / 20);
      player.onScreenDisplay.setActionBar(`§cTERMINAL LOCKED — ${remaining}s§r`);
    } else {
      player.onScreenDisplay.setActionBar(
        `§7[shared noise]§r ${noiseBar(noise)} §f${noise}/100 §7${band}§r`,
      );
    }
    checkDimensionEntry(player);
  }

  announceFlagGains();

  // Shared sprinting pressure is capped so additional local players do not
  // multiply the rate. Any sprinting player adds +1 every 2 ticks.
  if (tickCount % 2 === 0 && players.some((player) => player.isSprinting)) {
    addNoise(1);
  }

  // Noise decay — every 20 ticks (1 real second)
  if (tickCount % 20 === 0) {
    const current = getScore(OBJ.noise);
    const currentBand = getNoiseBand(current);
    if (current > 0 && currentBand !== "LOCKDOWN") {
      const decayStepTicks = currentBand === "ALERT" ? 40 : 20;
      if (tickCount % decayStepTicks === 0) {
        const idsMultiplier = getScore(OBJ.ids) >= 1 ? 2 : 1;
        setScore(OBJ.noise, current - (NOISE_DECAY_RATE * idsMultiplier));
      }
    }
  }

  // Boundary enforcement — every 10 ticks (0.5 real seconds)
  if (tickCount % 10 === 0) {
    for (const player of world.getAllPlayers()) {
      enforceBoundary(player);
    }
  }

  system.run(gameTick);
}

system.run(gameTick);

// ---------------------------------------------------------------------------
// Player join handler
// ---------------------------------------------------------------------------

world.afterEvents.playerJoin.subscribe((event) => {
  // Wait 3 seconds for the player to fully load before applying settings
  system.runTimeout(() => {
    const player = world.getAllPlayers().find((p) => p.name === event.playerName);
    if (!player) return;
    onPlayerJoin(player);
  }, 60);
});

function onPlayerJoin(player: Player): void {
  ensureSharedStateRegistered();
  clearLegacyNoiseDisplay();
  lastDimension.set(player.name, player.dimension.id);
  player.setGameMode(GameMode.Adventure);
  player.onScreenDisplay.setActionBar("");

  if (getScore(OBJ.victory) >= 1) {
    player.sendMessage("§a[HEXCORE]§r  System already compromised. Root access is active.");
    player.onScreenDisplay.setTitle("§aMISSION COMPLETE");
    return;
  }

  player.sendMessage("§7[HEXCORE]§r  Connection established. Shared session state loaded.");
  player.onScreenDisplay.setTitle("§eHEXCORE§r", {
    subtitle: "Security Evaluation — Session Active",
    fadeInDuration: 10,
    stayDuration: 60,
    fadeOutDuration: 10,
  });
}

// ---------------------------------------------------------------------------
// Boundary enforcement
// ---------------------------------------------------------------------------

function enforceBoundary(player: Player): void {
  if (player.dimension.id !== "minecraft:overworld") return;
  const loc = player.location;
  const out =
    loc.x < BOUNDARY.minX ||
    loc.x > BOUNDARY.maxX ||
    loc.z < BOUNDARY.minZ ||
    loc.z > BOUNDARY.maxZ;

  if (out) {
    player.teleport(
      { x: BOUNDARY.spawnX, y: BOUNDARY.spawnY, z: BOUNDARY.spawnZ },
      { dimension: world.getDimension("overworld") },
    );
    player.sendMessage("§c[SENTINEL]§r  Out of bounds. Returning to staging area.");
    player.onScreenDisplay.setTitle("§c⚠ OUT OF BOUNDS ⚠");
  }
}

// ---------------------------------------------------------------------------
// Additional noise sources (Phase 2+)
// ---------------------------------------------------------------------------

const DEFENSE_MOB_IDS = new Set([
  "minecraft:zombie",
  "minecraft:vindicator",
  "minecraft:ravager",
  "minecraft:warden",
  "minecraft:vex",
]);

// +3 noise when a player hits a defense mob.
world.afterEvents.entityHitEntity.subscribe((event) => {
  if (!(event.damagingEntity instanceof Player)) return;
  if (!DEFENSE_MOB_IDS.has(event.hitEntity.typeId)) return;
  ensureSharedStateRegistered();
  addNoise(3);
});

const SERVER_HARDWARE_BLOCK_IDS = new Set([
  "minecraft:observer",
  "nullbyte:server_hardware",
  "jig:ccomp:server_block",
]);

// +5 noise when a player breaks a block used as server hardware.
world.afterEvents.playerBreakBlock.subscribe((event) => {
  if (!SERVER_HARDWARE_BLOCK_IDS.has(event.brokenBlockPermutation.type.id)) return;
  ensureSharedStateRegistered();
  addNoise(5);
  event.player.sendMessage("§c[SENTINEL]§r  Server hardware tampered. Noise +5.");
});
