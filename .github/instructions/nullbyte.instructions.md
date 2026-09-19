# Workspace release rules (NullByte)

These rules apply to every change that generates a new NullByte `.mcaddon` or GitHub release.

Audience, theme, and other project rules are in `NULLBYTE_PROMPT_INSTRUCTIONS.md`. This file covers packaging and releases only.

## Build and package the behavior pack

Run these from the repo's `packs/` directory. From anywhere in the repo: `cd "$(git rev-parse --show-toplevel)/packs"`.

After any change to `packs/src/main.ts`, rebuild before importing or testing:

- `npm run build` compiles the TypeScript to `packs/behavior_pack/scripts/main.js`. Never edit the generated JS by hand.
- `npm run mcaddon` packages `packs/behavior_pack/` and `packs/resource_pack/` into `packs/NullByte.mcaddon` for local import and testing. Delete the old file first with `rm -f NullByte.mcaddon` so no stale entries remain.
- `npm test` runs the release tests.

`npm run build` on its own updates the behavior pack script but does NOT produce an importable add-on. Importing into Minecraft needs the `.mcaddon`, so run `npm run mcaddon` as well. If dependencies are missing (`tsc: command not found`), run `npm install` in `packs/` first.

This local `.mcaddon` is for testing only. The official release ZIP (with the version bump and the world) is built by the release scripts described in the rest of this file.

## Version selection

- Merged pull requests release only when at least one commit subject or body contains a case-insensitive bracket marker:
  - `[patch]`
  - `[minor]`
  - `[major]`
  - `[breaking]`, which is an alias for major
- Scan every commit since the latest release tag.
- Use the highest marker found: major or breaking, then minor, then patch.
- Do not publish a release when no marker is present.

## Version synchronization

Versions are written by `packs/scripts/release/prepare-release.mjs`. Do not edit them by hand. The script sets the selected semantic version in all of these files:

- `packs/package.json`
- `packs/package-lock.json`
- `packs/behavior_pack/manifest.json`
- `packs/resource_pack/manifest.json`
- `packs/src/main.ts` (`HEXCORE TERMINAL vX.Y.Z`)
- `index.html` (`HEXCORE PORTABLE TERMINAL vX.Y.Z`)

The behavior-pack dependency on the NullByte resource pack must use the same version. Never generate a new `.mcaddon` while these values differ.

`packs/package.json` must match the latest release tag before a release runs. The publish script fails if it does not.

## Before anything else: export the world

**Do this first, before the tests, before the build, before any commit that will trigger a release.**

The world is not tracked automatically. Building in Minecraft changes the local world, and none of that reaches the repository until it is exported by hand. A release built without exporting ships the last exported world, silently, with every room and command block added since then missing.

1. In Minecraft, export the world as `.mcworld`.
2. Replace the file in `release-inputs/world/`. There must be exactly one `NullByte *.mcworld` there, so delete the old one.
3. Commit it. The world archive is large, so it will not look like a normal commit.
4. Only then run the tests and push.

If you are not sure whether the current export is up to date, export again. Re-exporting an unchanged world costs nothing. Shipping a stale one wastes a version number.

## Release package

- Build both `packs/behavior_pack/` and `packs/resource_pack/` into the versioned `.mcaddon`.
- Require exactly one `release-inputs/world/NullByte *.mcworld` source file.
- Patch only the packaged world copy with the NullByte behavior and resource pack IDs and selected version.
- Do not change the committed source world during packaging.
- Do not bundle any commercial add-on. This includes the Computers add-on, Security Sandbox, and Ultimate Blasters. Document their required versions in `THIRD_PARTY_REQUIREMENTS.md` instead.
- Publish one versioned ZIP containing the approved player documents, `NullByte-vX.Y.Z.mcaddon`, and `NullByte-vX.Y.Z.mcworld`. The dated source filename in `release-inputs/world/` is never used in the release.

## Validation

- Confirm the world in `release-inputs/world/` was exported after the most recent building session.
- Run the release tests and TypeScript build before publishing.
- Verify version values in both manifests inside the generated `.mcaddon`.
- Verify both NullByte pack references in the generated `.mcworld`.
- Verify the final ZIP entry list before reporting completion.
