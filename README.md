# NullByte

A cybersecurity challenge built inside a Minecraft Bedrock Realm.

Players receive a Realm invite and are told to complete the session. No further instructions are given.

---

## What it is

NullByte is a Minecraft Bedrock world designed as a gamified cybersecurity challenge. The world simulates a compromised network spread across three zones. Players explore, reason, and solve challenges using standard security thinking.

The experience is self-contained. No external systems are involved.

---

## How it works

The world runs a custom behavior pack built with the Bedrock Script API (`@minecraft/server`). The pack handles:

- Custom terminal commands (e.g., `/nb:scan`, `/nb:login`, `/nb:sudo`)
- A per-player noise meter that tracks network activity and triggers countermeasures
- Game state via the Minecraft scoreboard system
- NPC dialogue for in-world characters
- Player boundary enforcement
- Adventure mode enforcement on join

Physical puzzle gates are built from redstone and command blocks, which feed state into the scoreboard. The scripted layer reads that state to unlock commands and dialogue.

---

## Zones

| Zone | Dimension | Network |
|---|---|---|
| Surface | Overworld | eth0 — surface network |
| Internal | Nether | eth1 — internal network |
| Core | End | eth2 — root vault |

---

## Repository structure

```
IMPLEMENTATION_ROADMAP.md — phase status and world build order
PUZZLE_BUILD_PLAN.md       — per-puzzle build instructions
story/           — world narrative and lore
  narrative.md   — full story and characters
  lore/          — NPC dialogue and in-world sign texts
  puzzles/       — challenge overview (no solutions)
map/             — zone descriptions
  overworld/
  nether/
  end/
docs/            — developer reference
  mechanics.html — full command table, noise model, puzzle map
packs/           — behavior pack source (TypeScript)
  src/main.ts    — all game logic
  behavior_pack/ — pack assets (manifest, dialogue)
  resource_pack/ — resource pack (minimal)
scoring/         — evaluation overview
```

Build guides, puzzle solutions, and the scoring rubric are maintained privately and are not included in this repository.

---

## Tech stack

- Minecraft Bedrock Edition (Realm)
- `@minecraft/server` v2.7.0 (Bedrock Script API)
- TypeScript 5 compiled to ES2020

---

## Setup

See `IMPLEMENTATION_ROADMAP.md` for the full phase-by-phase build status.

See `PUZZLE_BUILD_PLAN.md` for per-puzzle build instructions, materials, and command block setups.

To build and package the behavior pack:

```bash
cd packs
npm install
npm run build
npm run mcaddon
```

Upload the generated `.mcaddon` to the Realm via Settings → Manage Realm → Behavior Packs.

---

## License

See [LICENSE](LICENSE).
