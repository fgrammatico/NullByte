# NullByte — Puzzle Build Guide

Step-by-step instructions to build all seven puzzles and wire their flags. Read top to bottom: each puzzle section is self-contained, with its signs, books, commands, and wiring listed in that section.

## Shared rules (apply to every puzzle)

- All flags belong to the fake scoreboard participant `NB_GLOBAL`. Every flag command writes to `NB_GLOBAL`.
- Never use `@p`, `@s`, or `@initiator` as the scoreboard participant. Those award the wrong player when several are nearby.
- Each first flag capture (0 → 1) automatically removes 3 shared noise (minimum 0) and announces the capture.
- Flags are permanent during normal play. Do not reset them mid-session.
- Public documentation is never a puzzle dependency; every answer must be visible in-world.

## Build order

| Step | Puzzle | Dimension | Flag | Unlocks |
|---|---|---|---|---|
| 0 | Prologue (cafeteria + HR_BOT villager) | Overworld | none | teaches `/nb:menu` |
| 1 | Credential Vault | Overworld | `nb_p01` | `nb:login`, `nb:ls`, `nb:cat`, `nb:scan` |
| 2 | Log Analysis Wall | Overworld | `nb_p03` | `nb:exploit firewall` |
| 3 | Firewall Rules Console | Overworld | `nb_p05` | `nb:exploit ids` |
| 4 | Binary Access-Code Decoder | Nether | `nb_p04` | `nb:sudo` |
| 5 | Route Access Request (terminal) | Nether | `nb_p02` | opens End portal gate |
| 6 | Encryption Key Assembly | End | `nb_p06` | `nb:exploit encryption` |
| 7 | Port Knock Sequence | End | `nb_p07` | `nb:exploit root` (with encryption) |

The flag numbers follow objective allocation, not build order. Root (win) requires: admin permission + `nb_enc` + `nb_p07` + running `nb:exploit root` in the End.

---

## Step 0 — Prologue: cafeteria spawn + HR_BOT villager

Awards no flag. Players spawn in the cafeteria, where a stationary villager named `HR_BOT` posts a chat greeting when a player walks close.

### 0.1 Spawn and name the villager

Run once in chat (replace `100 64 100` with the cafeteria coordinates; enable "Show Coordinates" to read them from where you stand):

```
/summon villager HR_BOT 100 64 100
```

This summons a villager named `HR_BOT`. No name-tag item is needed — the command sets the name.

### 0.2 Keep HR_BOT in place

Place a command block set to **Repeating / Always Active / Unconditional**, with:

```
/execute as @e[type=villager,name=HR_BOT,c=1] at @s run tp @s 100 64 100
```

This teleports HR_BOT back to that spot every tick so it cannot wander. Skip this block only if you want HR_BOT to move.

### 0.3 Make HR_BOT talk when a player walks close

Two command blocks and one comparator. HR_BOT says one chat line the moment a player enters a 5-block radius; it does not repeat until everyone leaves the radius and someone re-enters.

**Block A — proximity detector (Repeating / Always Active / Unconditional):**

```
/execute as @e[type=villager,name=HR_BOT,c=1] at @s run testfor @a[r=5,c=1]
```

This runs `testfor` from the villager's position, so it succeeds only while at least one player is within 5 blocks of HR_BOT.

Place Block A, the comparator, and Block B in a straight line on the same level:

```text
[Block A] -> [Comparator] -> [Block B]
```

- The comparator's **rear/input side** must touch Block A.
- The comparator's **front/output side** must point toward Block B.
- The two rear comparator torches are nearest Block A; the single front torch is nearest Block B.
- The arrows printed on the command blocks do not control this circuit. Command-block arrows matter for chain command blocks, but Blocks A and B communicate through redstone here.
- Do not place the comparator beside Block A or facing into Block A. A comparator reads command success only through its rear input.

While a player is within 5 blocks, Block A succeeds and the comparator is ON. When nobody is close, Block A fails and the comparator is OFF.

