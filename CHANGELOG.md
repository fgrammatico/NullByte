# Changelog

All published NullByte releases are recorded in this file. Later entries are generated from commit subjects and bodies selected by bracketed release markers.

## 0.0.27

- fix(terminal): lower nb:reset to GameDirectors so operators can run it (825b83f)
- Edits on world (9f8bd55)

## 0.0.26

- fix(release): name the packaged world after the version, not the source date (380957a)

## 0.0.25

- ci(release): release on any packs change, default to patch, drop dead bootstrap (0e128be)
- chore: release 0.0.25 [patch] (f9f9af2)
- feat(terminal): add operator-only nb:reset command, fix docs [patch] (65e69ec)
- style: consolidate and clean reward chain docs; remove fabricated Bedrock syntax (87eaffa)
- docs: correlate build-guide and FLAG_RELEASE_HOWTO; add reward chains and fix Puzzle 5 DR4K3 reference (3beaa5c)
- feat(docs): consolidate builder references into docs/build-guide.md (26a3be8)
- feat(game): restructure docs, update story framing, add noise reference and game flow (7223811)
- docs(docs): Chnaged a bit the story and documentation (6209d4e)

## 0.0.24

- Changed gameplay progression to one shared world state.
- Preserved completed puzzle discoveries across deaths, disconnects, and defense events.
- Corrected terminal command handling, noise thresholds, patrol placement, dimension checks, and victory shutdown.
- Added synchronized behavior and resource pack metadata for the local Bedrock release.
- Updated player documentation for locally hosted multiplayer.
