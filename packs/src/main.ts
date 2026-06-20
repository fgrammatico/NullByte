import {
  world,
  system,
  Player,
  GameMode,
  CommandPermissionLevel,
  CustomCommandParamType,
} from "@minecraft/server";
import type {
  ScoreboardIdentity,
  CustomCommandRegistry,
  CustomCommandOrigin,
  CustomCommandResult,
} from "@minecraft/server";
import { CustomCommandStatus } from "@minecraft/server";

// ---------------------------------------------------------------------------
// Scoreboard objective keys
// ---------------------------------------------------------------------------

const OBJ = {
  noise:    "nb_noise",
  alarms:   "nb_alarms",
  locked:   "nb_locked",
  perm:     "nb_perm",
  startTick:"nb_start",
  fwall:    "nb_fwall",   // 1 = firewall currently bypassed; reset on ALERT escalation
  p01:      "nb_p01",
  p02:      "nb_p02",
  p03:      "nb_p03",
  p04:      "nb_p04",
  p05:      "nb_p05",
  p06:      "nb_p06",
  p07:      "nb_p07",
} as const;

const ALL_OBJECTIVES = Object.values(OBJ);

// ---------------------------------------------------------------------------
// Map boundary (update after first build session — /gamerule showcoordinates true)
// Walk to each corner of the playable area and record the X,Z values below.
// ---------------------------------------------------------------------------

const BOUNDARY = {
  minX: -867,
  maxX:  1253,
  minZ: -308,
  maxZ:  615,
  spawnX:    982,
  spawnY:   68,
  spawnZ:    396,
};

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
  [OBJ.p02]: { name: "Session Token", hint: "User session established." },
  [OBJ.p03]: { name: "Exploit Token", hint: "nb:exploit firewall is now available." },
  [OBJ.p04]: { name: "Admin Rights", hint: "nb:sudo and admin exploits unlocked." },
  [OBJ.p05]: { name: "IDS Bypass Module", hint: "nb:exploit ids is now available." },
  [OBJ.p06]: { name: "Encryption Key", hint: "nb:exploit encryption is now available." },
  [OBJ.p07]: { name: "Root Payload", hint: "nb:exploit root is ready — run it from the End core." },
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
  ensureObjectivesRegistered();
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

