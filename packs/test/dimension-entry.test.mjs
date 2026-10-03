import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const sourceFile = ts.createSourceFile("main.ts", source, ts.ScriptTarget.ES2020, true);
const functionNames = [
  "getNoiseBand",
  "setLockTicks",
  "setPermission",
  "revokeToGuest",
  "getPatrolIntervalTicks",
  "getScheduledPatrolCount",
  "spawnSharedPatrols",
  "onBandEscalation",
  "spawnPatrolEntity",
  "findNetherGuardSpawnLocation",
  "spawnNetherEntryGuards",
  "checkDimensionEntry",
  "gameTick",
];
const functions = functionNames.map((name) => {
  const declaration = sourceFile.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
  assert.ok(declaration, `${name} must exist`);
  return declaration.getText(sourceFile);
});
const handler = ts.transpileModule(functions.join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

function createEntryState({
  permission = 1,
  noise = 0,
  firewall = 0,
  getBlock = ({ y }) => ({ isAir: y >= 87, isLiquid: false }),
  spawnFails = false,
} = {}) {
  const scores = { noise, perm: permission, fwall: firewall, p02: 0, locked: 0, alarms: 0 };
  const patrols = [];
  const guards = [];
  const warnings = [];
  const messages = [];
  const titles = [];
  const teleports = [];
  const lastDimension = new Map([["Builder", "minecraft:overworld"]]);
  const player = {
    name: "Builder",
    location: { x: 118.5, y: 87, z: 1.5 },
    dimension: {
      id: "minecraft:nether",
      getBlock,
      spawnEntity: (type, location) => {
        if (spawnFails) throw new Error("spawn failed");
        guards.push({ type, location });
        return {};
      },
      runCommand: () => { throw new Error("command spawn failed"); },
    },
    onScreenDisplay: {
      setTitle: (title, options) => titles.push({ title, options }),
      setActionBar: () => {},
    },
    teleport: (location, options) => {
      teleports.push({ location, options });
      player.dimension = options.dimension;
    },
  };
  const runtime = runInNewContext(`${handler}
    lastNoiseBand = getNoiseBand(getScore(OBJ.noise));
     ({ checkEntry: checkDimensionEntry, gameTick,
       findGuard: findNetherGuardSpawnLocation, spawnGuards: spawnNetherEntryGuards });
  `, {
    OBJ: {
      noise: "noise", perm: "perm", fwall: "fwall", p02: "p02",
      locked: "locked", alarms: "alarms", victory: "victory",
    },
    PERM_USER: 1,
    PERM_GUEST: 0,
    LOCK_ALERT_TICKS: 200,
    LOCK_BREACH_TICKS: 600,
    LOCK_LOCKDOWN_TICKS: 1200,
    NOISE_DECAY_RATE: 1,
    BOUNDARY: { spawnX: 982, spawnY: 68, spawnZ: 396 },
    tickCount: 0,
    lastNoiseBand: undefined,
    lastPatrolTick: 0,
    lastDimension,
    getScore: (objective) => scores[objective] ?? 0,
    setScore: (objective, value) => { scores[objective] = value; },
    addNoise: (amount) => {
      scores.noise = Math.max(0, Math.min(100, scores.noise + amount));
    },
    spawnMisusePatrols: (target, count, band) => {
      patrols.push({ target, count, band, dimension: target.dimension.id });
    },
    ensureSharedStateRegistered: () => {},
    announceFlagGains: () => {},
    enforceBoundary: () => {},
    noiseBar: () => "",
    system: { run: () => {} },
    world: {
      sendMessage: (message) => {
        messages.push(message);
        if (message.startsWith("[NullByte] Nether entry guards")) warnings.push(message);
      },
      getAllPlayers: () => [player],
      getDimension: (name) => ({ id: `minecraft:${name}` }),
    },
  });
  return { ...runtime, player, scores, patrols, guards, warnings, messages, titles, teleports, lastDimension };
}

test("unauthorized logged-in Nether entry spawns one ravager and three vindicators nearby", () => {
  const state = createEntryState();
  state.checkEntry(state.player);
  assert.equal(state.scores.noise, 75);
  assert.equal(state.patrols.length, 0);
  assert.equal(state.guards.length, 4);
  assert.equal(state.guards[0].type, "minecraft:ravager");
  assert.equal(state.guards.filter((guard) => guard.type === "minecraft:vindicator").length, 3);
  for (const guard of state.guards) {
    const distance = Math.hypot(
      guard.location.x - state.player.location.x,
      guard.location.z - state.player.location.z,
    );
    assert.ok(distance >= 3 && distance <= 5);
    assert.equal(guard.location.y, 87);
  }
  assert.equal(new Set(state.guards.map(({ location }) => `${location.x},${location.z}`)).size, 4);
  assert.equal(state.warnings.length, 0);
  assert.match(state.messages[0], /before the firewall was bypassed/);
  assert.match(state.titles[0].options.subtitle, /Unauthorized access logged/);
});

test("unauthenticated Nether entry spawns one ravager and six vindicators", () => {
  const state = createEntryState({ permission: 0 });
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 7);
  assert.equal(state.guards.filter((guard) => guard.type === "minecraft:ravager").length, 1);
  assert.equal(state.guards.filter((guard) => guard.type === "minecraft:vindicator").length, 6);
  assert.match(state.messages[0], /unauthenticated/);
});

