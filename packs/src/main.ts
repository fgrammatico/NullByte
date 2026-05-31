import {
  world,
  system,
  Player,
  GameMode,
  CommandPermissionLevel,
  CustomCommandParamType,
} from "@minecraft/server";
import type {
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
  startTick:"nb_start",
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
  minX: 867,
  maxX:  1253,
  minZ: 308,
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
const NOISE_ALERT      = 75;   // SENTINEL sends a warning
const NOISE_ALARM      = 100;  // full alarm — vex spawns, counter increments

// ---------------------------------------------------------------------------
// Startup — register custom commands before world loads
// ---------------------------------------------------------------------------

system.beforeEvents.startup.subscribe((event) => {
  registerAllObjectives();
  registerCommands(event.customCommandRegistry);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPlayer(origin: CustomCommandOrigin): Player | undefined {
  return origin.sourceEntity instanceof Player ? origin.sourceEntity : undefined;
}

function getScore(player: Player, objective: string): number {
  return world.scoreboard.getObjective(objective)?.getScore(player) ?? 0;
}

function setScore(player: Player, objective: string, value: number): void {
  world.scoreboard.getObjective(objective)?.setScore(player, value);
}

function addNoise(player: Player, amount: number): void {
  const current = getScore(player, OBJ.noise);
  setScore(player, OBJ.noise, Math.min(NOISE_MAX, current + amount));
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
      name: "nb:help",
      description: "List available HEXCORE terminal commands.",
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
      name: "nb:noise",
      description: "Check your current noise level on the network.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
    },
    handleNoiseCmd,
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
      description: "Authenticate with local system credentials.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      mandatoryParameters: [
        { type: CustomCommandParamType.String, name: "username" },
        { type: CustomCommandParamType.String, name: "password" },
      ],
    },
    handleLogin,
  );

  registry.registerCommand(
    {
      name: "nb:sudo",
      description: "Execute a privileged command.",
      permissionLevel: CommandPermissionLevel.Any,
      cheatsRequired: false,
      mandatoryParameters: [
        { type: CustomCommandParamType.String, name: "action" },
      ],
    },
    handleSudo,
  );
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

function handleHelp(origin: CustomCommandOrigin): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  const credFound = getScore(player, OBJ.p01) >= 1;

  const lines = [
    "§a[HEXCORE TERMINAL v2.4.1]§r",
    "§7Commands:§r",
    "  §fnb:help§r    — this output",
    "  §fnb:whoami§r  — current identity",
    "  §fnb:noise§r   — network noise level",
    "  §fnb:scan§r    — enumerate services" + (credFound ? "" : " §8[locked]§r"),
    "  §fnb:status§r  — session progress",
    "  §fnb:login§r   — authenticate" + (credFound ? "" : " §8[credentials required]§r"),
    "  §fnb:sudo§r    — privileged exec §8[admin only]§r",
  ];

  player.sendMessage(lines.join("\n"));
  return { status: CustomCommandStatus.Success };
}

function handleWhoami(origin: CustomCommandOrigin): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  const p01 = getScore(player, OBJ.p01);
  const p04 = getScore(player, OBJ.p04);

  let role: string;
  if (p04 >= 1)     role = "§cadmin§r";
  else if (p01 >= 1) role = "§euser§r";
  else               role = "§8guest§r";

  // Deterministic fake UID from player name — flavour only
  const uid = Math.abs(
    player.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 9999,
  );

  player.sendMessage(`§7[whoami]§r  uid=${uid}  user=${player.name}  role=${role}`);
  return { status: CustomCommandStatus.Success };
}

function handleNoiseCmd(origin: CustomCommandOrigin): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  const level = getScore(player, OBJ.noise);
  player.sendMessage(`§7[noise]§r  ${noiseBar(level)}  ${level}/100`);
  return { status: CustomCommandStatus.Success };
}

