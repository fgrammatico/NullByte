# NullByte: Builder Reference

Chronological build guide. Read top to bottom. Each section covers the physical build, messages to place, what triggers the flag, and what the player can do after.

For noise band thresholds and patrol mob types see `packs/docs/noise-reference.md`.

---

## How flags work: read this first

**Flags are permanent discoveries stored in `NB_GLOBAL`.** When a flag changes from 0 to 1, the script automatically announces the capture, removes 3 noise, and unlocks the linked action.

### Who sets each flag

| Flag | Set by | Mechanism |
|---|---|---|
| `nb_p01` | Command block | Discovery button in vault |
| `nb_p03` | Command block | Correct button on log wall |
| `nb_p05` | Command block | AND gate from lever circuit |
| `nb_p04` | Command block | AND gate from lever circuit |
| `nb_p02` | Command block | Physical puzzle mechanism (see Puzzle 5) |
| `nb_p06` | Command block | Hopper filter AND gate |
| `nb_p07` | **Script (main.ts)** | `scriptevent nb:knock` sequence |

All flags except `nb_p07` are set by command blocks you place in the world. The script only detects the change and reacts.

### What terminal commands set (separate from flags)

The flags are prerequisites that terminal commands CHECK. The commands themselves set different values:

| Player types | Script checks | Script sets |
|---|---|---|
| `nb:login admin hexc0re2049` | `nb_p01 >= 1` + correct credentials | `nb_perm = 1` (user) |
| `nb:exploit firewall` | `nb_p03 >= 1` + user | `nb_fwall = 1` |
| `nb:exploit ids` | `nb_p05 >= 1` + user | `nb_ids = 1` |
| `nb:sudo <action>` | `nb_p04 >= 1` + user | `nb_perm = 2` (admin) |
| `nb:exploit encryption` | `nb_p06 >= 1` + admin | `nb_enc = 1` |
| `nb:exploit root` | `nb_enc=1` + `nb_p07=1` + admin + End | `nb_perm = 3` + `nb_victory = 1` |

**Puzzle 1 example:** The player finds the vault and presses the discovery button. The command block sets `nb_p01 = 1`. The script announces the capture. The player then types `nb:login admin hexc0re2049`. The script checks `nb_p01 >= 1` and the credentials, then sets `nb_perm = 1` (user). The flag and the login are two separate steps. Typing the password does not set the flag.

### Dimension transitions: not in the script

The script only adds +8 noise if a player enters a dimension without authorization. It does NOT teleport players. All teleports must be implemented as command blocks. See Appendix C.

---

## Characters

| Character | Voice | Signs/emails formatted as |
|---|---|---|
| ZERO | Cold, clinical, brief | `[ZERO]` |
| GHOST | Wry, informal | `- G` |
| SENTINEL | Automated alert | `[SENTINEL]` |
| HR_BOT | Intake AI, thinks players are candidates | `HR_BOT` on nameplate |

Use different sign or book materials per author so players recognise the source by material before reading.

---

## Flag map

| # | Puzzle | Zone | Flag | Unlocks |
|---|---|---|---|---|
| 1 | Credential Vault | Overworld | `nb_p01` | `nb:login`, `nb:ls`, `nb:cat`, `nb:scan` |
| 2 | Log Analysis Wall | Overworld | `nb_p03` | `nb:exploit firewall` |
| 3 | Firewall Rules Console | Overworld | `nb_p05` | `nb:exploit ids` |
| 4 | Binary Access-Code Decoder | Nether | `nb_p04` | `nb:sudo` |
| 5 | Route Access Request | Nether | `nb_p02` | End entry (removes +8 noise penalty) |
| 6 | Encryption Key Assembly | End | `nb_p06` | `nb:exploit encryption` |
| 7 | Port Knock Sequence | End | `nb_p07` | `nb:exploit root` |

---

## Prologue: lobby setup

No flag. Sets `nb_start` via HR_BOT's `hr_intro` NPC scene.

