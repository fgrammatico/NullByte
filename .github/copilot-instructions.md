# Workspace release rules (NullByte)

These rules are mandatory for every change in this workspace that results in a new `.mcaddon` build.

## Version bump rule

- Always bump patch version in all files before generating a new `.mcaddon`.
- Required files:
  - `packs/package.json`
  - `packs/behavior_pack/manifest.json`
  - `packs/resource_pack/manifest.json`
- Keep terminal banner version in sync in:
  - `packs/src/main.ts` (`HEXCORE TERMINAL vX.Y.Z`)

## Mandatory command block rule

For every release/build response, always provide these 3 commands in this exact order.

1) Source version verification

```bash
cd /home/user23/GitHub/FG/NullByte/packs && grep -n "\"version\": \"<NEW_VERSION>\"" package.json && grep -n "v<NEW_VERSION>\\|\\[<MAJOR>, <MINOR>, <PATCH>\\]" behavior_pack/manifest.json resource_pack/manifest.json && grep -n "HEXCORE TERMINAL v<NEW_VERSION>" src/main.ts
```

2) Build and package

```bash
cd /home/user23/GitHub/FG/NullByte/packs && npm run build && rm -f NullByte.mcaddon && npm run mcaddon
```

3) Built archive verification

```bash
cd /home/user23/GitHub/FG/NullByte/packs && unzip -p NullByte.mcaddon behavior_pack/manifest.json | grep -n "v<NEW_VERSION>\\|\\[<MAJOR>, <MINOR>, <PATCH>\\]" && unzip -p NullByte.mcaddon resource_pack/manifest.json | grep -n "v<NEW_VERSION>\\|\\[<MAJOR>, <MINOR>, <PATCH>\\]"
```

## Response style enforcement

- Always include the 3 commands above after any version bump.
- Never skip version bump if a new `.mcaddon` is generated.
- Never leave versions inconsistent across files.
