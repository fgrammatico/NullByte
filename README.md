# NullByte

A cybersecurity challenge built as a locally hosted Minecraft Bedrock world.

The host installs the custom behavior and resource packs, opens the world to local multiplayer, and starts the session.

---

## What it is

NullByte is a cooperative Minecraft Bedrock puzzle game about cybersecurity. HEXCORE is a technology company that sells security systems and is much worse at using them. Players follow the trail left by a terminated employee called GHOST and gain root access to shut the whole thing down.

The world teaches real security concepts (credential handling, log analysis, firewall rules, binary encoding, social engineering, port knocking) through exploration and puzzle-solving. It is designed to be fun for all ages: kids, parents, and anyone who has ever wanted to hack something legally.

---

## How it works

The world runs a custom behavior pack built with the Bedrock Script API (`@minecraft/server`). The local host loads the packs. Realm deployment is not supported. The behavior pack handles:

- A portable in-game terminal
- One shared noise meter that triggers world-wide countermeasures
- Game state via the Minecraft scoreboard system
- NPC dialogue for in-world characters
- Computer-delivered email briefings and attachments near each puzzle
- Player boundary enforcement
- Adventure mode enforcement on join

The experience is self-contained within the world. It does not rely on external servers, but it does use the required commercial add-ons for the in-world computer system (email briefings and attachments) and equipment.

---

## Zones

| Zone | Dimension | Network |
|---|---|---|
| Surface | Overworld | eth0: surface network |
| Internal | Nether | eth1: internal network |
| Core | End | eth2: root vault |

---

## Repository structure

```
story/           - narrative reference and lore
map/             - zone descriptions
  overworld/
  nether/
  end/
packs/           - public behavior and resource pack structure
  src/           - TypeScript runtime and release-config example
  behavior_pack/ - behavior-pack manifest, NPC dialogue scenes, public assets
  resource_pack/ - resource-pack manifest and public assets
release-inputs/  - tracked runtime config and source-world release inputs
scoring/         - evaluation overview
```

Scoring details remain private. Runtime configuration and the source world are tracked because GitHub-hosted release jobs require them.

---

## Tech stack

- Minecraft Bedrock Edition with a locally hosted world
- `@minecraft/server` v2.7.0 (Bedrock Script API)
- TypeScript 5 compiled to ES2020

---

## Setup

Download the release ZIP and follow [INSTALLATION.md](INSTALLATION.md). The host must obtain the commercial packs listed in [THIRD_PARTY_REQUIREMENTS.md](THIRD_PARTY_REQUIREMENTS.md) separately.

Merged pull requests can publish a release when their commits contain `[patch]`, `[minor]`, `[major]`, or `[breaking]`. The highest marker since the previous release tag sets the next version. Commits without a marker do not publish a release.

Published changes are listed in [CHANGELOG.md](CHANGELOG.md).

---

## License

See [LICENSE](LICENSE).