### HR_BOT villager

Summon (replace coordinates):
```
/summon villager HR_BOT1 981 68 393
```

Hold in place (Repeating / Always Active):
```
/execute as @e[type=villager,name=HR_BOT1,c=1] at @s run tp @s 981 68 393
```

Proximity greeting - Block A (Repeating / Always Active):
```
/execute as @e[type=villager,name=HR_BOT1,c=1] run testfor @a[r=5,c=1]
```

Block B (Impulse / Needs Redstone, powered by comparator output from Block A):
```
/execute as @e[type=villager,name=HR_BOT1,c=1] run say Welcome to HEXCORE. Type /nb:menu to open your terminal.
```

### ZERO lobby email (computer at spawn)

```
HEXCORE HIRING PROTOCOL

Every command is logged.
Any hacking attempt will be reported and punished.
```

### GHOST counter-note (optional, hidden near HR_BOT - book or sign)

```
Don't believe the evaluation.
HEXCORE is the target.
I left the way in.
Follow the trail. Shut it down.
- G
```

### SENTINEL warning sign (before first puzzle route)

```
[SENTINEL]
Automated defense active.
Shared noise triggers patrols,
terminal restrictions,
and access revocation.
```

Add directional signs toward server room, SOC, and hardware lab. Tell players to type `/nb:menu`.

---

## Puzzle 1: Credential Vault

**Zone:** Overworld - server room
**Flag:** `nb_p01` | **Set by:** command block (discovery button)
**Story:** GHOST found an unrotated backup account and annotated it. The ticket number `#4471` planted here is evidence needed in Puzzle 5.

### Build

- Server room; vault hidden between server racks.
- Chest containing a Written Book titled `auth.log backup`:

```
User: admin
Password: hexc0re2049
- Yes, really.
- I filed a ticket.
- Ticket #4471. Still open.
```

- Stone button beside the chest. Sign on or beside it: `REGISTER CREDENTIAL DISCOVERY`
- Sign nearby: `Use the discovered values with /nb:login <username> <password>`
- Sign/book as GHOST material (different type from ZERO notices).

ZERO sign (place AFTER the vault, not before the evidence):
```
[ZERO]
Credential access: logged.
All activity monitored.
Proceed.
```

### Flag command block (Impulse / Unconditional / Needs Redstone / no slash)

```
scoreboard players set NB_GLOBAL nb_p01 1
```

### What happens step by step

1. Player presses discovery button.
2. Command block sets `nb_p01 = 1`.
3. Script detects change, broadcasts `[FLAG CAPTURED] Credentials`, removes 3 noise.
4. Player types `nb:login admin hexc0re2049`.
5. Script checks `nb_p01 >= 1` and exact credentials. Sets `nb_perm = 1` (user). Shows `ACCESS GRANTED`. Adds +10 noise.
6. `nb:ls`, `nb:cat`, `nb:scan` now available.

### Verify

- Button not pressed: `nb:login` returns "authentication failed" even with correct credentials.
- Button pressed: flag becomes 1, capture announced, noise -3.
- After login: `/nb:whoami` shows user.

---

## Puzzle 2: Log Analysis Wall

**Zone:** Overworld - SOC
**Flag:** `nb_p03` | **Set by:** command block (correct button)
**Story:** GHOST's account `g.host` was reused from an external IP two minutes after termination. ZERO closed the incident with no action.

### Build

Wall of 7 signs (oak or spruce):

```
[04:11] sshd: Accepted publickey for admin from 10.0.0.5
[04:13] sudo: admin opened root shell on pts/0
[04:15] iam: account g.host disabled by ZERO
[04:17] sshd: Accepted password for g.host from 203.0.113.42
[04:19] audit: g.host read /opt/exploits/firewall.bin
[04:21] cron: root completed integrity scan
[04:23] systemd: closed session for admin
```

One stone button beside each line. Three are traps. All buttons look identical. Hint sign: `Report the first event that proves the disabled account was reused.`