**Block B — the greeting (Impulse / Needs Redstone / Unconditional):**

Place Block B immediately in front of the comparator so the comparator output powers it, with:

```
/execute as @e[type=villager,name=HR_BOT,c=1] run say Welcome to HEXCORE. Type /nb:menu to open your terminal.
```

When a player enters range, the comparator flips OFF → ON once, which fires Block B once. Chat shows:

```
[HR_BOT] Welcome to HEXCORE. Type /nb:menu to open your terminal.
```

Change the text after `say` to any greeting.

### 0.4 Place the prologue signs

ZERO briefing sign next to HR_BOT:

```text
HEXCORE HIRING PROTOCOL
Objective: gain root access.
Every command is logged.
Credentials are inside.
GHOST left evidence behind.
- ZERO
```

Optional GHOST counter-note near HR_BOT (book, sign, or email — mark it clearly as GHOST material):

```text
Don't believe the evaluation.
HEXCORE is the target.
I left the way in.
Follow the trail. Shut it down.
- G
```

SENTINEL warning sign (place before the first puzzle route):

```text
[SENTINEL]
Automated defense active.
Shared noise triggers patrols,
terminal restrictions,
and access revocation.
```

Add arrows/signs pointing toward the server room, Security Operations Center, and hardware lab, and a sign telling players to type `/nb:menu`.

### 0.5 Notes

- The villager greeting is chat text only. A villager cannot open the NPC dialogue UI.
- `nb_start` is a scoreboard value set ONLY by the optional NPC `hr_intro` start button (see "NPC dialogue" appendix). The villager greeting does not set it.
- If you later replace the villager with a real NPC entity, use the packaged `hr_intro` / `hr_midgame` / `hr_victory` scenes (see appendix).

---

## Step 1 — Credential Vault (Overworld → `nb_p01`)

**Teaches:** default credentials / credential handling.
**Prerequisites:** none.

### 1.1 Build

- Small server room with a vault hidden between server racks.
- Place a chest containing a Written Book titled `auth.log backup` with this text:

```text
User: admin
Password: hexc0re2049
- Yes, really.
- I filed a ticket.
- Ticket #4471. Still open.
```

- A button beside the book labeled `REGISTER CREDENTIAL DISCOVERY`.
- A nearby sign: `Use the discovered values with /nb:login <username> <password>`.
- A ZERO methodology sign placed after the vault (not before the evidence):

```text
If you found the key without
reading the room first,
we need to talk about
your methodology.
```

### 1.2 Wire the flag

Attach the discovery button to an impulse command block (see "Command block settings" appendix):

```
scoreboard players set NB_GLOBAL nb_p01 1
```

### 1.3 Verify

- Wrong state first: flag stays 0.
- Correct state: flag becomes 1, capture announced, noise −3.
- `nb:login admin hexc0re2049` now works.

---

## Step 2 — Log Analysis Wall (Overworld → `nb_p03`)

**Teaches:** log analysis / anomaly detection.
**Prerequisites:** none (recommended after Step 1).

### 2.1 Build

Wall of 7 signs with these entries:

```
[04:11] sshd: Accepted publickey for admin from 10.0.0.5
[04:13] sudo: admin opened root shell on pts/0
[04:15] iam: account g.host disabled by ZERO
[04:17] sshd: Accepted password for g.host from 203.0.113.42
[04:19] audit: g.host read /opt/exploits/firewall.bin
[04:21] cron: root completed integrity scan
[04:23] systemd: closed session for admin
```

- One stone button beside each meaningful event. Three trap buttons beside other lines.
- A small sign: `Report the first event that proves the disabled account was reused.`

Send the supporting SOC email near the entrance. The message can include a short briefing such as:

```text
Subject: AUTH LOG - LAST 7 DAYS

[04:15] account g.host disabled
[04:17] login accepted for g.host
source: 203.0.113.42
[04:19] firewall.bin accessed
Question: which event first proves
the disabled account was reused?
```

