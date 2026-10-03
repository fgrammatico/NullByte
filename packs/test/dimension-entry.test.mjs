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

function createEntryState({ permission = 1, noise = 0, firewall = 0 } = {}) {
  const scores = { noise, perm: permission, fwall: firewall, p02: 0, locked: 0, alarms: 0 };
  const patrols = [];
  const messages = [];
  const titles = [];
  const teleports = [];
  const lastDimension = new Map([["Builder", "minecraft:overworld"]]);
  const player = {
    name: "Builder",
    dimension: { id: "minecraft:nether" },
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
    ({ checkEntry: checkDimensionEntry, gameTick });
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
      sendMessage: (message) => messages.push(message),
      getAllPlayers: () => [player],
      getDimension: (name) => ({ id: `minecraft:${name}` }),
    },
  });
  return { ...runtime, player, scores, patrols, messages, titles, teleports, lastDimension };
}

test("unauthorized logged-in Nether entry requests four vindicators immediately", () => {
  const state = createEntryState();
  state.checkEntry(state.player);
  assert.equal(state.scores.noise, 75);
  assert.equal(state.patrols.length, 1);
  assert.equal(state.patrols[0].target, state.player);
  assert.equal(state.patrols[0].count, 4);
  assert.equal(state.patrols[0].band, "BREACH");
  assert.equal(state.patrols[0].dimension, "minecraft:nether");
  assert.match(state.messages[0], /before the firewall was bypassed/);
  assert.match(state.titles[0].options.subtitle, /Unauthorized access logged/);
});

test("unauthenticated Nether entry requests one seven-vindicator wave", () => {
  const state = createEntryState({ permission: 0 });
  state.checkEntry(state.player);
  assert.equal(state.patrols.length, 1);
  assert.equal(state.patrols[0].count, 7);
  assert.match(state.messages[0], /unauthenticated/);
});

for (const noise of [75, 90, 100]) {
  test(`unauthorized entry still requests mobs with noise already at ${noise}`, () => {
    const state = createEntryState({ noise });
    state.checkEntry(state.player);
    assert.equal(state.scores.noise, noise);
    assert.equal(state.patrols.length, 1);
    assert.equal(state.patrols[0].count, 4);
  });
}

test("authorized Nether entry adds no noise, mobs, or warning", () => {
  const state = createEntryState({ firewall: 1, noise: 20 });
  state.checkEntry(state.player);
  assert.equal(state.scores.noise, 20);
  assert.equal(state.patrols.length, 0);
  assert.equal(state.messages.length, 0);
  assert.equal(state.titles.length, 0);
});

test("remaining in the Nether does not repeat the entry wave", () => {
  const state = createEntryState();
  state.checkEntry(state.player);
  state.checkEntry(state.player);
  assert.equal(state.patrols.length, 1);
});

test("leaving and crossing again requests a fresh entry wave", () => {
  const state = createEntryState();
  state.checkEntry(state.player);
  state.player.dimension.id = "minecraft:overworld";
  state.checkEntry(state.player);
  state.player.dimension.id = "minecraft:nether";
  state.checkEntry(state.player);
  assert.equal(state.patrols.length, 2);
});

test("first observation in the Nether is not counted as a crossing", () => {
  const state = createEntryState();
  state.lastDimension.clear();
  state.checkEntry(state.player);
  assert.equal(state.patrols.length, 0);
  assert.equal(state.scores.noise, 0);
});

test("unauthorized End entry retains its eight-noise penalty without an entry wave", () => {
  const state = createEntryState();
  state.player.dimension.id = "minecraft:the_end";
  state.checkEntry(state.player);
  assert.equal(state.scores.noise, 8);
  assert.equal(state.patrols.length, 0);
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
    assert.equal(state.patrols.length, 1);
    assert.equal(state.patrols[0].count, permission === 0 ? 7 : 4);
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
  assert.equal(state.patrols.length, 2);
  assert.equal(state.patrols[1].count, 3);
});