for (const noise of [75, 90, 100]) {
  test(`unauthorized entry still requests mobs with noise already at ${noise}`, () => {
    const state = createEntryState({ noise });
    state.checkEntry(state.player);
    assert.equal(state.scores.noise, noise);
    assert.equal(state.guards.length, 4);
  });
}

test("authorized Nether entry adds no noise, mobs, or warning", () => {
  const state = createEntryState({ firewall: 1, noise: 20 });
  state.checkEntry(state.player);
  assert.equal(state.scores.noise, 20);
  assert.equal(state.patrols.length, 0);
  assert.equal(state.guards.length, 0);
  assert.equal(state.messages.length, 0);
  assert.equal(state.titles.length, 0);
});

test("remaining in the Nether does not repeat the entry wave", () => {
  const state = createEntryState();
  state.checkEntry(state.player);
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 4);
});

test("leaving and crossing again requests a fresh entry wave", () => {
  const state = createEntryState();
  state.checkEntry(state.player);
  state.player.dimension.id = "minecraft:overworld";
  state.checkEntry(state.player);
  state.player.dimension.id = "minecraft:nether";
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 8);
});

test("first observation in the Nether is not counted as a crossing", () => {
  const state = createEntryState();
  state.lastDimension.clear();
  state.checkEntry(state.player);
  assert.equal(state.patrols.length, 0);
  assert.equal(state.guards.length, 0);
  assert.equal(state.scores.noise, 0);
});

test("unauthorized End entry retains its eight-noise penalty without an entry wave", () => {
  const state = createEntryState();
  state.player.dimension.id = "minecraft:the_end";
  state.checkEntry(state.player);
  assert.equal(state.scores.noise, 8);
  assert.equal(state.patrols.length, 0);
  assert.equal(state.guards.length, 0);
});

for (const permission of [0, 1, 2]) {
  test(`unauthorized entry preserves permission ${permission}, position, and terminal on the next tick`, () => {
    const state = createEntryState({ permission });
    state.gameTick();
    state.gameTick();
    assert.equal(state.scores.noise, 75);
    assert.equal(state.scores.locked, 0);
    assert.equal(state.scores.perm, permission);
    assert.equal(state.scores.alarms, 1);
    assert.equal(state.teleports.length, 0);
    assert.equal(state.player.dimension.id, "minecraft:nether");
    assert.equal(state.patrols.length, 0);
    assert.equal(state.guards.length, permission === 0 ? 7 : 4);
    assert.equal(state.titles.length, 1);
    assert.match(state.titles[0].options.subtitle, /Unauthorized access logged/);
  });
}