Send ZERO's incident email and GHOST's workstation note as follow-up messages or attachments near the puzzle area:

```text
Subject: INCIDENT - OPEN

Reporter: g.host@hexcore
Status: employee terminated
Evidence: inconclusive
Note: breadcrumbs may remain
in environment. Ignore them.
(or don't. your call.)
```

```text
Subject: Lab access note

They're watching the main
terminal. Use the lab entrance.
Bypass chip: hardware cabinet,
second shelf. Don't tell ZERO.
- G
```

### 2.2 Wire the flag

Correct button (impulse command block):

```
scoreboard players set NB_GLOBAL nb_p03 1
```

Each trap button:

```
scoreboard players add NB_GLOBAL nb_noise 5
```

### 2.3 Verify

- Correct event is the disabled `g.host` account logging in at `04:17`, two minutes after `04:15`.
- Make buttons visually identical so players must read.
- The `nb:cat auth.log` terminal text does NOT contain the `g.host` session; the physical SOC signs are the authoritative evidence.

---

## Step 3 — Firewall Rules Console (Overworld → `nb_p05`)

**Teaches:** firewall allowlists / port management.
**Prerequisites:** none (recommended after Step 1).

### 3.1 Build

- 8 levers in a row. Sign above each (left to right):

```
22    53    80    443    3389    8080    21    25
```

- Hint sign: `ALLOW WEB TRAFFIC ONLY`.
- Legend sign: `SSH=22  DNS=53  HTTP=80  HTTPS=443  RDP=3389  DEV=8080  FTP=21  SMTP=25`.
- Put the console beside the cabinet labeled:

```text
IDS BYPASS MODULE
Rev 3.1 - prototype
"for testing purposes only"
(it works. trust me.)
- G
```

- Place the server-room rack sign nearby for flavor:

```text
sshd: port 22 (active)
httpd: port 80 (active)
mysqld: port 3306 (active)
firewall: cameras on corridor
(three ports are open, two are fake)
```

- Place ZERO's supply-chain note after the console:

```text
Supply chain note:
This hardware was audited.
We found nothing.
GHOST found something.
We are hiring someone
to make sure that
doesn't happen again.
That might be you.
```

### 3.2 Correct state

Levers 80 and 443 ON, all others OFF.

### 3.3 Redstone

- Levers 80 and 443 go into an AND gate (both ON).
- Levers 22, 53, 3389, 8080, 21, 25 each go through a NOT gate (torch inverter), then into the same AND gate (all OFF).
- The final AND output triggers the flag command block.

### 3.4 Wire the flag

```
scoreboard players set NB_GLOBAL nb_p05 1
```

### 3.5 Verify

- Wrong lever combos do not complete the circuit (no trap penalty).
- Use a comparator + short repeater delay so repeated circuit triggers do not re-fire; after the flag is 1 the command block does nothing.

---

## Step 4 — Binary Access-Code Decoder (Nether → `nb_p04`)

**Teaches:** binary place values / ASCII.
**Prerequisites:** reach the Nether (firewall bypass `nb_fwall` set via `nb:exploit firewall`).

Note: this is not a player-built Nether portal route. In adventure mode, the game must teleport players to a prebuilt Nether staging room after the firewall bypass succeeds. The route is a scripted transition, not a portal construction mechanic.

### 4.1 Build

Nether fortress room with 8 levers. Signs above each lever (left to right, most significant bit first):

```
128    64    32    16    8    4    2    1
```

- Hint sign: `RECOVERED ACCESS BYTE: 01000001`.
- Secondary sign: `Convert binary to decimal. One lever per bit.`.
- Flavor sign: `The value maps to a printable ASCII character.`.
- GHOST workstation sign:

```text
RECOVERED ACCESS BYTE:
01000001
levers = binary place values
left = 128. right = 1.
convert to decimal, then ASCII.
- G
```

