# NullByte: Docs

Reference material for players, hosts, and developers.

## For players and hosts

| File | Contents |
|---|---|
| [mechanics.html](mechanics.html) | Game systems, terminal commands, permission tree, noise model, and puzzle map |
| [../INSTALLATION.md](../INSTALLATION.md) | How to install and host the world |
| [../THIRD_PARTY_REQUIREMENTS.md](../THIRD_PARTY_REQUIREMENTS.md) | Required commercial add-ons |
| [../scoring/README.md](../scoring/README.md) | Evaluation overview |

## For world builders

| File | Contents |
|---|---|
| [build-guide.md](build-guide.md) | Complete build reference: all puzzles, sign and email text, command blocks, flag wiring, testing, and troubleshooting |
| [runtime-reference.md](runtime-reference.md) | Scoreboard objectives, permissions, noise bands, commands, reset policy, acceptance tests, and narrative reference |
| [../packs/docs/noise-reference.md](../packs/docs/noise-reference.md) | Factual noise and defense system reference sourced directly from `packs/src/main.ts` |

## Puzzle progression summary

```
Lobby (HR_BOT chat greeting)
  └─ P1 nb_p01 → login (user)

Overworld
  └─ P2 nb_p03 → exploit firewall (nb_fwall) + Nether safe-room card → Nether

Nether
  ├─ P3 nb_p04 → sudo (admin)
  └─ P4 nb_p02 → End gate

End
  ├─ Boss → nb_enc (core defense down)
  └─ P5 nb_p07 → port knock complete

Root: admin + nb_enc + nb_p07 → nb_victory → return to lobby
```
