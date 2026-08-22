# NullByte: Build Reference

All manual tasks needed to build and wire the seven puzzles. Use `NullByte_Story_Timeline.md` for narrative context and `packs/docs/noise-reference.md` for defense mechanics.

---

## Characters (brief)

| Character | Voice | Signs/emails formatted as |
|---|---|---|
| ZERO | Cold, clinical, brief. Antagonist AI. | `[ZERO]` or `- ZERO` |
| GHOST | Wry, informal. Left the evidence trail. | `- G` or `GHOST` |
| SENTINEL | Automated alert. | `[SENTINEL]` |
| HR_BOT | Intake AI. Thinks players are candidates. | `HR_BOT` on nameplate |

Use different sign or book materials per author so players recognise the source before reading.

---

## Shared rules

- All flags belong to `NB_GLOBAL`, never a player selector (`@p`, `@s`, `@initiator`).
- A flag change from 0 to 1 broadcasts the capture, removes 3 shared noise, and unlocks the linked command.
- Flags are permanent during normal play.
- Command blocks: `Impulse / Unconditional / Needs Redstone / delay 0 / no leading slash`.
- NPC dialogue JSON: commands use a leading slash.
- Port Knock (Puzzle 7) uses `scriptevent`, not a direct flag set.

---

## Flag map

| # | Puzzle | Zone | Flag | Unlocks |
|---|---|---|---|---|
| 1 | Credential Vault | Overworld | `nb_p01` | `nb:login`, `nb:ls`, `nb:cat`, `nb:scan` |
| 2 | Log Analysis Wall | Overworld | `nb_p03` | `nb:exploit firewall` |
| 3 | Firewall Rules Console | Overworld | `nb_p05` | `nb:exploit ids` |
| 4 | Binary Access-Code Decoder | Nether | `nb_p04` | `nb:sudo` |
| 5 | Route Access Request | Nether | `nb_p02` | End portal gate |
| 6 | Encryption Key Assembly | End | `nb_p06` | `nb:exploit encryption` |
| 7 | Port Knock Sequence | End | `nb_p07` | `nb:exploit root` (with encryption) |

Flag numbers follow objective allocation, not build order.

---

## Prologue: lobby setup

Awards no flag. Sets `nb_start` via HR_BOT's `hr_intro` NPC scene.

### HR_BOT villager

Summon (replace coordinates with actual cafeteria position):

```mcfunction
/summon villager HR_BOT 100 64 100
```

Hold in place (Repeating / Always Active):

```mcfunction
/execute as @e[type=villager,name=HR_BOT,c=1] at @s run tp @s 100 64 100
```

Proximity greeting circuit (Block A / comparator / Block B):

Block A (Repeating / Always Active):
```mcfunction
/execute as @e[type=villager,name=HR_BOT,c=1] at @s run testfor @a[r=5,c=1]
```

Block B (Impulse / Needs Redstone, powered by comparator output):
```mcfunction
/execute as @e[type=villager,name=HR_BOT,c=1] run say Welcome to HEXCORE. Type /nb:menu to open your terminal.
```

### ZERO briefing email (lobby computer)

```
Subject: HEXCORE HIRING PROTOCOL

Objective: gain root access.
Every command is logged.
Credentials are inside.
GHOST left evidence behind.
- ZERO
```

### GHOST counter-note (optional, near HR_BOT)

Place as a book or sign in a spot that rewards curious players. Do not put it directly in the player path.

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

Add directional signs toward the server room, SOC, and hardware lab. Tell players to type `/nb:menu`.

---

## Puzzle 1: Credential Vault (Overworld, nb_p01)

**Teaches:** default credentials / physical security.

**Story:** GHOST found an unrotated backup account and annotated it. The ticket number planted here is needed later at Puzzle 5.

### Build

- Small server room; vault hidden between server racks.
- Chest inside containing a Written Book titled `auth.log backup`:

```
User: admin
Password: hexc0re2049
- Yes, really.
- I filed a ticket.
- Ticket #4471. Still open.
```

- Stone button beside the chest labeled `REGISTER CREDENTIAL DISCOVERY`.
- Nearby sign: `Use the discovered values with /nb:login <username> <password>`
- Sign the credential note as GHOST material (use a different book or sign type from ZERO notices).

### ZERO sign (place after the vault, not before the evidence)