function ensurePlayerObjectivesRegistered(player: Player): void {
  ensureObjectivesRegistered();
  for (const key of ALL_OBJECTIVES) {
    const objective = world.scoreboard.getObjective(key);
    if (!objective) continue;
    try {
      // getScore returns undefined when the player is not yet a participant.
      // Only then do we write 0 to register them. Never reset an existing value.
      if (objective.getScore(player) === undefined) {
        objective.setScore(player, 0);
      }
    } catch {
      try {
        objective.setScore(player, 0);
      } catch {
        // Ignore objective init failures and let later ticks retry.
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
    ensurePlayerObjectivesRegistered(player);
    const lockTicks = getScore(player, OBJ.locked);
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

function setLockTicks(player: Player, ticks: number): void {
  const current = getScore(player, OBJ.locked);
  if (ticks > current) {
    setScore(player, OBJ.locked, ticks);
  }
}

function setPermission(player: Player, permission: number): void {
  setScore(player, OBJ.perm, permission);
}

function revokeToGuest(player: Player): void {
  setScore(player, OBJ.p02, 0);
  setScore(player, OBJ.p04, 0);
  setPermission(player, PERM_GUEST);
  player.onScreenDisplay.setTitle("§cACCESS REVOKED", {
    subtitle: "§7Threat level critical",
    fadeInDuration: 0,
    stayDuration: 50,
    fadeOutDuration: 10,
  });
}

function getScoreParticipant(player: Player): ScoreboardIdentity | string {
  return player.scoreboardIdentity ?? player.name;
}

function getScore(player: Player, objective: string): number {
  const scoreboardObjective = world.scoreboard.getObjective(objective);
  if (!scoreboardObjective) return 0;
  try {
    const entityScore = scoreboardObjective.getScore(player);
    if (entityScore !== undefined) return entityScore;
    const identity = player.scoreboardIdentity;
    if (identity) {
      const identityScore = scoreboardObjective.getScore(identity);
      if (identityScore !== undefined) return identityScore;
    }
    return scoreboardObjective.getScore(player.name) ?? 0;
  } catch {
    try {
      return scoreboardObjective.getScore(player.name) ?? 0;
    } catch {
      return 0;
    }
  }
}

function setScore(player: Player, objective: string, value: number): void {
  const scoreboardObjective = world.scoreboard.getObjective(objective);
  if (!scoreboardObjective) return;
  try {
    // Always write to the player entity participant so that values set via
    // /scoreboard players set @s ... and script writes target the same record.
    scoreboardObjective.setScore(player, value);
  } catch {
    // Ignore write failures; the next writable tick retries.
  }
}

function addNoise(player: Player, amount: number): void {
  ensurePlayerObjectivesRegistered(player);
  const current = getScore(player, OBJ.noise);
  setScore(player, OBJ.noise, Math.min(NOISE_MAX, current + amount));
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
      return 1;
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

function spawnMisusePatrols(player: Player, count: number, band: NoiseBand): void {
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

  let i = 0;

  // LOCKDOWN includes one boss-tier spawn before support units.
  if (band === "LOCKDOWN") {
    const offset = offsets[0];
    const sx = Math.floor(loc.x + offset.x);
    const sy = Math.floor(loc.y);
    const sz = Math.floor(loc.z + offset.z);
    spawnPatrolEntity(player, LOCKDOWN_BOSS_MOB, sx, sy, sz);
    i = 1;
  }

  for (; i < count; i++) {
    const offset = offsets[i % offsets.length];
    const sx = Math.floor(loc.x + offset.x);
    const sy = Math.floor(loc.y);
    const sz = Math.floor(loc.z + offset.z);
    spawnPatrolEntity(player, primaryMob, sx, sy, sz);
  }
}

function applyCommandPenalty(player: Player, reason: string, baseNoise: number): void {
  ensurePlayerObjectivesRegistered(player);

  addNoise(player, baseNoise);
  const updatedNoise = getScore(player, OBJ.noise);
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
}

// ---------------------------------------------------------------------------
// Chat fallback command registration
// Use this on platforms/builds where CustomCommandRegistry commands do not show.
// Players can type: nb:menu, nb:scan, nb:login user pass, nb:sudo action
// ---------------------------------------------------------------------------

const lastChatDispatch = new Map<string, string>();

function dispatchChatCommand(sender: Player, rawMessage: string): boolean {
  ensurePlayerObjectivesRegistered(sender);

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
// Use this when both custom commands and chat hooks are unavailable.
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

    const sender = (event.sourceEntity ?? event.initiator) as unknown;
    if (!(sender instanceof Player)) return;

    const id = (event.id ?? "").trim().toLowerCase();
    if (!id.startsWith("nb:")) return;

    const msg = (event.message ?? "").trim();
    const combined = msg.length > 0 ? `${id} ${msg}` : id;
    dispatchChatCommand(sender, combined);
  });
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

function handleHelp(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);
    const hasCredentials  = getScore(player, OBJ.p01) >= 1;
    const hasSession      = getScore(player, OBJ.p02) >= 1;
    const hasExploitToken = getScore(player, OBJ.p03) >= 1;
    const hasAdmin        = getScore(player, OBJ.p04) >= 1;
    const hasIdsBypass    = getScore(player, OBJ.p05) >= 1;
    const hasEncKey       = getScore(player, OBJ.p06) >= 1;
    const hasRootReady    = getScore(player, OBJ.p07) >= 1;
    const isUser  = getScore(player, OBJ.perm) >= PERM_USER;
    const isAdmin = getScore(player, OBJ.perm) >= PERM_ADMIN;

    // Always visible
    const lines: string[] = [
      "§a[HEXCORE TERMINAL v0.0.23]§r",
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

    // Unlocked by user session (p02) or user perm
    if (isUser) {
      lines.push("  §fnb:patch_covers§r — reduce trace noise §8(60s cooldown)§r");
    }

    // Exploit chain — show each sub-target only when its token is present
    if (hasExploitToken || hasIdsBypass || hasEncKey || hasRootReady) {
      lines.push("  §fnb:exploit§r   — exploit chain:");
      if (hasExploitToken) lines.push("    §8›§r firewall" + (isUser ? "" : " §8[user required]§r"));
      if (hasIdsBypass)    lines.push("    §8›§r ids"      + (isUser ? "" : " §8[user required]§r"));
      if (hasEncKey)       lines.push("    §8›§r encryption" + (isAdmin ? "" : " §8[admin required]§r"));
      if (hasRootReady)    lines.push("    §8›§r root §8[End dimension required]§r" + (isAdmin ? "" : " §8[admin required]§r"));
    }

    // Admin commands
    if (isAdmin || hasAdmin) {
      lines.push("  §fnb:sudo§r      — privileged exec");
      lines.push("  §fnb:kill_patrol§r — clear nearby patrols");
    }

    // Flag summary for debugging / player awareness
    const flagSummary = [
      `p01=${hasCredentials ? 1 : 0}`,
      `p02=${hasSession ? 1 : 0}`,
      `p03=${hasExploitToken ? 1 : 0}`,
      `p04=${hasAdmin ? 1 : 0}`,
      `p05=${hasIdsBypass ? 1 : 0}`,
      `p06=${hasEncKey ? 1 : 0}`,
      `p07=${hasRootReady ? 1 : 0}`,
    ].join("  ");
    lines.push(`§7Flags:§r  ${flagSummary}`);

    player.sendMessage(lines.join("\n"));
  });
}

function handleWhoami(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);
    const p01 = getScore(player, OBJ.p01);
    const p04 = getScore(player, OBJ.p04);
    let role: string;
    if (p04 >= 1) role = "§cadmin§r";
    else if (p01 >= 1) role = "§euser§r";
    else role = "§8guest§r";
    const uid = Math.abs(
      player.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 9999,
    );
    player.sendMessage(`§7[whoami]§r  uid=${uid}  user=${player.name}  role=${role}`);
  });
}

