# NullByte — Docs

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
| [puzzle-guide.md](puzzle-guide.md) | Step-by-step build instructions for all seven puzzles, flag wiring, and command block settings |
| [runtime-reference.md](runtime-reference.md) | Scoreboard objectives, permissions, noise bands, commands, reset policy, acceptance tests, and narrative reference |
| [../packs/docs/noise-reference.md](../packs/docs/noise-reference.md) | Factual noise and defense system reference sourced directly from `packs/src/main.ts` |

## Puzzle progression summary

```
Lobby (HR_BOT → nb_start)
  └─ P1 nb_p01 → login (user)
       ├─ P2 nb_p03 → exploit firewall (nb_fwall) → Nether
       └─ P3 nb_p05 → exploit ids (nb_ids)

Nether
  ├─ P4 nb_p04 → sudo (admin)
  └─ P5 nb_p02 → End gate

End
  ├─ P6 nb_p06 → exploit encryption (nb_enc)
  ├─ P7 nb_p07 → port knock complete
  └─ nb_core_clear → boss defeated (planned)

Root: admin + nb_enc + nb_p07 + nb_core_clear → nb_victory
```