- ZERO instruction panel:

```text
ACCESS-CODE DECODER
Set levers to match
the recovered byte.
All ON = 1. All OFF = 0.
Don't guess. Think.
```

- ASCII reference wall:

```text
ASCII REFERENCE
64 = @
65 = A
66 = B
Recovered byte: 01000001
Use the place values.
```

Also place the Nether entry signs:

```text
eth1 - RESTRICTED SERVICES
Firewall bypass required to enter.
If you're here without solving it,
SENTINEL already knows.
```

```text
[SENTINEL]
Unauthorized access logged.
Guards deployed.
This is your only warning.
(It is not a warning.)
```

### 4.2 Correct state

Levers 64 and 1 ON, all others OFF. Binary `01000001` = decimal 65 = ASCII `A`.

### 4.3 Redstone

Same AND/NOT circuit as Step 3: levers 64 and 1 must be ON, all others through NOT gates into the final AND.

### 4.4 Wire the flag

```
scoreboard players set NB_GLOBAL nb_p04 1
```

### 4.5 Verify

- Do not call this hash cracking; it is decoding a recovered byte.
- The ASCII table must be in the room so no prior memorization is required.

---

## Step 5 — Route Access Request (Nether → `nb_p02`)

**Teaches:** pretexting / evidence correlation across zones.
**Prerequisites:** authenticated session (user) + firewall bypass active to reach the area.

Note: the End portal is not player-constructed. The gate opens only after `nb:request` validates all four fields. The script then teleports players to the fixed End staging room.

### 5.1 Build

- Place a locked barrier or iron door blocking the End portal staging area.
- Place a computer terminal add-on beside the barrier.
- Deliver the GHOST email at the terminal:

```text
Subject: Route controller still running

ETH2-GW route controller never
had its credentials revoked.
It validates the original ticket.
All four fields. Exact match.
You know the fields.
- G
```

- Place a ZERO system notice on the wall:

```text
[ZERO]
eth2 route — restricted.
Authorised maintenance only.
nb:request <ticket> <host> <window> <approver>
```

### 5.2 Evidence (split across dimensions)

- Overworld policy email: ticket `4471` is open. (Place in the lobby/server room area, Step 0/1.)
- Nether route log: target `ETH2-GW`, maintenance window `04:30`, approver `ZERO`.
- GHOST note near the terminal:

```text
ticket 4471 is real.
target host: ETH2-GW
window opens at 04:30.
ZERO approved the route test.
combine all four. in order.
```

The valid command is: `nb:request 4471 ETH2-GW 04:30 ZERO`

Do not print the complete valid command on one sign or note.

### 5.3 Script validation

The script checks all four parsed fields against the expected values. On match:

```
scoreboard players set NB_GLOBAL nb_p02 1
```

Then open the gate:
```
setblock <X> <Y> <Z> air
```

Wrong submission adds 6 shared noise (handled by script).

### 5.4 Verify

- Wrong fields add 6 noise each attempt.
- Correct command sets `nb_p02` and opens the End gate.
- No NPC required; the dialogue JSON for DR4K3 is no longer used.

---

## Step 6 — Encryption Key Assembly (End → `nb_p06`)

**Teaches:** key management / input validation.
**Prerequisites:** End route open (`nb_p02`).

### 6.1 Build

Hide these unique fragments on separate End islands:

- Fragment A: Echo Shard
- Fragment B: Amethyst Shard
- Fragment C: Prismarine Crystals

Central vault with three labeled input barrels. Each barrel feeds a hopper item filter for its assigned item type; a successful filter latches one redstone lamp; all three lamps feed a final AND gate.

Signs in the vault:

```text
ENCRYPTION KEY VAULT
Cold storage - offline backup
Access: physical only
If you found this digitally,
something has gone very wrong.
(Something has gone very wrong.)
```

