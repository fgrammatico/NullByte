# Workspace release rules (NullByte)

These rules apply to every change that generates a new NullByte `.mcaddon` or GitHub release.

Audience, theme, and other project rules are in `NULLBYTE_PROMPT_INSTRUCTIONS.md`. This file covers packaging and releases only.

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

## Release package

- Build both `packs/behavior_pack/` and `packs/resource_pack/` into the versioned `.mcaddon`.
- Require exactly one `release-inputs/world/NullByte *.mcworld` source file.
- Patch only the packaged world copy with the NullByte behavior and resource pack IDs and selected version.
- Do not change the committed source world during packaging.
- Do not bundle any commercial add-on. This includes the Computers add-on, Security Sandbox, and Ultimate Blasters. Document their required versions in `THIRD_PARTY_REQUIREMENTS.md` instead.
- Publish one versioned ZIP containing the approved player documents, `.mcaddon`, and dated `.mcworld`.

## Validation

- Run the release tests and TypeScript build before publishing.
- Verify version values in both manifests inside the generated `.mcaddon`.
- Verify both NullByte pack references in the generated `.mcworld`.
- Verify the final ZIP entry list before reporting completion.