function handleScan(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);

    if (getScore(player, OBJ.p01) < 1) {
      applyCommandPenalty(player, "[scan] Access denied. No valid session token.", 4);
      return;
    }

    addNoise(player, 15);

    const p02 = getScore(player, OBJ.p02) >= 1;
    const p03 = getScore(player, OBJ.p03) >= 1;
    const p04 = getScore(player, OBJ.p04) >= 1;

    const lines = [
      "§7[scan]§r  Scanning local subnet... §7(noise +15)§r",
      `  §f22/tcp§r   open  §assh§r    OpenSSH 8.4`,
      `  §f80/tcp§r   open  §ahttp§r   nginx/1.18`,
      `  §f443/tcp§r  open  §ahttps§r  nginx/1.18   ` + (p02 ? "§a[CLEARED]§r" : "§e[FIREWALL ACTIVE]§r"),
      `  §f3306/tcp§r open  §amysql§r              ` + (p03 ? "§a[CLEARED]§r" : "§8[FILTERED]§r"),
      `  §f9999/tcp§r open  §aadmin§r              ` + (p04 ? "§a[CLEARED]§r" : "§c[RESTRICTED]§r"),
      "§8  tip: run /nb:ls to list known files, then /nb:cat auth.log or /nb:cat config to read them.§r",
    ];
    player.sendMessage(lines.join("\n"));
  });
}

function handleStatus(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);
    const solved = [OBJ.p01, OBJ.p02, OBJ.p03, OBJ.p04, OBJ.p05, OBJ.p06, OBJ.p07]
      .filter((key) => getScore(player, key) >= 1).length;
    const noise = getScore(player, OBJ.noise);
    const alarms = getScore(player, OBJ.alarms);
    player.sendMessage(
      `§7[status]§r  Challenges: §a${solved}/7§r  Noise: ${noiseBar(noise)} ${noise}  Alarms: §c${alarms}§r`,
    );
  });
}