```
[ZERO]
Credential access: logged.
All activity monitored.
Proceed.
```

### Command block (Impulse / attached to discovery button)

```
scoreboard players set NB_GLOBAL nb_p01 1
```

### Verify

- Wrong state: flag stays 0.
- Correct state: flag becomes 1, capture announced, noise -3.
- `nb:login admin hexc0re2049` works after capture.

---

## Puzzle 2: Log Analysis Wall (Overworld, nb_p03)

**Teaches:** log analysis / anomaly detection.

**Story:** GHOST's former account `g.host` was reused from an external IP two minutes after termination. ZERO closed the incident. Players identify the first event that proves the reuse.

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

- One stone button beside each line. Three buttons are traps. All buttons look identical.
- Hint sign: `Report the first event that proves the disabled account was reused.`

**Correct answer:** `[04:17]` - login two minutes after the `[04:15]` disable.

### Email 1: GHOST tip (SOC entrance computer)

```
Subject: Auth log

SOC terminal - east wall.
Look at 04:15. Then 04:17.
Two minutes. Same account.
- G
```

### Email 2: ZERO incident report (SOC entrance computer)

```
Subject: SECURITY INCIDENT - g.host

Status: CLOSED
Employee: g.host terminated.
Evidence: inconclusive.
Any remaining artefacts are
under active surveillance.
- ZERO
```

### Email 3: GHOST lab note (near correct button or delivered after capture)

```
Subject: Lab access note

They're watching the main
terminal. Use the lab entrance.
Bypass chip: hardware cabinet,
second shelf. Don't tell ZERO.
- G
```

### Command blocks

Correct button:
```
scoreboard players set NB_GLOBAL nb_p03 1
```

Each trap button:
```
scoreboard players add NB_GLOBAL nb_noise 5
```

### Verify

- All buttons look identical; players must read carefully.
- `nb:cat auth.log` does NOT show the g.host session. The physical wall is the evidence.

---

## Puzzle 3: Firewall Rules Console (Overworld, nb_p05)

**Teaches:** firewall allowlists / port management.

**Story:** GHOST found a supply-chain vulnerability in the IDS hardware that the official audit missed. The hardware lab contains GHOST's bypass prototype. Players configure the allowlist to activate it.

### Build

- 8 levers in a row. Sign above each (left to right):

```
22    53    80    443    3389    8080    21    25
```

- Hint sign: `ALLOW WEB TRAFFIC ONLY`
- Legend sign: `SSH=22  DNS=53  HTTP=80  HTTPS=443  RDP=3389  DEV=8080  FTP=21  SMTP=25`

IDS bypass cabinet label (beside the console):

```
IDS BYPASS MODULE
Rev 3.1 - prototype
"for testing purposes only"
(it works. trust me.)
- G
```

Server rack flavor sign:

```
sshd: port 22 (active)
httpd: port 80 (active)
mysqld: port 3306 (active)
firewall: cameras on corridor
```

### Email: GHOST bypass note (hardware lab computer)

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

### ZERO sign (place after the console, not before)

```
[ZERO]
Supply chain audit: complete.
Findings: none.
GHOST found a vulnerability.
GHOST is no longer employed here.
The vulnerability remains.
```

### Correct state

Levers 80 and 443 ON. All others OFF.

### Redstone

- Levers 80 and 443 into an AND gate (both must be ON).
- Levers 22, 53, 3389, 8080, 21, 25 each through a NOT gate (torch inverter), all into the same AND gate (all must be OFF).
- Final AND output triggers the command block.
- Use a comparator + short repeater delay to prevent repeated triggers.

### Command block

```
scoreboard players set NB_GLOBAL nb_p05 1
```

### Verify

- Wrong lever combos do not complete the circuit; no noise penalty.
- After flag is 1, repeated circuit completion does nothing.

---

## Puzzle 4: Binary Access-Code Decoder (Nether, nb_p04)

**Teaches:** binary place values / ASCII encoding.

**Prerequisite:** players reach the Nether via scripted teleport after `nb:exploit firewall` succeeds. Not a player-built portal.

**Story:** GHOST recovered an access byte from the system. Players decode it to unlock admin escalation.

### Nether entry signs (place before staging room entrance)

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

### Build

Nether fortress room. 8 levers, MSB left:

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

ASCII reference wall (required - no prior memorisation needed):