**Correct answer:** `[04:17]` - login two minutes after the `[04:15]` disable.

### Messages to place

GHOST tip (SOC entrance computer - place before the log wall):
```
Subject: Auth log

SOC terminal - east wall.
Look at 04:15. Then 04:17.
Two minutes. Same account.
- G
```

ZERO incident report (SOC entrance computer - same location):
```
Subject: SECURITY INCIDENT - g.host

Status: CLOSED
Employee: g.host terminated.
Evidence: inconclusive.
Any remaining artefacts are
under active surveillance.
- ZERO
```

GHOST lab note (near correct button or delivered after capture - directs players to Puzzle 3):
```
Subject: Lab access note

They're watching the main
terminal. Use the lab entrance.
Bypass chip: hardware cabinet,
second shelf. Don't tell ZERO.
- G
```

### Command blocks

Correct button (Impulse / Unconditional / Needs Redstone):
```
scoreboard players set NB_GLOBAL nb_p03 1
```

Each trap button:
```
scoreboard players add NB_GLOBAL nb_noise 5
```

### What happens step by step

1. Player presses correct button. Command block sets `nb_p03 = 1`. Script announces, noise -3.
2. Player types `nb:exploit firewall` (needs user from Puzzle 1).
3. Script checks `nb_p03 >= 1` and user. Sets `nb_fwall = 1`. Adds +15 noise.
4. `nb_fwall = 1` removes the +8 noise penalty when entering the Nether. It does NOT teleport players. See Overworld-to-Nether transition below.

### Verify

- `nb:cat auth.log` does NOT show the g.host session. The physical wall is the only evidence.
- All buttons look identical; players must read carefully.

---

## Puzzle 3: Firewall Rules Console

**Zone:** Overworld - hardware lab
**Flag:** `nb_p05` | **Set by:** command block (AND gate from lever circuit)
**Story:** GHOST found an IDS vulnerability the official audit missed. Players configure the allowlist to validate and activate GHOST's bypass module.

### Build

8 levers in a row. Sign above each (left to right):
```
22    53    80    443    3389    8080    21    25
```

Hint sign: `ALLOW WEB TRAFFIC ONLY`
Legend sign: `SSH=22  DNS=53  HTTP=80  HTTPS=443  RDP=3389  DEV=8080  FTP=21  SMTP=25`

IDS bypass cabinet label (beside the console):
```
IDS BYPASS MODULE
Rev 3.1 - prototype
"for testing purposes only"
(it works. trust me.)
- G
```

### Messages to place

GHOST bypass note (hardware lab computer):
```
Subject: IDS bypass - Rev 3.1

I built this chip. It disables
the IDS sensor on the internal
service subnet.
ZERO's audit missed it.
It's in the cabinet.
Use it before SENTINEL notices.
- G
```

ZERO sign (place AFTER the console, not before):
```
[ZERO]
Supply chain audit: complete.
Findings: none.
GHOST found a vulnerability.
GHOST is no longer employed here.
The vulnerability remains.
```

### Correct lever state

Levers 80 and 443 ON. All others OFF.

### Redstone

- Levers 80 and 443 into an AND gate (both ON required).
- Levers 22, 53, 3389, 8080, 21, 25 each through a NOT gate (torch inverter), all into the same AND gate (all OFF required).
- Final AND output triggers the flag block.
- Use a comparator + short repeater delay to prevent repeated triggers.

### Flag command block (AND gate output)

```
scoreboard players set NB_GLOBAL nb_p05 1
```

### What happens step by step

1. Player sets levers to correct state. AND circuit closes. Command block sets `nb_p05 = 1`. Script announces, noise -3.
2. Player types `nb:exploit ids` (needs user from Puzzle 1).
3. Script checks `nb_p05 >= 1` and user. Sets `nb_ids = 1`. Adds +12 noise.
4. Noise now decays twice as fast (script doubles the decay rate when `nb_ids >= 1`).