function handleLogin(origin: CustomCommandOrigin, ...args: unknown[]): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);

    // Custom command registry passes parameters as separate arguments, while
    // the chat fallback spreads its parsed tokens. Normalize both into a list.
    const params = args.filter((a): a is string => typeof a === "string");
    if (params.length < 2) {
      applyCommandPenalty(player, "[login] Usage: nb:login <username> <password>", 2);
      return;
    }

    if (getScore(player, OBJ.p01) < 1) {
      applyCommandPenalty(player, "[login] Authentication failed. Invalid credentials.", 4);
      return;
    }

    addNoise(player, 10);
    setScore(player, OBJ.p02, 1);
    setPermission(player, PERM_USER);
    const username = params[0];
    player.sendMessage(`§a[login]§r  Welcome, ${username}. Session token established.`);
    player.onScreenDisplay.setTitle("§aACCESS GRANTED");
  });
}

function handleSudo(origin: CustomCommandOrigin, ...args: unknown[]): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);

    const params = args.filter((a): a is string => typeof a === "string");
    if (params.length < 1) {
      applyCommandPenalty(player, "[sudo] Usage: nb:sudo <action>", 2);
      return;
    }

    if (getScore(player, OBJ.p04) < 1) {
      const currentNoise = getScore(player, OBJ.noise);
      const noisePenalty = currentNoise >= 75 ? 6 : 4;
      applyCommandPenalty(player, "[sudo] Permission denied. Admin verification required.", noisePenalty);
      return;
    }

    addNoise(player, 25);
    setScore(player, OBJ.p04, 1);
    setPermission(player, PERM_ADMIN);
    const action = params[0];
    player.sendMessage(`§a[sudo]§r  Executing: §f${action}§r`);
    player.sendMessage("§7[sudo]§r  Done.");
  });
}

function handleLs(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);
    addNoise(player, 1);

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
    ensurePlayerObjectivesRegistered(player);

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
      addNoise(player, 1);
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
      addNoise(player, 1);
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
    ensurePlayerObjectivesRegistered(player);

    const params = args.filter((a): a is string => typeof a === "string");
    if (params.length < 1) {
      applyCommandPenalty(player, "[exploit] Usage: nb:exploit <firewall|ids|encryption|root>", 2);
      return;
    }

    const target = params[0].toLowerCase();
    const permission = getScore(player, OBJ.perm);

    if (target === "firewall") {
      if (permission < PERM_USER) {
        applyCommandPenalty(player, "[exploit firewall] User permission required.", 4);
        return;
      }
      if (getScore(player, OBJ.p03) < 1) {
        applyCommandPenalty(player, "[exploit firewall] Missing exploit token.", 20);
        return;
      }
      addNoise(player, 15);
      setScore(player, OBJ.fwall, 1);
      player.sendMessage("§a[exploit firewall]§r  Firewall bypassed. Access route opened.");
      return;
    }

    if (target === "ids") {
      if (permission < PERM_USER) {
        applyCommandPenalty(player, "[exploit ids] User permission required.", 4);
        return;
      }
      if (getScore(player, OBJ.p05) < 1) {
        applyCommandPenalty(player, "[exploit ids] IDS bypass module not found.", 18);
        return;
      }
      addNoise(player, 12);
      player.sendMessage("§a[exploit ids]§r  IDS bypass active. Detection pressure reduced.");
      return;
    }

    if (target === "encryption") {
      if (permission < PERM_ADMIN) {
        applyCommandPenalty(player, "[exploit encryption] Admin permission required.", 6);
        return;
      }
      if (getScore(player, OBJ.p06) < 1) {
        applyCommandPenalty(player, "[exploit encryption] Encryption key not found.", 25);
        return;
      }
      addNoise(player, 20);
      setScore(player, OBJ.p07, 1);
      player.sendMessage("§a[exploit encryption]§r  Core encryption broken. Root payload armed.");
      return;
    }

    if (target === "root") {
      if (permission < PERM_ADMIN) {
        applyCommandPenalty(player, "[exploit root] Admin permission required.", 6);
        return;
      }
      if (getScore(player, OBJ.p07) < 1) {
        applyCommandPenalty(player, "[exploit root] Root payload not armed.", 30);
        return;
      }
      if (player.dimension.id !== "minecraft:the_end") {
        applyCommandPenalty(player, "[exploit root] Must execute from the End system core.", 30);
        return;
      }
      addNoise(player, 50);
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
        try {
          player.sendMessage("§c[SYSTEM]§r  Emergency guardian spawning...");
          dim.spawnEntity("minecraft:warden", loc);
        } catch {}
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
          player.sendMessage(
            "§a[NullByte]§r  §lMISSION COMPLETE§r\n" +
            "  You compromised the HEXCORE core system.\n" +
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
    ensurePlayerObjectivesRegistered(player);

    if (getScore(player, OBJ.perm) < PERM_USER) {
      applyCommandPenalty(player, "[patch_covers] User permission required.", 4);
      return;
    }

    const now = tickCount;
    const readyTick = getScore(player, OBJ.startTick);
    if (readyTick > now) {
      const waitSeconds = Math.ceil((readyTick - now) / 20);
      applyCommandPenalty(player, `[patch_covers] Cooldown active (${waitSeconds}s remaining).`, 5);
      return;
    }

    addNoise(player, 5);
    const reduced = Math.max(0, getScore(player, OBJ.noise) - 15);
    setScore(player, OBJ.noise, reduced);
    setScore(player, OBJ.startTick, now + (60 * 20));
    player.sendMessage("§a[patch_covers]§r  Logs sanitized. Noise reduced by 15. Cooldown 60s.");
  });
}