```
ASCII REFERENCE
64 = @
65 = A
66 = B
Recovered byte: 01000001
Use the place values.
```

### Email: GHOST byte note (Nether computer)

```
Subject: Recovered access byte

Found this in the system logs.
Binary: 01000001
That is decimal 65.
Standard ASCII.
Lever panel is in the room.
- G
```

### Correct state

Levers 64 and 1 ON. All others OFF.
`01000001` = decimal 65 = ASCII `A`.

### Redstone

Same AND/NOT circuit as Puzzle 3: levers 64 and 1 must be ON, all others through NOT gates into the final AND.

### Command block

```
scoreboard players set NB_GLOBAL nb_p04 1
```

### Verify

- Do not describe this as hash cracking. It is decoding a recovered byte.
- ASCII reference must be visible in the room before the lever panel.

---

## Puzzle 5: Route Access Request (Nether, nb_p02)

**Teaches:** pretexting / evidence correlation across zones.

**Prerequisite:** authenticated user session + firewall bypass active.

**Story:** A route controller was never decommissioned after GHOST's account was terminated. Players gather the four evidence fields from both dimensions and submit via terminal.

### Evidence to place

**Overworld (near SOC or server room) - policy email:**

```
Subject: OPEN TICKETS

#4471 - ETH2 gateway maintenance
Status: OPEN
Requestor: g.host (TERMINATED)
Note: not yet closed by ZERO.
```

**Nether (sign or book near the staging gate) - route log:**

```
ROUTE LOG
Target: ETH2-GW
Maintenance window: 04:30
Approver: ZERO
Status: pending execution
```

### Build

- Locked barrier or iron door in front of the End portal staging area.
- Computer terminal add-on beside the barrier.

### Email: GHOST route note (staging terminal computer)

```
Subject: Route controller still running

ETH2-GW route controller never
had its credentials revoked.
It validates the original ticket.
All four fields. Exact match.
You know the fields.
- G
```

### ZERO system notice (sign on wall near barrier)

```
[ZERO]
eth2 route: restricted.
Authorised maintenance only.
nb:request <ticket> <host> <window> <approver>
```

### Terminal command (players must type this)

```
nb:request 4471 ETH2-GW 04:30 ZERO
```

The script validates all four fields. Wrong values add 6 noise. Correct command sets the flag and opens the gate.

### Command blocks

Correct validation (via script):
```
scoreboard players set NB_GLOBAL nb_p02 1
```

Open the gate (chain or separate impulse block):
```
setblock <X> <Y> <Z> air
```

Wrong submission (via script):
```
scoreboard players add NB_GLOBAL nb_noise 6
```

### Verify

- All four fields must match exactly. Partial matches add noise.
- Gate requires its own setblock or piston; the flag alone does not move blocks.

---

## Pre-End: equipment and briefing

Fires in the Nether staging area after `nb_p02` is set, before the teleport to The End.

### Equipment drop

Place a dispenser or pre-filled chests at the staging pad, accessible only after the gate opens:

- Modified blasters (one set per player; item IDs from commercial add-on; confirm during integration)
- Armor set: helmet, chestplate, leggings, boots (modified protection values; same note)

Trigger the dispenser from the same command chain that opens the gate.

### Briefing email (staging terminal, delivered when `nb_p02` is set)

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

## Puzzle 6: Encryption Key Assembly (End, nb_p06)

**Teaches:** key management / cold storage.

**Prerequisite:** End route open (`nb_p02`).

**Story:** GHOST split the encryption key across three physical media before disappearing. Players reassemble it.

### End entry note (GHOST, near dimension transition point)

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

### Build

Hide three fragments on separate End islands:

- Fragment A: Echo Shard
- Fragment B: Amethyst Shard
- Fragment C: Prismarine Crystals

Place a short GHOST note on each fragment route so players know what they are looking for. The complete receiver mapping is in the central vault.

Central vault: three labeled input barrels. Each feeds a hopper item filter. A successful filter latches one redstone lamp. All three lamps feed the final AND gate.

### Vault signs

```
ENCRYPTION KEY VAULT
Cold storage - offline backup
Access: physical only
If you found this digitally,
something has gone very wrong.
(Something has gone very wrong.)
```

