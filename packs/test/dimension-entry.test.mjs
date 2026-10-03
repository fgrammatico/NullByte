import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const start = source.indexOf("function checkDimensionEntry(");
const end = source.indexOf("\nfunction gameTick(", start);
assert.ok(start >= 0 && end > start, "dimension entry handler must exist");
const handler = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

function createEntryState({ permission = 1, noise = 0, firewall = 0 } = {}) {
  const scores = { noise, perm: permission, fwall: firewall, p02: 0 };
  const patrols = [];
  const messages = [];
  const titles = [];
  const lastDimension = new Map([["Builder", "minecraft:overworld"]]);
  const player = {
    name: "Builder",
    dimension: { id: "minecraft:nether" },
    onScreenDisplay: {
      setTitle: (title, options) => titles.push({ title, options }),
    },
  };
  const checkEntry = runInNewContext(`${handler}\ncheckDimensionEntry;`, {
    OBJ: { noise: "noise", perm: "perm", fwall: "fwall", p02: "p02" },
    PERM_USER: 1,
    lastDimension,
    getScore: (objective) => scores[objective] ?? 0,
    setScore: (objective, value) => { scores[objective] = value; },
    addNoise: (amount) => {
      scores.noise = Math.max(0, Math.min(100, scores.noise + amount));
    },
    spawnMisusePatrols: (target, count, band) => {
      patrols.push({ target, count, band, dimension: target.dimension.id });
    },
    world: { sendMessage: (message) => messages.push(message) },
  });
  return { checkEntry, player, scores, patrols, messages, titles, lastDimension };
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