function handleKillPatrol(origin: CustomCommandOrigin): CustomCommandResult {
  return runDeferredPlayerCommand(origin, (player) => {
    ensurePlayerObjectivesRegistered(player);

    if (getScore(player, OBJ.perm) < PERM_ADMIN) {
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

    addNoise(player, 5);
    player.sendMessage(`§a[kill_patrol]§r  Neutralized ${killed} defense entities. §7(noise +5)§r`);
  });
}

// ---------------------------------------------------------------------------
// Game tick loop
// ---------------------------------------------------------------------------

let tickCount = 0;
const lastNoiseBand = new Map<string, NoiseBand>();
const lastPatrolTick = new Map<string, number>();

// Flag-capture feedback. We seed a baseline on the first tick we see a player
// (no announcement), then report any 0 -> 1 transition afterwards. This covers
// both gameplay unlocks and manual /scoreboard players set @s nb_pXX 1.
const lastFlagState = new Map<string, number>();
const flagBaselineSeeded = new Set<string>();

// Read the highest score across all participant types for a flag key.
// /scoreboard players set @s may write a NAME participant while script-side
// entity writes go to the entity participant. Taking the max catches either.
function getScoreAny(player: Player, key: string): number {
  const obj = world.scoreboard.getObjective(key);
  if (!obj) return 0;
  let best = 0;
  try { const v = obj.getScore(player); if (v !== undefined && v > best) best = v; } catch {}
  try {
    const id = player.scoreboardIdentity;
    if (id) { const v = obj.getScore(id); if (v !== undefined && v > best) best = v; }
  } catch {}
  try { const v = obj.getScore(player.name); if (v !== undefined && v > best) best = v; } catch {}
  return best;
}

function announceFlagGains(player: Player): void {
  const seeded = flagBaselineSeeded.has(player.name);
  for (const key of FLAG_KEYS) {
    const value = getScoreAny(player, key);
    const mapKey = `${player.name}:${key}`;
    if (seeded) {
      const prev = lastFlagState.get(mapKey) ?? 0;
      if (prev < 1 && value >= 1) {
        const meta = FLAG_META[key];
        player.sendMessage(`§a[FLAG CAPTURED]§r  §e${meta.name}§r unlocked! §7${meta.hint}§r`);
        player.onScreenDisplay.setActionBar(`§a✔ ${meta.name} captured§r`);
      }
    }
    lastFlagState.set(mapKey, value);
  }
  flagBaselineSeeded.add(player.name);
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

function onBandEscalation(player: Player, from: NoiseBand, to: NoiseBand): void {
  if (from === to) return;

  if (to === "WARNING") {
    spawnMisusePatrols(player, 3, "WARNING");
    player.sendMessage("§e[SENTINEL]§r  Warning threshold reached.");
    return;
  }

  if (to === "ALERT") {
    spawnMisusePatrols(player, 6, "ALERT");
    setLockTicks(player, LOCK_ALERT_TICKS);
    // Phase 8 — auto-patch the firewall if the player had it bypassed.
    if (getScore(player, OBJ.fwall) >= 1) {
      setScore(player, OBJ.fwall, 0);
      player.sendMessage("§6[SENTINEL]§r  Defense team patched the firewall exploit. Re-exploit required.");
    }
    player.sendMessage("§6[SENTINEL]§r  ALERT state active. Terminal lockout: 10s.");
    return;
  }

  if (to === "BREACH") {
    spawnMisusePatrols(player, 12, "BREACH");
    setLockTicks(player, LOCK_BREACH_TICKS);
    revokeToGuest(player);
    player.teleport({ x: BOUNDARY.spawnX, y: BOUNDARY.spawnY, z: BOUNDARY.spawnZ });
    player.sendMessage("§c[SENTINEL]§r  BREACH state. Permissions revoked.");
    return;
  }

  if (to === "LOCKDOWN") {
    spawnMisusePatrols(player, 20, "LOCKDOWN");
    setLockTicks(player, LOCK_LOCKDOWN_TICKS);
    revokeToGuest(player);
    player.sendMessage("§4[SENTINEL]§r  LOCKDOWN active. Terminal disabled.");
  }
}

function gameTick(): void {
  tickCount++;

  for (const player of world.getAllPlayers()) {
    ensurePlayerObjectivesRegistered(player);

    const lockTicks = getScore(player, OBJ.locked);
    if (lockTicks > 0) {
      setScore(player, OBJ.locked, lockTicks - 1);
      const remaining = Math.ceil((lockTicks - 1) / 20);
      if (remaining > 0) {
        player.onScreenDisplay.setActionBar(`§cTERMINAL LOCKED — ${remaining}s§r`);
      } else {
        // Lock just expired — fall through to noise bar below.
        const noiseNow = getScore(player, OBJ.noise);
        player.onScreenDisplay.setActionBar(`§7[noise]§r ${noiseBar(noiseNow)} §f${noiseNow}/100§r`);
      }
    } else {
      // Always show noise bar in the action bar when not locked.
      const noiseNow = getScore(player, OBJ.noise);
      player.onScreenDisplay.setActionBar(`§7[noise]§r ${noiseBar(noiseNow)} §f${noiseNow}/100§r`);
    }

    const noise = getScore(player, OBJ.noise);
    const band = getNoiseBand(noise);
    const key = player.name;
    const previousBand = lastNoiseBand.get(key) ?? "CLEAN";
    if (band !== previousBand) {
      const bandRank = { CLEAN: 0, WARNING: 1, ALERT: 2, BREACH: 3, LOCKDOWN: 4 } as const;
      if (bandRank[band] > bandRank[previousBand]) {
        onBandEscalation(player, previousBand, band);
      }
      lastNoiseBand.set(key, band);
    }

    const interval = getPatrolIntervalTicks(band);
    if (interval > 0) {
      const last = lastPatrolTick.get(key) ?? tickCount;
      if (tickCount - last >= interval) {
        const patrolCount = getScheduledPatrolCount(band);
        spawnMisusePatrols(player, patrolCount, band);
        lastPatrolTick.set(key, tickCount);
      }
    }

    announceFlagGains(player);

    // Sprinting noise — +1 every 2 ticks while sprinting (~0.5/tick average).
    if (player.isSprinting && tickCount % 2 === 0) {
      addNoise(player, 1);
    }
  }

  // Noise decay — every 20 ticks (1 real second)
  if (tickCount % 20 === 0) {
    for (const player of world.getAllPlayers()) {
      ensurePlayerObjectivesRegistered(player);
      const current = getScore(player, OBJ.noise);
      const band = getNoiseBand(current);

      if (current > 0) {
        if (band === "LOCKDOWN") {
          continue;
        }

        const decayStepTicks = band === "ALERT" ? 40 : 20;
        if (tickCount % decayStepTicks !== 0) {
          continue;
        }

        const decayed = Math.max(0, current - NOISE_DECAY_RATE);

        setScore(player, OBJ.noise, decayed);

        // Recover from lock pressure once noise is low enough.
        if (decayed < 50 && getScore(player, OBJ.perm) === PERM_GUEST) {
          player.sendMessage("§a[SENTINEL]§r  Threat reduced. Re-authentication available.");
        }
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
  ensurePlayerObjectivesRegistered(player);
  clearLegacyNoiseDisplay();
  setPermission(player, PERM_GUEST);
  setScore(player, OBJ.locked, 0);
  lastNoiseBand.set(player.name, getNoiseBand(getScore(player, OBJ.noise)));
  lastPatrolTick.set(player.name, tickCount);
  player.setGameMode(GameMode.Adventure);
  player.onScreenDisplay.setActionBar("");

  player.sendMessage("§7[HEXCORE]§r  Connection established. Proceed to the briefing terminal.");
  player.onScreenDisplay.setTitle("§eHEXCORE§r", {
    subtitle: "Security Evaluation — Session Active",
    fadeInDuration: 10,
    stayDuration: 60,
    fadeOutDuration: 10,
  });
}

// ---------------------------------------------------------------------------
// Alarm and alert callbacks
// ---------------------------------------------------------------------------

function onAlert(player: Player): void {
  player.sendMessage("§e[SENTINEL]§r  Elevated network activity detected. Reduce noise.");
  player.playSound("note.pling", { pitch: 1.5, volume: 1.0 });
}

function onAlarm(player: Player): void {
  player.sendMessage("§c[SENTINEL]§r  §lINTRUSION DETECTED.§r Countermeasures deployed.");
  player.onScreenDisplay.setTitle("§c⚠ ALARM ⚠");

  const alarms = getScore(player, OBJ.alarms);
  setScore(player, OBJ.alarms, alarms + 1);

  // Spawn a vex near the player as a mechanical "countermeasure"
  const loc = player.location;
  player.dimension.spawnEntity("minecraft:vex", {
    x: loc.x + 2,
    y: loc.y,
    z: loc.z,
  });
}

// ---------------------------------------------------------------------------
// Boundary enforcement
// ---------------------------------------------------------------------------

function enforceBoundary(player: Player): void {
  const loc = player.location;
  const out =
    loc.x < BOUNDARY.minX ||
    loc.x > BOUNDARY.maxX ||
    loc.z < BOUNDARY.minZ ||
    loc.z > BOUNDARY.maxZ;

  if (out) {
    player.teleport({ x: BOUNDARY.spawnX, y: BOUNDARY.spawnY, z: BOUNDARY.spawnZ });
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
  const player = event.damagingEntity as Player;
  ensurePlayerObjectivesRegistered(player);
  addNoise(player, 3);
});

// +5 noise when a player breaks a nullbyte:server_hardware block.
world.afterEvents.playerBreakBlock.subscribe((event) => {
  if (event.brokenBlockPermutation.type.id !== "nullbyte:server_hardware") return;
  ensurePlayerObjectivesRegistered(event.player);
  addNoise(event.player, 5);
  event.player.sendMessage("§c[SENTINEL]§r  Server hardware tampered. Noise +5.");
});