```
KEY FRAGMENTS
Echo Shard -> ECHO receiver
Amethyst -> AMETHYST receiver
Prismarine -> PRISMARINE receiver
wrong items do not count.
all three filters must latch.
- G
```

### Email: GHOST key note (vault entrance computer)

```
Subject: The key

I split it. Three parts.
Three different media types.
Each receiver only takes its type.
All three must latch.
Check the vault sign for mapping.
- G
```

### Email: ZERO eth2 briefing (End entry computer)

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

### Redstone

1. One standard hopper item filter per fragment type.
2. Latch each filter output so removing an item does not erase progress.
3. Feed the three latches into an AND gate.
4. Trigger the command block only when all three are active.

Do not use an unfiltered chest comparator; it cannot distinguish fragment types.

### Command block

```
scoreboard players set NB_GLOBAL nb_p06 1
```

### Verify

- Adventure mode prevents manufacturing replacement fragments.
- The vault remains solved after the first complete deposit.

---

## Puzzle 7: Port Knock Sequence (End, nb_p07)

**Teaches:** port knocking / service-to-port mapping.

**Prerequisite:** `nb:exploit encryption` must be active before root is possible (not before this puzzle).

**Story:** The root endpoint expects a legacy knock sequence. GHOST left the three port references across all three dimensions.

### Build

5 pressure plates in a row, signs above each:

```
1337    22    443    80    8080
```

Hint sign: `SYN SEQUENCE: KNOCK IN ORDER`
Secondary sign: `Find the correct sequence. Wrong order resets.`

ZERO master panel sign (near plates):

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

### Three sequence clues (place BEFORE the plates, spread across dimensions)

1. Overworld server room, GHOST service inventory sign:
   `legacy administration service: tcp/1337`
2. Nether admin workstation, route log sign:
   `management transport: SSH`
3. End vault exit, tunnel audit sign:
   `public tunnel: HTTPS`

Players map SSH to port 22 and HTTPS to port 443 from context. Do not place `1337 -> 22 -> 443` on one sign near the plates.

### Email: GHOST final note (sanctum approach computer)

```
Subject: Network topology

legacy admin service: tcp/1337
management transport: SSH
public tunnel: HTTPS
Three knocks. In order.
That's it. That's the lock.
- G
```

**Correct knock order:** `1337 -> 22 -> 443`
Plates 80 and 8080 reset the sequence and add 2 noise each.

### Command blocks per plate

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

The script sets `nb_p07` on the final correct knock. No separate flag command block is needed.

### Verify

- Any wrong plate resets `nb_knock` to 0 and adds 2 shared noise.
- `nb:exploit root` requires `nb:exploit encryption` first.
- Optional: three progress lamps showing accepted knocks without revealing the next port.

---

## End combat (code deferred)

The End is an active combat zone from entry. Timer `nb_timer` and boss flag `nb_core_clear` are planned but not yet in code. Place `chiseled_stone_bricks` patrol markers throughout the sanctum now so mob spawning is ready when the code is added.

Root will require `nb_core_clear = 1` in addition to the existing gates once implemented.

---

## Victory and ending

### ZERO system response (root terminal, first message)

```
ROOT ACCESS CONFIRMED.
SYSTEM INTEGRITY: FAILED.
HEXCORE SHUTDOWN INITIATED.
...
[CONNECTION LOST]
```

### GHOST final email (root terminal, second message or book)

```
Subject: HEXCORE OFFLINE

Root confirmed. It's shutting down.
Told you the breadcrumbs
were worth following.
Nice work.
- G
```

After `nb_victory` becomes 1:
- HR_BOT uses the `hr_victory` scene if players return to the lobby.
- SENTINEL goes silent.
- Leave GHOST's allegiance unresolved.

---

## Dimension transitions

Adventure mode blocks player-built portals. Every zone change is a scripted teleport.

- **Overworld to Nether:** fires after `nb:exploit firewall` succeeds. Teleport players to a fixed Nether staging pad.
- **Nether to End:** fires after `nb:request` validates all four fields and sets `nb_p02`. Teleport players to a fixed End staging pad.

Keep a physical barrier closed until the corresponding flag is set. Do not drop players mid-room or in a hostile location.

---

## Patrol spawn markers

Place `chiseled_stone_bricks` at deliberate positions in all three dimensions: 4-8 per major room or corridor. The script queries blocks within 64 blocks radius and 16 blocks vertical, sorted nearest-first. Fallback: validated player-relative position (solid floor + 2 air blocks above).