### Verify

- Wrong lever combos do not complete the circuit. No noise penalty.
- After flag is set, repeated circuit completion does nothing.

---

## Overworld to Nether transition

**Prerequisite:** `nb_fwall = 1` (set by `nb:exploit firewall`)

The script removes the +8 noise penalty for Nether entry once `nb_fwall >= 1`. It does NOT teleport. The builder must create the physical transition. See Appendix C for the command block monitoring pattern.

Place these signs at the Nether staging entrance:
```
eth1 - RESTRICTED SERVICES
Firewall bypass required to enter.
If you're here without solving it,
SENTINEL already knows.
```

```
[SENTINEL]
Unauthorized access logged.
Guards deployed.
This is your only warning.
(It is not a warning.)
```

---

## Puzzle 4: Binary Access-Code Decoder

**Zone:** Nether - fortress room
**Flag:** `nb_p04` | **Set by:** command block (AND gate from lever circuit)
**Story:** GHOST recovered an access byte. Players decode it to unlock privilege escalation.

### Build

8 levers, most significant bit on the left:
```
128    64    32    16    8    4    2    1
```

Hint sign: `RECOVERED ACCESS BYTE: 01000001`
Secondary sign: `Convert binary to decimal. One lever per bit.`

GHOST workstation sign or book:
```
RECOVERED ACCESS BYTE:
01000001
levers = binary place values
left = 128. right = 1.
convert to decimal, then ASCII.
- G
```

ZERO system panel:
```
[ZERO]
ACCESS-CODE DECODER
Set levers to match
the recovered byte.
All ON = 1. All OFF = 0.
```

ASCII reference wall (required - must be visible in the room):
```
ASCII REFERENCE
64 = @
65 = A
66 = B
Recovered byte: 01000001
Use the place values.
```

### Messages to place

GHOST byte note (Nether computer):
```
Subject: Recovered access byte

Found this in the system logs.
Binary: 01000001
That is decimal 65.
Standard ASCII.
Lever panel is in the room.
- G
```

### Correct lever state

Levers 64 and 1 ON. All others OFF. `01000001` = 65 = ASCII `A`.

### Redstone

Same AND/NOT circuit as Puzzle 3.

### Flag command block (AND gate output)

```
scoreboard players set NB_GLOBAL nb_p04 1
```

### What happens step by step

1. Player sets correct levers. AND circuit closes. Command block sets `nb_p04 = 1`. Script announces, noise -3.
2. Player types `nb:sudo <any text>` (needs user from Puzzle 1).
3. Script checks `nb_p04 >= 1` and user. Sets `nb_perm = 2` (admin). Adds +25 noise.
4. `nb:exploit encryption` and `nb:kill_patrol` now available.

### Verify

- ASCII reference must be visible in the room before the lever panel.
- Do not describe this as hash cracking. It is decoding a recovered byte.

---

## Puzzle 5: Route Access Request

**Zone:** Nether - End portal staging area
**Flag:** `nb_p02` | **Set by:** command block
**Story:** A route controller was never decommissioned after GHOST's account was terminated. Players gather four evidence fields from both dimensions.

> **Code note:** `nb:request` is NOT in the current main.ts. The plan is to add a terminal command that validates the four fields and sets `nb_p02`. Until that code is written, wire `nb_p02` to a physical puzzle mechanism (button, NPC dialogue button, or redstone gate). The ZERO sign below shows the planned command syntax for when it is implemented.

### Evidence to place

Overworld (near SOC or server room) - policy email:
```
Subject: OPEN TICKETS

#4471 - ETH2 gateway maintenance
Status: OPEN
Requestor: g.host (TERMINATED)
Note: not yet closed by ZERO.
```

Nether (sign or book near staging gate) - route log:
```
ROUTE LOG
Target: ETH2-GW
Maintenance window: 04:30
Approver: ZERO
Status: pending execution
```

### Build

