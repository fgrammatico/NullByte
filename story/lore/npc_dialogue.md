# NPC Dialogue Scripts
## DELTA — Compromised Server NPC

DELTA speaks in fragmented, corrupted system messages.
Dialogue is delivered via signs on the NPC's wall — different signs visible depending on which area the player has unlocked (builder places signs behind barriers that open as puzzles are solved).

---

### DELTA — before hash crack (Puzzle 04 not yet solved — door to this area is locked)

Players cannot reach DELTA yet. The door from the hash crack room only opens when P04 is solved.

---

### DELTA — after hash crack, first visit

```
...DELTA_SRV_04...
...partial session established...

[PIVOT ROUTE AVAILABLE]
  Source: eth1 (this node)
  Target: eth2 System Core
  Method: relay insertion
  Status: AWAITING CHIP

[NOTE] Insert relay chip into panel slot.
Chip location: this workstation — trapped chest.
eth2 encryption layer active.
Encryption key in far island vault.

...good luck...
[connection closed]
```

---

### DELTA — after relay placed (repeat visit)

```
...DELTA_SRV_04...
...relay established...
...eth2 access granted...
...nothing more to give you...
...go. you know where.
[connection closed]
```

---

## Optional NPC: HR_BOT — Overworld lobby

A low-stakes comedic NPC near the entrance. Not part of the puzzle chain.
Gives flavor text only.

```
Welcome to HEXCORE.
Please sign in at the front desk.
(There is no front desk.)
(There is no HR department.)
(There is only the map.)
Have a productive assessment.
```

On repeat interaction:
```
You're still here.
The corridor is that way.
[points at wall]
```