---

## Appendix A: Command block settings

| Block type | Mode | Condition | Redstone | Slash |
|---|---|---|---|---|
| Puzzle flag blocks | Impulse | Unconditional | Needs Redstone | No |
| Noise traps | Impulse | Unconditional | Needs Redstone | No |
| Gate open (setblock) | Chain | Unconditional | Always Active | No |
| HR_BOT hold | Repeating | Unconditional | Always Active | No |
| Port Knock plates | Impulse | Unconditional | Needs Redstone | No |
| NPC dialogue JSON | - | - | - | Yes |

---

## Appendix B: Flag wiring quick reference

| Puzzle | Correct command | Trap / wrong |
|---|---|---|
| 1 - Credential Vault | `scoreboard players set NB_GLOBAL nb_p01 1` | none |
| 2 - Log Analysis Wall | `scoreboard players set NB_GLOBAL nb_p03 1` | `scoreboard players add NB_GLOBAL nb_noise 5` |
| 3 - Firewall Console | `scoreboard players set NB_GLOBAL nb_p05 1` | none (wrong state = no circuit) |
| 4 - Binary Decoder | `scoreboard players set NB_GLOBAL nb_p04 1` | none |
| 5 - Gate open | `setblock <X> <Y> <Z> air` | - |
| 5 - Route Request correct | `scoreboard players set NB_GLOBAL nb_p02 1` (via script) | `scoreboard players add NB_GLOBAL nb_noise 6` (via script) |
| 6 - Key Assembly | `scoreboard players set NB_GLOBAL nb_p06 1` | none |
| 7 - Plate 1337 | `scriptevent nb:knock 1337` | - |
| 7 - Plate 22 | `scriptevent nb:knock 22` | - |
| 7 - Plate 443 | `scriptevent nb:knock 443` | - |
| 7 - Trap 80 | `scriptevent nb:knock 80` | - |
| 7 - Trap 8080 | `scriptevent nb:knock 8080` | - |

---

## Appendix C: Manual test commands

All commands require cheats enabled and operator permission. Use a disposable test world.

Inspect a flag:
```
/scoreboard players get NB_GLOBAL nb_p01
```

Set a flag:
```
/scoreboard players set NB_GLOBAL nb_p01 1
```

Reset a flag (wait one game tick before setting back to 1):
```
/scoreboard players set NB_GLOBAL nb_p01 0
```

Set noise to 100 (tests LOCKDOWN):
```
/scoreboard players set NB_GLOBAL nb_noise 100
```

Test Port Knock manually:
```
/scriptevent nb:knock 1337
/scriptevent nb:knock 22
/scriptevent nb:knock 443
```

Check session state:
```
/nb:status
/nb:menu
```

---

## Appendix D: Noise quick reference

Full table with band thresholds and mob types is in `packs/docs/noise-reference.md`.

Key values for puzzle design:

| Source | Noise |
|---|---|
| Sprint (any player, every 2 ticks) | +1 |
| Entering Nether without firewall bypass | +8 |
| Entering End without route open | +8 |
| Log Wall trap button | +5 |
| Wrong route request fields | +6 |
| Wrong Port Knock plate | +2 |
| Flag capture | -3 |

---

## Appendix E: Troubleshooting

**Flag changes but no announcement:** value went 1 to 1, not 0 to 1. Script must see the prior 0. Also check `nb_victory` is not already 1.

**Command works in chat but not a command block:** remove the leading slash. Keep it in chat and NPC JSON.

**Door stays closed after flag set:** flags do not move blocks. Add a separate `setblock` or piston command block.

**Objective does not exist:** behavior pack not initialized. Confirm it is active and the world loaded.

**Wrong player receives progress:** replace player selectors with `NB_GLOBAL`.

**HR_BOT comparator stays dark:** Block A must be Repeating / Always Active. Comparator rear/input side must touch Block A directly.

**Flag set but no noise reward:** the -3 reward fires only on the first 0 to 1 transition per session.

---

## Appendix F: nb:reset (code deferred)

A planned `nb:reset` command will reset all `NB_GLOBAL` values in one operation. Until implemented, reset individually. Also reset physical puzzle states manually (latched hoppers, gate barriers, consumed items).

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