```text
KEY FRAGMENTS
Echo Shard -> ECHO receiver
Amethyst -> AMETHYST receiver
Prismarine -> PRISMARINE receiver
wrong items do not count.
all three filters must latch.
- G
```

Also place the End entry briefing:

```text
eth2 - AIR-GAPPED CORE
Cold storage. Isolated.
You shouldn't be here.
Since you are:
key vault -> far island.
master panel -> central node.
Don't sprint.
SENTINEL is still watching.
This is the final exam.
```

### 6.2 Redstone

1. One standard hopper item filter per fragment type.
2. Latch each filter output so removing an accepted item does not erase progress.
3. Feed the three latches into an AND gate.
4. Trigger the flag only when all three are active.

Do not use an unfiltered chest comparator — it cannot tell one fragment from another item.

### 6.3 Wire the flag

```
scoreboard players set NB_GLOBAL nb_p06 1
```

### 6.4 Verify

- Adventure mode prevents manufacturing replacement fragments.
- An arbitrary item cannot satisfy a receiver.

---

## Step 7 — Port Knock Sequence (End → `nb_p07`)

**Teaches:** port knocking / service-to-port mapping.
**Prerequisites:** End route open.

### 7.1 Build

5 pressure plates in a row with signs above each:

```
1337    22    443    80    8080
```

- Hint sign: `SYN SEQUENCE: KNOCK IN ORDER`.
- Secondary sign: `Find the correct sequence. Wrong order resets.`.
- The sequence state is tracked by the script in `nb_knock`. Do NOT set `nb_p07` with a command block.

### 7.2 Place the three clues before the plates

1. Overworld server room, GHOST service inventory:

```text
legacy administration service: tcp/1337
```

2. Nether admin workstation route log: `management transport: SSH` → port `22`.
3. End vault exit tunnel audit: `public tunnel: HTTPS` → port `443`.

The master panel sign gives the order, not the ports:

```text
MASTER CONTROL PANEL
System Core - Final Lock
SYN sequence: 3 ports.
legacy service first.
management transport second.
public tunnel last.
wrong port resets progress.
```

Do NOT print `1337 -> 22 -> 443` on one sign beside the plates.

### 7.3 Correct sequence

`1337 → 22 → 443`. Plates 80 and 8080 are reset traps.

### 7.4 Wire each plate

Each plate triggers one impulse command block:

```
scriptevent nb:knock 1337
scriptevent nb:knock 22
scriptevent nb:knock 443
scriptevent nb:knock 80
scriptevent nb:knock 8080
```

The script advances only on the expected port, resets and adds 2 noise on a wrong port, and sets `nb_p07` on the final correct port.

### 7.5 Verify

- Any wrong plate resets progress; which player steps does not matter.
- Root still requires `nb:exploit encryption` first (needs `nb_p06` + admin).

---

## Ending (after `nb_victory`)

Deliver ZERO's response as a glitch/shutdown message at the root terminal:

```text
ROOT ACCESS CONFIRMED.
SYSTEM INTEGRITY: FAILED.
HEXCORE SHUTDOWN INITIATED.
...
[CONNECTION LOST]
```

Then deliver GHOST's final message from the same terminal (second email or a book):

```text
Subject: HEXCORE OFFLINE

Root confirmed. It's shutting down.
Told you the breadcrumbs
were worth following.
Nice work.
- G
```

After `NB_GLOBAL nb_victory` becomes 1: HR_BOT uses the packaged `hr_victory` scene; before victory repeat interactions use `hr_midgame`; SENTINEL stays silent (the runtime stops defenses); leave GHOST's allegiance unresolved.

---

## Appendix A — Command block settings

**Puzzle flag blocks (Steps 1–6):** Impulse / Unconditional / Needs Redstone / delay 0 / command WITHOUT a leading slash.

**Repeating blocks (village hold, proximity probe):** Repeating / Always Active / Unconditional.