- Locked barrier or iron door blocking the End portal staging area.
- Computer terminal add-on beside the barrier.

GHOST route note (staging terminal computer):
```
Subject: Route controller still running

ETH2-GW route controller never
had its credentials revoked.
It validates the original ticket.
All four fields. Exact match.
You know the fields.
- G
```

ZERO system notice (wall sign near barrier):
```
[ZERO]
eth2 route: restricted.
Authorised maintenance only.
[nb:request command goes here when implemented]
```

### Flag command block (wire to your physical mechanism)

```
scoreboard players set NB_GLOBAL nb_p02 1
```

Open the gate (chain block from the same signal):
```
setblock <X> <Y> <Z> air
```

### What happens step by step

1. Player solves physical puzzle / presses button. Command block sets `nb_p02 = 1`. Script announces, noise -3.
2. Gate block is removed (chain command block).
3. Script no longer adds +8 noise when players enter The End.
4. Builder must implement the End teleport separately. See Appendix C.

---

## Pre-End: equipment and briefing

Wire to the same command chain that opens the Puzzle 5 gate.

- Dispenser or pre-filled chests at the staging pad (accessible only after gate opens).
- Load with modified blasters and armor (confirm item IDs from commercial add-on before wiring).
- Trigger dispenser from the same redstone chain as the gate.

Briefing email (staging terminal computer):
```
Subject: CORE ACCESS GRANTED

Route open. Timer active.
SENTINEL countermeasures deploy
on entry. Neutralise the core
defense before time expires.
Equipment is at the staging pad.
Don't waste it.
- ZERO
```

---

## Nether to End transition

**Prerequisite:** `nb_p02 = 1`

Same command block monitoring pattern as Overworld-to-Nether. See Appendix C. Teleport players to a fixed End staging pad.

End entry note (GHOST, near dimension transition point):
```
eth2 - AIR-GAPPED CORE
You shouldn't be here.
I have been here before.
Key vault: far island.
Master panel: central node.
Active patrols. No reading.
Timer is running.
- G
```

---

## Puzzle 6: Encryption Key Assembly

**Zone:** The End - scattered islands and central vault
**Flag:** `nb_p06` | **Set by:** command block (hopper filter AND gate)
**Story:** GHOST split the encryption key across three physical media. Players reassemble it.

### Build

Three fragments hidden on separate End islands:
- Fragment A: Echo Shard
- Fragment B: Amethyst Shard
- Fragment C: Prismarine Crystals

Place a short GHOST note on each island so players know what they are looking for.

Central vault: three labeled input barrels. Each feeds a hopper item filter for its fragment type. Each successful filter latches one redstone lamp. All three lamps feed the final AND gate.

Do not use an unfiltered chest comparator. It cannot distinguish fragment types.

### Messages to place

ZERO eth2 briefing (End entry computer):
```
Subject: eth2 - SYSTEM CORE

You have reached the core.
The encryption layer is active.
The port endpoint is locked.
Both must be cleared.
Timer is running.
Every action is logged.
- ZERO
```

Vault sign 1:
```
ENCRYPTION KEY VAULT
Cold storage - offline backup
Access: physical only
If you found this digitally,
something has gone very wrong.
(Something has gone very wrong.)
```

Vault sign 2:
```
KEY FRAGMENTS
Echo Shard -> ECHO receiver
Amethyst -> AMETHYST receiver
Prismarine -> PRISMARINE receiver
wrong items do not count.
all three filters must latch.
- G
```

GHOST key note (vault entrance computer):
```
Subject: The key

I split it. Three parts.
Three different media types.
Each receiver only takes its type.
All three must latch.
Check the vault sign for mapping.
- G
```

### Redstone

1. One hopper item filter per fragment type.
2. Latch each filter output so removing an item does not erase progress.
3. Feed three latches into AND gate.
4. Flag block fires when all three are active.

### Flag command block (AND gate output)

```
scoreboard players set NB_GLOBAL nb_p06 1
```

### What happens step by step