test("Nether entry does not clear an existing unrelated terminal lock", () => {
  const state = createEntryState();
  state.scores.locked = 80;
  state.gameTick();
  state.gameTick();
  assert.equal(state.scores.locked, 78);
  assert.equal(state.scores.perm, 1);
  assert.equal(state.teleports.length, 0);
});

test("ordinary ALERT escalation still locks the terminal and patches the firewall", () => {
  const state = createEntryState({ noise: 49, firewall: 1 });
  state.lastDimension.set(state.player.name, "minecraft:nether");
  state.scores.noise = 50;
  state.gameTick();
  assert.equal(state.scores.locked, 200);
  assert.equal(state.scores.fwall, 0);
  assert.equal(state.scores.perm, 1);
  assert.equal(state.patrols[0].count, 3);
  assert.equal(state.teleports.length, 0);
});

test("ordinary BREACH escalation still relocates, locks, and revokes permission", () => {
  const state = createEntryState({ noise: 74, firewall: 1 });
  state.lastDimension.set(state.player.name, "minecraft:nether");
  state.scores.noise = 75;
  state.gameTick();
  assert.equal(state.scores.locked, 600);
  assert.equal(state.scores.perm, 0);
  assert.equal(state.teleports.length, 1);
  assert.equal(state.player.dimension.id, "minecraft:overworld");
  assert.equal(state.patrols.length, 1);
  assert.equal(state.patrols[0].count, 4);
});

test("later LOCKDOWN after unauthorized entry still applies its ordinary penalty", () => {
  const state = createEntryState();
  state.gameTick();
  state.scores.noise = 100;
  state.gameTick();
  assert.equal(state.scores.locked, 1200);
  assert.equal(state.scores.perm, 0);
  assert.equal(state.patrols.length, 1);
  assert.equal(state.patrols[0].count, 3);
  assert.equal(state.guards.length, 4);
});

test("ravager requires three blocks of headroom while vindicators fit under a lower ceiling", () => {
  const state = createEntryState({
    getBlock: ({ y }) => ({ isAir: y >= 87 && y < 89, isLiquid: false }),
  });
  assert.equal(state.findGuard(state.player, 122, 1, true), undefined);
  assert.equal(state.findGuard(state.player, 122, 1, false)?.y, 87);
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 3);
  assert.ok(state.guards.every((guard) => guard.type === "minecraft:vindicator"));
  assert.match(state.warnings[0], /spawned 3\/4/);
});

test("ravager requires its whole footprint to be clear", () => {
  const state = createEntryState({
    getBlock: ({ x, y, z }) => ({
      isAir: y >= 87 && !(x === 123 && z === 2),
      isLiquid: false,
    }),
  });
  assert.equal(state.findGuard(state.player, 122, 1, true), undefined);
  assert.equal(state.findGuard(state.player, 122, 1, false)?.y, 87);
});

test("entry guards do not spawn on liquid floors", () => {
  const state = createEntryState({
    getBlock: ({ y }) => ({ isAir: y >= 87, isLiquid: y < 87 }),
  });
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 0);
  assert.match(state.warnings[0], /spawned 0\/4/);
});

test("entry guards skip unloaded nearby blocks and report incomplete deployment", () => {
  const state = createEntryState({ getBlock: () => undefined });
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 0);
  assert.match(state.warnings[0], /spawned 0\/4/);
});

test("failed API and command spawns are reported rather than counted as deployed", () => {
  const state = createEntryState({ spawnFails: true });
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 0);
  assert.match(state.warnings[0], /spawned 0\/4/);
});

test("close entry search is not tied to block centres at the player's position", () => {
  const state = createEntryState();
  state.player.location = { x: 118.1, y: 87, z: 1.9 };
  state.checkEntry(state.player);
  assert.equal(state.guards.length, 4);
  for (const { location } of state.guards) {
    const distance = Math.hypot(location.x - 118.1, location.z - 1.9);
    assert.ok(distance >= 3 && distance <= 5);
  }
});