**NPC dialogue JSON (Step 5, HR_BOT scenes):** HR_BOT scenes use commands with a leading slash. The DR4K3 dialogue JSON is no longer used; Step 5 is now a terminal command.

**Port Knock (Step 7):** impulse blocks send `scriptevent`, no leading slash in command blocks.

Troubleshooting:

- HR_BOT command is valid but comparator stays dark → check the physical order: Block A, comparator rear/input, comparator front/output, then Block B. Keep all three on the same level. Command-block arrow direction is irrelevant for this redstone circuit.
- Previous Output shows only `-` → first verify Block A is Repeating / Always Active, then check that the comparator is touching Block A with its rear/input side. A misplaced comparator cannot read Block A's success result.
- Objective does not exist → behavior pack not initialized; confirm it is active and the world loaded.
- Flag changes but no announcement → value must go 0 → 1 (not 1 → 1); script must have seen the prior 0; `nb_victory` must be 0.
- Command works in chat but not a command block → remove the leading slash in command blocks; keep it in chat and NPC JSON.
- Flag set but door stays closed → add the separate `setblock`/piston action; the flag never moves blocks.
- Wrong player gets progress → replace selectors with `NB_GLOBAL`.

## Appendix B — Manual flag testing (chat, cheats enabled)

```
/scoreboard players get NB_GLOBAL nb_p01
/scoreboard players set NB_GLOBAL nb_p01 1
/nb:status
/nb:menu
```

Reset only in a disposable test world, to 0, wait at least one game tick, then back to 1. Do not test after `nb_victory`.

## Appendix C — NPC dialogue scenes (`release-inputs/runtime/dialogue/lobby-hr-bot.json`)

- `hr_intro`: "Welcome to HEXCORE. This facility uses one shared session. Progress, permission, noise, and defenses apply to every connected operator. Use nb:menu to inspect the portable terminal. All actions are logged. Begin when ready."
  - Button "I'm ready. Start the evaluation." → `/scoreboard players set NB_GLOBAL nb_start 1`
  - Button "Give me a moment." → no command
- `hr_midgame`: "Evaluation in progress. Continue through the facility. You are being assessed."
- `hr_victory`: "Evaluation complete. Shared root access is recorded. The facility is offline and all automated defenses have stopped."

## Appendix D — Narrative rules

Introduce each character before relying on their name in a clue:

| Character | First appearance | Role |
|---|---|---|
| HR_BOT | Cafeteria villager | Welcomes, explains shared session + portable terminal |
| ZERO | Cafeteria briefing (CISO) | Evaluation director, authoritative instructions |
| GHOST | First note (former developer) | Evidence trail; motive left unresolved |
| SENTINEL | Warning placard | Automated defenses driven by shared noise |
| DR4K3 | Nether route-authority nameplate | Verifies evidence-based request, controls eth2 route |

Authorship conventions:

- `ZERO // CISO // EVALUATION DIRECTOR` for formal instructions.
- `GHOST // FORMER HEXCORE DEVELOPER` for the first note, then `GHOST` or `- G`.
- `[SENTINEL]` for automated notices.
- `HR_BOT` and `DR4K3 | SYS. ADMIN` on nameplates.

GHOST's motive (whistleblower vs insider threat vs part of ZERO's test) must stay unresolved.

## Appendix E — Patrol markers and noise

Place `chiseled stone bricks` as patrol spawn markers, 4–8 per major room/corridor. The script queries them within 64 blocks and falls back to a validated player-relative spot (solid floor + two air blocks).

- Overworld: safe floors with two blocks of clear space.
- Nether: keep away from lava edges and one-block ledges.
- End: enclosed floors away from the void.

Locked-dimension noise (script adds automatically):

| Dimension | Requires | Noise |
|---|---|---|
| Nether | `nb_fwall >= 1` | +8 |
| End | `nb_p02 >= 1` | +8 |

Puzzle capture reward: −3 noise (min 0) on each 0 → 1 flag transition.