1. Player deposits all three fragments. AND gate closes. Command block sets `nb_p06 = 1`. Script announces, noise -3.
2. Player types `nb:exploit encryption` (needs admin from Puzzle 4).
3. Script checks `nb_p06 >= 1` and admin. Sets `nb_enc = 1`. Adds +20 noise.
4. `nb:exploit root` now recognises the encryption gate as cleared.

### Verify

- Adventure mode prevents crafting replacement fragments.
- Vault stays solved after first complete deposit.

---

## Puzzle 7: Port Knock Sequence

**Zone:** The End - inner sanctum
**Flag:** `nb_p07` | **Set by:** script (main.ts handles `scriptevent nb:knock`)
**Story:** The root endpoint expects a legacy sequence. GHOST left three clues across all three dimensions.

### Sequence clues (place BEFORE the plates, one per dimension)

1. Overworld server room - GHOST service inventory sign: `legacy administration service: tcp/1337`
2. Nether admin workstation - route log sign: `management transport: SSH`
3. End vault exit - tunnel audit sign: `public tunnel: HTTPS`

Players map SSH to port 22 and HTTPS to port 443 from context. Do not put `1337 -> 22 -> 443` on any single sign near the plates.

### Build

5 pressure plates in a row, signs above each:
```
1337    22    443    80    8080
```

Hint sign: `SYN SEQUENCE: KNOCK IN ORDER`
Secondary sign: `Find the correct sequence. Wrong order resets.`

ZERO master panel sign:
```
[ZERO]
MASTER CONTROL PANEL
System Core - Final Lock
SYN sequence: 3 ports.
legacy service first.
management transport second.
public tunnel last.
wrong port resets progress.
```

GHOST final note (sanctum approach computer):
```
Subject: Network topology

legacy admin service: tcp/1337
management transport: SSH
public tunnel: HTTPS
Three knocks. In order.
That's it. That's the lock.
- G
```

### Command blocks per plate (Impulse / Unconditional / Needs Redstone / no slash)

```
scriptevent nb:knock 1337
```
```
scriptevent nb:knock 22
```
```
scriptevent nb:knock 443
```
```
scriptevent nb:knock 80
```
```
scriptevent nb:knock 8080
```

### What happens (entirely handled by main.ts)

1. Plate sends `scriptevent nb:knock <port>`.
2. Script compares port to expected sequence step (tracked in `nb_knock`).
3. Correct port: `nb_knock` advances. Message: `SYN acknowledged (N/3)`.
4. Final correct port (443): script sets `nb_p07 = 1`. Announces capture, noise -3.
5. Wrong port: `nb_knock = 0` (reset), +2 noise.

No separate flag command block needed. The script sets `nb_p07` directly.

### What happens after

Player types `nb:exploit root`. Script checks ALL of:
- `nb_enc >= 1` (set by `nb:exploit encryption`)
- `nb_p07 >= 1` (set by this puzzle)
- `nb_perm >= 2` (admin)
- Player dimension is `minecraft:the_end`

All pass: `nb_perm = 3` (root) + `nb_victory = 1`. Staged shutdown messages fire.

---

## End combat (code deferred)

`nb_core_clear` and `nb_timer` are planned but not in main.ts. Place `chiseled_stone_bricks` patrol markers in the sanctum now. Root will require `nb_core_clear = 1` once the code is added.

---

## Victory

### ZERO system glitch (root terminal - first message)

```
ROOT ACCESS CONFIRMED.
SYSTEM INTEGRITY: FAILED.
HEXCORE SHUTDOWN INITIATED.
...
[CONNECTION LOST]
```

### GHOST final email (root terminal - second message or book)

```
Subject: HEXCORE OFFLINE

Root confirmed. It's shutting down.
Told you the breadcrumbs
were worth following.
Nice work.
- G
```

After `nb_victory = 1`: script stops all noise, patrol, and lock processing. HR_BOT uses `hr_victory` scene. SENTINEL goes silent. Leave GHOST's allegiance unresolved.