function handleScan(origin: CustomCommandOrigin): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  if (getScore(player, OBJ.p01) < 1) {
    player.sendMessage("§c[scan]§r  Access denied. No valid session token.");
    return { status: CustomCommandStatus.Failure };
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
  ];

  player.sendMessage(lines.join("\n"));
  return { status: CustomCommandStatus.Success };
}

function handleStatus(origin: CustomCommandOrigin): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  const solved = [OBJ.p01, OBJ.p02, OBJ.p03, OBJ.p04, OBJ.p05, OBJ.p06, OBJ.p07]
    .filter((key) => getScore(player, key) >= 1).length;

  const noise   = getScore(player, OBJ.noise);
  const alarms  = getScore(player, OBJ.alarms);

  player.sendMessage(
    `§7[status]§r  Challenges: §a${solved}/7§r  Noise: ${noiseBar(noise)} ${noise}  Alarms: §c${alarms}§r`,
  );
  return { status: CustomCommandStatus.Success };
}

function handleLogin(origin: CustomCommandOrigin, args: unknown[]): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  // Credentials are discovered in P01. The command block at the credential prop
  // sets nb_p01=1 when the player picks up the item. Only after that does this
  // command accept any username/password pair as "authenticated".
  //
  // The actual username and password strings are in private/design/puzzles_full.md.
  // Do NOT hardcode them here — the scoreboard flag is the gate.

  addNoise(player, 10);

  if (getScore(player, OBJ.p01) < 1) {
    player.sendMessage("§c[login]§r  Authentication failed. Invalid credentials.");
    return { status: CustomCommandStatus.Failure };
  }

  const username = typeof args[0] === "string" ? args[0] : "unknown";
  player.sendMessage(`§a[login]§r  Welcome, ${username}. Session token established.`);
  player.onScreenDisplay.setTitle("§aACCESS GRANTED");

  return { status: CustomCommandStatus.Success };
}

function handleSudo(origin: CustomCommandOrigin, args: unknown[]): CustomCommandResult {
  const player = getPlayer(origin);
  if (!player) return { status: CustomCommandStatus.Failure };

  if (getScore(player, OBJ.p04) < 1) {
    player.sendMessage("§c[sudo]§r  Permission denied. Admin verification required.");
    addNoise(player, 20);
    return { status: CustomCommandStatus.Failure };
  }

  addNoise(player, 25);
  const action = typeof args[0] === "string" ? args[0] : "unknown";
  player.sendMessage(`§a[sudo]§r  Executing: §f${action}§r`);
  player.sendMessage("§7[sudo]§r  Done.");

  return { status: CustomCommandStatus.Success };
}

// ---------------------------------------------------------------------------
// Game tick loop
// ---------------------------------------------------------------------------

let tickCount = 0;

function gameTick(): void {
  tickCount++;

  // Noise decay + action bar update — every 20 ticks (1 real second)
  if (tickCount % 20 === 0) {
    for (const player of world.getAllPlayers()) {
      const current = getScore(player, OBJ.noise);

      if (current > 0) {
        const decayed = Math.max(0, current - NOISE_DECAY_RATE);
        setScore(player, OBJ.noise, decayed);

        // Crossed into alarm zone
        if (decayed >= NOISE_ALARM && current < NOISE_ALARM) {
          onAlarm(player);
        }
        // Crossed into alert zone
        else if (decayed >= NOISE_ALERT && current < NOISE_ALERT) {
          onAlert(player);
        }
      }

      // Persist noise bar to action bar even at 0 so it's always visible
      const level = getScore(player, OBJ.noise);
      player.onScreenDisplay.setActionBar(`§7NOISE§r ${noiseBar(level)} ${level}`);
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
  player.setGameMode(GameMode.Adventure);

  // Initialise all scoreboard objectives for this player if not yet set
  for (const key of ALL_OBJECTIVES) {
    const obj = world.scoreboard.getObjective(key);
    if (obj && obj.getScore(player) === undefined) {
      obj.setScore(player, 0);
    }
  }

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
