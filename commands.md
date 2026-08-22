# NullByte — Dev Commands

For local testing only. Requires cheats enabled and operator permission. Use a disposable test world; reset any modified objective after testing.

---

## Inspect shared state

```mcfunction
scoreboard players get NB_GLOBAL nb_noise
```

```mcfunction
scoreboard players get NB_GLOBAL nb_perm
```

```mcfunction
scoreboard players get NB_GLOBAL nb_victory
```

## Set shared state

```mcfunction
scoreboard players set NB_GLOBAL nb_noise 100
```

```mcfunction
scoreboard players set NB_GLOBAL nb_p03 1
```

```mcfunction
scoreboard players set NB_GLOBAL nb_perm 2
```

## Test Port Knock sequence

```mcfunction
scriptevent nb:knock 1337
```

```mcfunction
scriptevent nb:knock 22
```

```mcfunction
scriptevent nb:knock 443
```

## Set / reset a flag manually

```mcfunction
scoreboard players set NB_GLOBAL nb_p01 1
```

Reset (wait at least one game tick before setting back to 1 so the script sees the 0 → 1 transition):

```mcfunction
scoreboard players set NB_GLOBAL nb_p01 0
```

Verify after setting:

```mcfunction
/nb:status
/nb:menu
```

## Reset all flags at once (PLANNED — nb:reset command)

Not yet in code. See PUZZLE_BUILD_PLAN.md for spec. Manually until then:

```mcfunction
scoreboard players set NB_GLOBAL nb_p01 0
scoreboard players set NB_GLOBAL nb_p02 0
scoreboard players set NB_GLOBAL nb_p03 0
scoreboard players set NB_GLOBAL nb_p04 0
scoreboard players set NB_GLOBAL nb_p05 0
scoreboard players set NB_GLOBAL nb_p06 0
scoreboard players set NB_GLOBAL nb_p07 0
scoreboard players set NB_GLOBAL nb_perm 0
scoreboard players set NB_GLOBAL nb_noise 0
scoreboard players set NB_GLOBAL nb_alarms 0
scoreboard players set NB_GLOBAL nb_locked 0
scoreboard players set NB_GLOBAL nb_fwall 0
scoreboard players set NB_GLOBAL nb_ids 0
scoreboard players set NB_GLOBAL nb_enc 0
scoreboard players set NB_GLOBAL nb_knock 0
scoreboard players set NB_GLOBAL nb_start 0
scoreboard players set NB_GLOBAL nb_victory 0
```