---

## Patrol spawn markers

Place `chiseled_stone_bricks` at 4-8 per major room or corridor in all three dimensions. The script scans within 64 blocks, 16 vertical, nearest first. Fallback: player-relative positions (solid floor + 2 air blocks above).

---

## Appendix A: Command block settings

| Block type | Mode | Condition | Redstone | Slash |
|---|---|---|---|---|
| Puzzle flag blocks | Impulse | Unconditional | Needs Redstone | No |
| Noise traps | Impulse | Unconditional | Needs Redstone | No |
| Gate open / setblock | Chain | Unconditional | Always Active | No |
| HR_BOT hold | Repeating | Unconditional | Always Active | No |
| Scoreboard monitor | Repeating | Unconditional | Always Active | No |
| Port Knock plates | Impulse | Unconditional | Needs Redstone | No |
| NPC dialogue JSON | - | - | - | Yes |

---

## Appendix B: Flag wiring quick reference

| Flag | Command | Source |
|---|---|---|
| `nb_p01` | `scoreboard players set NB_GLOBAL nb_p01 1` | Command block |
| `nb_p03` correct | `scoreboard players set NB_GLOBAL nb_p03 1` | Command block |
| `nb_p03` trap | `scoreboard players add NB_GLOBAL nb_noise 5` | Command block |
| `nb_p05` | `scoreboard players set NB_GLOBAL nb_p05 1` | Command block (AND gate) |
| `nb_p04` | `scoreboard players set NB_GLOBAL nb_p04 1` | Command block (AND gate) |
| `nb_p02` | `scoreboard players set NB_GLOBAL nb_p02 1` | Command block |
| Gate open | `setblock <X> <Y> <Z> air` | Chain block |
| `nb_p06` | `scoreboard players set NB_GLOBAL nb_p06 1` | Command block (AND gate) |
| `nb_p07` | Handled by script via `scriptevent nb:knock` | Script |
| Knock reset | Handled by script on wrong plate | Script |

---

## Appendix C: Dimension transition - command block pattern

The script does not teleport players. Use a Repeating block to monitor the scoreboard and fire a one-shot teleport.

**Overworld to Nether (fires once when nb_fwall is set):**

Repeating / Always Active / Unconditional:
```
execute if score NB_GLOBAL nb_fwall matches 1 unless score NB_GLOBAL nb_fwall_tp matches 1 run scoreboard players set NB_GLOBAL nb_fwall_tp 1
```

Chain / Conditional / Always Active (fires only when the Repeating block succeeded):
```
tp @a <nether_staging_x> <nether_staging_y> <nether_staging_z>
```

Register `nb_fwall_tp`: `/scoreboard objectives add nb_fwall_tp dummy`

The Conditional chain only fires on the single tick that the Repeating block first succeeds (when `nb_fwall` becomes 1 and `nb_fwall_tp` is still 0). After that, `nb_fwall_tp = 1` blocks re-firing.

**Nether to End:** same pattern - replace `nb_fwall` with `nb_p02` and `nb_fwall_tp` with `nb_p02_tp`.

---

## Appendix D: Noise quick reference

Full table in `packs/docs/noise-reference.md`.

| Source | Noise |
|---|---|
| Sprint (any player, every 2 ticks) | +1 |
| Nether entry without firewall bypass | +8 |
| End entry without route open | +8 |
| Log Wall trap button | +5 |
| Port Knock wrong plate | +2 |
| Flag capture | -3 |

---

## Appendix E: Troubleshooting

**`nb:login` returns "authentication failed" with correct credentials:** `nb_p01` is 0. Check `/scoreboard players get NB_GLOBAL nb_p01`. If 0, the discovery button command block did not fire.

**`nb:exploit firewall` returns "missing exploit token":** `nb_p03` is 0. The correct SOC button was not pressed.

**`nb:sudo` returns "permission denied":** `nb_p04` is 0. The binary decoder AND gate did not fire.

**Flag changes but no announcement:** value went 1 to 1, not 0 to 1. Script must observe a prior 0. Also check `nb_victory` is not already 1.

**Terminal command works in chat but not a command block:** remove the leading slash in command blocks.

**Door stays closed after flag set:** flags do not move blocks. Add a separate `setblock` or piston block on the same redstone signal.

**Objective does not exist:** behavior pack not initialized. Confirm it is active and the world loaded.

**HR_BOT comparator stays dark:** Block A must be Repeating / Always Active. Comparator rear/input side must touch Block A directly.

---

## Appendix F: Manual test commands

All commands require cheats and operator permission. Use a disposable test world.

```
/scoreboard players get NB_GLOBAL nb_p01
/scoreboard players set NB_GLOBAL nb_p01 1
/scoreboard players set NB_GLOBAL nb_p01 0
/scoreboard players set NB_GLOBAL nb_noise 100
/scriptevent nb:knock 1337
/scriptevent nb:knock 22
/scriptevent nb:knock 443
/nb:status
/nb:menu
```

---

## Appendix G: Reward chains after flag capture

After any flag-setting impulse block, attach chain command blocks to deliver rewards. No extra redstone required.

Chain block settings: Mode = Chain / Condition = Unconditional / Redstone = Always Active / no leading slash.

Common reward commands:

```
title @a actionbar <message text>
playsound random.levelup @a
give @a[r=20] <item_id> 1
tp @a <x> <y> <z>
setblock <x> <y> <z> air
summon fireworks_rocket <x> <y> <z>
```

For items from commercial add-ons, confirm the exact item ID before wiring. Use a pre-loaded dispenser as a safer alternative to a `give` command when item IDs are uncertain.

For staggered effects (e.g. title first, teleport 3 seconds later), set the Delay field on the chain block to the required tick count (20 ticks = 1 second).

### Per-puzzle suggestions

| Puzzle | Suggested chain |
|---|---|
| 1 - Credential Vault | Sound + actionbar "Credentials recovered" |
| 2 - Log Analysis Wall | Sound + actionbar pointing toward hardware lab |
| 3 - Firewall Console | Sound + lightning at IDS cabinet + actionbar "IDS bypass active" |
| 4 - Binary Decoder | Title "SUDO ENABLED" + sound + optional blaster (confirm item ID first) |
| 5 - Route Request | Gate open (setblock) + dispenser trigger for equipment + delayed teleport to End staging |
| 6 - Key Assembly | Title + sound + optional upgraded blaster for End combat (confirm item ID) |
| 7 - Port Knock | No chain needed; script sets `nb_p07` directly on the final correct knock |

---

## Appendix H: nb:reset (code deferred)

Until implemented, reset all values individually. Also reset physical puzzle states: latched hoppers, barrier blocks, consumed items.

```
/scoreboard players set NB_GLOBAL nb_p01 0
/scoreboard players set NB_GLOBAL nb_p02 0
/scoreboard players set NB_GLOBAL nb_p03 0
/scoreboard players set NB_GLOBAL nb_p04 0
/scoreboard players set NB_GLOBAL nb_p05 0
/scoreboard players set NB_GLOBAL nb_p06 0
/scoreboard players set NB_GLOBAL nb_p07 0
/scoreboard players set NB_GLOBAL nb_perm 0
/scoreboard players set NB_GLOBAL nb_noise 0
/scoreboard players set NB_GLOBAL nb_alarms 0
/scoreboard players set NB_GLOBAL nb_locked 0
/scoreboard players set NB_GLOBAL nb_fwall 0
/scoreboard players set NB_GLOBAL nb_ids 0
/scoreboard players set NB_GLOBAL nb_enc 0
/scoreboard players set NB_GLOBAL nb_knock 0
/scoreboard players set NB_GLOBAL nb_start 0
/scoreboard players set NB_GLOBAL nb_victory 0
```
