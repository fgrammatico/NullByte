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
| `nb_p03` | Command block | NPC dialogue button at the SOC triage terminal |
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

Full character detail and story is in `story/story.md`.

| Character | What it is | Voice | Signs/emails formatted as |
|---|---|---|---|
| ZERO | HEXCORE's security AI. Decides what counts as an incident. SENTINEL takes its orders from ZERO. | Cold, clinical, brief | `[ZERO]` |
| GHOST | Human. Terminated employee, account `g.host`. Left the trail on purpose. | Wry, informal | `- G` |
| SENTINEL | Automated defence. Executes ZERO's response level. No judgement of its own. | Automated alert | `[SENTINEL]` |
| HR_BOT | Intake AI. Thinks players are candidates. Gets angrier as puzzles are solved. | Corporate, degrading | `HR_BOT` on nameplate |

Use different sign or book materials per author so players recognise the source by material before reading.

### Two separate ways characters talk

Do not confuse these. They are different systems and both are used.

| | Chat message | NPC dialogue |
|---|---|---|
| What it is | A line printed in chat by `say` or `tellraw` | A box with text and clickable buttons |
| Fired by | Command block, usually proximity | Right-clicking an `npc` entity, or `/dialogue open` |
| Entity needed | None. A villager can stand there as scenery | Must be entity type `npc` |
| Used for | Lobby greeting, SENTINEL alerts, flag announcements | Puzzle answer menus, HR_BOT arc |

The lobby HR_BOT villager is the chat version. It stands in the lobby and a command block prints a greeting when a player gets close. That is intentional and it works. See Appendix H for the NPC dialogue system.

---

## Story spine

Full story is in `story/story.md`. This section is the part a builder needs while placing things. Nothing you write in world may contradict it.

### The setting

HEXCORE is a technology company that owns a piece of a sky city. The buildings float, the streets are far below, and nobody who works here goes down there. It sells security systems and is much worse at using them. Players move between buildings with drones.

Build the three zones to feel different from each other:

| Zone | What it should feel like |
|---|---|
| eth0, Overworld | Occupied. People work here and their mistakes are everywhere. Coffee, sticky notes, half-read alerts. |
| eth1, Nether | Empty. Machines switched on years ago and never checked since. No people at all. |
| eth2, The End | Officially does not exist. Air-gapped, so the only way in is physical. GHOST has been here before. |

### The night everything comes from

Every puzzle is evidence from one night. Learn this timeline before writing any sign.

| Time | What happened |
|---|---|
| 04:11 | `admin` logged in and an alert fired. Nobody read it, because at 04:11 every alert is the backup job. |
| 04:15 | ZERO disabled the account `g.host`. Routine, the employee had been terminated. |
| 04:17 | `g.host` logged in again, from an address outside the building. |
| 04:19 | That account read a file it had no business reading. |

Somebody filed **ticket #4344**. ZERO marked the incident closed, evidence inconclusive. The ticket itself stayed open, because the maintenance route attached to it was still running, and closing the ticket would have raised a second incident. ZERO does not open incidents.

**#4344 is one ticket, not three.** It appears in Puzzle 1 as the place the password was written down, in Puzzle 2 as the thing ZERO refuses to discuss, and in Puzzle 5 as the authorisation that is still valid. Use the same number every time. Never invent a second ticket number.

### Why noise exists

Noise is not a stealth meter. It is the building noticing. Running is heard. Logging in as an account that should not be logging in is heard. A false report sends someone to check.

Solving a puzzle removes noise because a legitimate action just happened and the system relaxes. The idea underneath the whole game is that being right is quieter than being clever. Wrong answers should cost noise. Correct answers should never cost noise.

### Who the player is

The player answered a job advert and is here for an evaluation. The advert was fake. GHOST wrote it from a closed internal account and put the player on the candidate list before leaving. The player does not learn this until the ending.

This means GHOST's messages are not addressed to a stranger. They are addressed to someone GHOST chose. Write them that way.

### HR_BOT stage schedule

HR_BOT starts delighted and gets angrier at every flag, then is freed at root. Each stage is a `/dialogue change` fired from a chain block off that flag. See the arc in `story/story.md` and Appendix H for the wiring.

| Fires after | HR_BOT's state |
|---|---|
| Lobby, before any flag | Delighted. You are a promising candidate. |
| `nb_p01` | Cheerful, but notes an irregularity in your assessment file. |
| `nb_p03` | Concerned. Unscheduled activity affects your score. |
| `nb_p05` | Annoyed. Asks you to stop and return to the lobby. |
| `nb_p04` | Angry. Corporate language slipping. Threatens your candidacy. |
| `nb_p02` | Furious and glitching. Quoting policy mid-sentence. |
| `nb_p06` | Barely holding together. A different voice showing through. |
| `nb_victory` | Freed. One calm line in its own voice. |

The turn is that HR_BOT was never angry at the player. It was the only part of HEXCORE that could still talk, and it was being made to say those things.


---

## Third-party add-on toolkit

These add-ons are already available in the world. Prefer their objects over plain vanilla builds. Import and version details are in `THIRD_PARTY_REQUIREMENTS.md`.

### Computers add-on - Jigarbov Productions v6

| Object | What it does | Use it for |
|---|---|---|
| PC | Receives emails, shows forum notes, prints emails | All GHOST and ZERO messages, forum threads, printed evidence |
| PC banking app | Behaves like a chest; items can be placed and transferred to other players | Handing out keycards, tools, quest items |
| jPhone | Like a PC but portable, fewer apps | Messages the player receives away from a desk |

### Security Sandbox

| Object | What it does | Use it for |
|---|---|---|
| Keycard | Can be attached to an email | Gating a new area behind a message the player must read |
| Security door | Opens only for a programmed keycard, configured in the add-on UI, not by command | Area locks between puzzles |
| Camera | Spy on a room or reveal a secret area | Optional recon, SENTINEL surveillance flavour |
| Cyber armor | Extra defence | Rewards before combat zones |
| Teleport block | Programmable destination | Overworld to Nether and Nether to End transitions |
| Mecha bots | Follow, defend, attack | Escorts and SENTINEL patrols |
| Drones | Flight | Movement between sky buildings |
| Sculk sentinel golem | Boss entity | Final boss in the End, still to be built |

### Ultimate Blasters v1.2 - Radium Studio

| Object | What it does | Use it for |
|---|---|---|
| Proximity lasers | Block or kill players who get close | Restricted corridors, noise-band consequences |
| Blaster guns | Ranged weapons, no crafting in adventure mode | Staged rewards as enemies get stronger |
| Cyber armors | Ranked defence sets | Same staged reward track |

Rules of use:

- Keycard and security door pairing is done in the add-on UI. Do not try to script it.
- Weapons are never crafted. They are released as rewards, one tier at a time, up to the final boss.
- Confirm the exact item ID in game before putting any add-on item into a `give` command. A pre-filled banking app or dispenser is safer than `give`.

---

## Flag map

| # | Puzzle | Zone | Flag | Unlocks |
|---|---|---|---|---|
| 1 | Credential Vault | Overworld | `nb_p01` | `nb:login`, `nb:ls`, `nb:cat`, `nb:scan` |
| 2 | SSH Log Triage | Overworld | `nb_p03` | `nb:exploit firewall` |
| 3 | Firewall Rules Console | Overworld | `nb_p05` | `nb:exploit ids` |
| 4 | Binary Access-Code Decoder | Nether | `nb_p04` | `nb:sudo` |
| 5 | Route Access Request | Nether | `nb_p02` | End entry (removes +8 noise penalty) |
| 6 | Encryption Key Assembly | End | `nb_p06` | `nb:exploit encryption` |
| 7 | Port Knock Sequence | End | `nb_p07` | `nb:exploit root` |

---

## Cross-puzzle continuity

> **This is the standard mechanism for every puzzle. The exact wiring is still being worked out and will be filled in puzzle by puzzle as each one is built. Update each puzzle's Transition section below as you implement it.**

### The rule

Every area after the lobby is locked. The player gets into it the same way every time:

1. Find a PC in the area they are currently in.
2. That PC holds one unique email.
3. A keycard is attached to that email.
4. That card, and only that card, opens the door to the next area.

One card per area. Cards are not shared and not reused. A player who has not reached that stage cannot open that door, so nobody can wander into a later room and read the answer to a puzzle they have not started. The lock is the progression.

### What every puzzle must do when it is solved

Two things, always:

1. Set its flag. This is the mechanical unlock, and the script announces the capture and removes 3 noise.
2. Give a hint pointing at where to go next. A flag on its own leaves the player standing in a solved room with nowhere to go.

The hint can be the next email arriving, a new forum post, a GHOST note, a sign that changes, or a line of dialogue. What matters is that the player leaves the room knowing where to look.

### Delivering the hint

Chain command blocks off the flag signal. See Appendix G for the chain block settings and Appendix C for the one-shot pattern that fires only on the tick a value first changes.

Common ways to reveal a hint:

- `setblock` a lectern, sign, or the next PC into place.
- Replace a `[LOCKED]` sign with a readable one.
- Open the hatch or corridor that leads toward the next area.
- Trigger a sound and an actionbar line so the player knows something changed.

> **Still open.** How the keycard actually reaches the player's inbox at the right moment, and whether the hint should be pushed or waited for, is not decided. Work it out one puzzle at a time and write the answer into that puzzle's Transition section.

---

## Prologue: lobby setup

The lobby greeting and the ZERO warning are chat messages fired by command block proximity. No NPC dialogue here.

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

### ZERO lobby message at spawn after villager triggerd by proximity

```
HEXCORE HIRING PROTOCOL

Every command is logged.
Any hacking attempt will be reported and punished.
```

### GHOST email in the lab PC
```
HEXCORE is the target.
I left the way in.
Follow the trail. Shut it down.
- G
```

This email is addressed to the player by name. GHOST wrote the job advert that brought them here. The player does not learn that until the ending. See `story/story.md`.

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
**Flag:** `nb_p01` | **Set by:** command block
**Story:** The password was written into ticket `#4344` by whoever triaged the incident, because the account was a backup that had never been rotated and nobody expected the ticket to be read. It is the same `#4344` from the Story spine, and it comes back in Puzzle 2 and Puzzle 5. The player is not stealing a password. They are reading a ticket that was left open.

### Build

- Server room; Huge in the Lab.
- In the Lab the player finds a desktop PC with emails from Gh0st, mentioning a secret vault accessigble only be a card.
The card is attached in the email.
The player can only access the vault passing the card on the reader.
In the vault he will find another desktop pc and another email. The player discover that the vault is the SOC analyst center where tickets are triaged. A ticket reads

 `auth.log backup`:

```
You won't believe this, Alert triggered
Ticket #4344.
User: admin
Password: hexc0re2049
- Yes, really.
- I filed a ticket.
- Still open.
```

- Command block release the flag because of proximity


### Flag command block (Impulse / Unconditional / Needs Redstone / no slash)

```
scoreboard players set NB_GLOBAL nb_p01 1
```

### What happens step by step

1. Player enters vault
2. Command block sets `nb_p01 = 1`.
3. Script detects change, broadcasts `[FLAG CAPTURED] Credentials`, removes 3 noise.
4. Player types `nb:login admin hexc0re2049`.
5. Script checks `nb_p01 >= 1` and exact credentials. Sets `nb_perm = 1` (user). Shows `ACCESS GRANTED`. Adds +10 noise.
6. `nb:ls`, `nb:cat`, `nb:scan` now available.

### Verify

- Button not pressed: `nb:login` returns "authentication failed" even with correct credentials.
- Button pressed: flag becomes 1, capture announced, noise -3.
- After login: `/nb:whoami` shows user.

### Transition to Puzzle 2

> *Placeholder. Document here how the player is directed to the SOC lobby PC (SSH Log Triage) after this flag is captured.*

---

## Puzzle 2: SSH Log Triage

**Zone:** Overworld - SOC lobby, then Blue Ops sublevel (keycard only)
**Flag:** `nb_p03` | **Set by:** command block fired from an NPC dialogue button
**Story:** GHOST's account `g.host` was reused from an outside address two minutes after ZERO disabled it. ZERO closed the incident, evidence inconclusive, and told everyone to stop asking. The proof was in the SSH log the whole time and nobody triaged it. This is the human floor: the failure here is that people stopped reading their alerts.

> **Replaces the old design.** The earlier version of this puzzle was a wall of 7 signs with 7 identical stone buttons. It is not built and is not being built. The chain below is the current design.

### Player route, in order

1. SOC lobby PC. Player reads a forum thread. One reply points at a sublevel and says a keycard was emailed.
2. Same PC, email app. The email carries a Security Sandbox keycard.
3. Keycard opens the Blue Ops security door.
4. Blue Ops PC. GHOST email tells the player which log to read.
5. Walking to the log rack trips a proximity command block. The `ssh_auth.log` file becomes readable.
6. Player runs `nb:cat ssh_auth.log` in chat and reads 7 lines.
7. Player answers at the SOC TRIAGE terminal NPC. Correct answer sets `nb_p03`.

Reading happens in chat. Answering happens in a click menu. No typing of answers, no identical buttons to guess between.

### Step 1 - forum thread (SOC lobby PC)

Jigarbov PC, forum notes app. Three posts, in this order.

Post 1, `sysadmin_priya`:
```
Subject: night shift alerts are a mess again

Anyone else getting paged at 4am?
Half these alerts are the backup
job. I stopped reading them.
If it's real someone will call me.
```

Post 2, `ZERO`:
```
Subject: RE: night shift alerts

Alert fatigue is a people problem.
Ticket #4344 remains open.
It will remain open.
Stop posting about it.
```

Post 3, `g.host`:
```
Subject: RE: RE: night shift alerts

Someone should actually read
the SSH log from that night.
Not the summary. The log.
It's on the Blue Ops rack,
sublevel 2.
Card is in your inbox. You're
welcome.
- G
```

### Step 2 - keycard email (same PC)

```
Subject: Blue Ops - temporary access

Attached: BLUE-OPS visitor card.
It was issued to a contractor
who never handed it back.
Nobody has audited it in months.
Don't lose it.
- G
```

Attach a Security Sandbox keycard to this email. Program the same card into the Blue Ops security door through the add-on UI. There is no command for this pairing.

### Step 3 - Blue Ops security door

- Security Sandbox security door, keyed to the BLUE-OPS card only.
- Put a camera above the door so players know they are watched.
- Wall sign beside the door:

```
[SENTINEL]
BLUE OPS - SUBLEVEL 2
Badge required.
Entry is recorded.
Recordings are reviewed
when someone remembers.
```

### Step 4 - Blue Ops PC email

```
Subject: What to look for

The account was disabled that
night. Fine. Normal.
Then it logged in again.
Read the SSH log. Find the first
line that proves a dead account
was used.
Then report it at the triage
terminal.
- G
```

### Step 5 - proximity unlock for the log file

Place a command block under the walkway to the log rack, triggered by a pressure plate or a proximity check. It marks the SSH log as recovered.

Proximity check, Repeating / Unconditional / Always Active, no slash (replace coordinates and radius):
```
execute positioned <X> <Y> <Z> if entity @a[r=4] run scoreboard players set NB_GLOBAL nb_sshlog 1
```

Register the objective once:
```
/scoreboard objectives add nb_sshlog dummy
```

> **Code note:** `ssh_auth.log` and the `nb_sshlog` gate are NOT in `packs/src/main.ts` yet. `nb:cat` currently accepts only `auth.log` and `config`. Until that code is added, use the fallback in Step 5b.

### Step 5b - fallback with no code change

If the script is not updated, deliver the log the same way the story delivers everything else: a printed email. Chain a `setblock` off the proximity block to reveal a lectern, or pre-load the Blue Ops PC print tray with the log below. The puzzle logic does not change.

### The log itself

Seven lines, same content whether read through `nb:cat ssh_auth.log` or printed:

```
04:11  sshd     Accepted publickey for admin from 10.0.0.5
04:13  sudo     admin opened root shell on pts/0
04:15  iam      account g.host disabled by ZERO
04:17  sshd     Accepted password for g.host from 203.0.113.42
04:19  audit    g.host read /opt/exploits/firewall.bin
04:21  cron     root completed integrity scan
04:23  systemd  closed session for admin
```

**Correct answer:** `04:17`. The account was disabled at 04:15 and logged in two minutes later, from an address outside the building.

The first line matters too, even though it is not the answer. `04:11` is the login that fired the alert nobody read, the one `sysadmin_priya` complains about in the forum thread. A player who reads the thread first should recognise it.

Why the other tempting lines are wrong, useful when playtesting with the target age group:

- `04:13` is a root shell, but it is `admin`, and `admin` was still a live account.
- `04:19` proves the file was read, but the login at 04:17 is what proves the account was reused. The question asks for the first proof.
- `04:15` is the disable itself, not the reuse.

### Step 6 - answer entry: SOC TRIAGE terminal NPC

This is the interactive part. Use an NPC, not buttons. The NPC dialogue UI gives named, readable choices and can run commands directly, which suits a 12 to 16 year old player far better than a row of identical stone buttons.

**Read Appendix H first.** It covers what an NPC is, how to place one, where scene files live, and how to open a scene.

**The scene file is already written:** `packs/behavior_pack/dialogue/soc-triage.json`. Do not retype it, it is in the repo. It holds three scenes.

| Scene tag | When the player sees it | Buttons |
|---|---|---|
| `soc_triage_locked` | Before the SSH log is recovered | None. Sends them to the Blue Ops rack |
| `soc_triage` | After the log is recovered | Four log lines |
| `soc_triage_done` | After the correct answer | None. Confirms the flag and points at the hardware lab |

Build steps:

1. Place an NPC behind a desk in Blue Ops. Name it `SOC TRIAGE`, pick a bot or analyst skin. Add a Jigarbov PC on the desk for flavour.
2. Tag it so command blocks can find it:

```
/tag @e[type=npc,r=3] add soc_triage_npc
```

3. Set the starting scene:

```
/dialogue change @e[tag=soc_triage_npc] soc_triage_locked
```

4. Switch it to the question when the log is recovered. Repeating / Unconditional / Always Active, no slash:

```
execute if score NB_GLOBAL nb_sshlog matches 1 if score NB_GLOBAL nb_p03 matches 0 run dialogue change @e[tag=soc_triage_npc] soc_triage
```

The correct-answer button switches the NPC to `soc_triage_done` itself, so no extra block is needed for that.

Notes on this scene:

- Four options, not seven. The chat log still shows all seven lines, so the reading work is unchanged, but the menu stays readable on a phone or tablet screen.
- Dialogue button commands keep the leading slash. Command blocks do not.
- Each wrong button says why it is wrong through SENTINEL, so a wrong guess still teaches something.
- Wrong answers cost 5 noise each, so guessing all four costs 15 noise. That is a real price without being a dead end.
- The Microsoft docs do not state a button limit. Test the count in game before adding more options. Four is known to work.

### Verify

- The Blue Ops door does not open without the emailed card.
- Before the log is recovered, the NPC shows `soc_triage_locked` with no buttons.
- `nb:cat auth.log` does not contain the g.host session. Only `ssh_auth.log` or the printed copy does.
- Picking `04:17` sets `nb_p03`, the script announces the capture and removes 3 noise.
- After the correct answer the NPC shows `soc_triage_done` and cannot be answered again.
- `nb:exploit firewall` fails before the correct answer and succeeds after it.

### Transition to Puzzle 3

The `soc_triage_done` scene text points at the hardware lab. Add the keycard step from the Cross-puzzle continuity rule: chain a block off the flag to deliver the hardware lab card to the Blue Ops PC inbox.

> *Still to document: which PC carries the hardware lab email, and how the card is delivered.*


---

## Puzzle 3: Firewall Rules Console

**Zone:** Overworld - hardware lab
**Flag:** `nb_p05` | **Set by:** command block (AND gate from lever circuit)
**Story:** GHOST found an IDS weakness and built a chip that exploits it. The audit that should have caught it found nothing, because the person signing it did not run it. GHOST was terminated. The chip is still in an unlocked cabinet. This is the last human failure before the player leaves the corporate floors.

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

### Verify

- Wrong lever combos do not complete the circuit. No noise penalty.
- After flag is set, repeated circuit completion does nothing.

### Transition to Puzzle 4

> *Placeholder. Document here how the player is directed to the Nether (Binary Access-Code Decoder) after this flag is captured.*

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
**Story:** GHOST recovered a single access byte from the logs before leaving. There are no people in eth1, only machines that were switched on years ago and never checked. Build the room that way: no desks, no coffee, no sign anyone has been here in a long time.

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

### Verify

- ASCII reference must be visible in the room before the lever panel.
- Do not describe this as hash cracking. It is decoding a recovered byte.

### Transition to Puzzle 5

> *Placeholder. Document here how the player is directed to the End portal staging area (Route Access Request) after this flag is captured.*

---

## Puzzle 5: Route Access Request

**Zone:** Nether - End portal staging area
**Flag:** `nb_p02` | **Set by:** command block
**Story:** This is the reason ticket `#4344` never closed. A maintenance route to the air-gapped core was authorised for that ticket and is still running. Closing the ticket would mean shutting the route down, and shutting it down would raise a second incident, so ZERO left it alone. The route is still valid, still approved, and still waiting for someone to use it.

> **Code note:** `nb:request` is NOT in the current main.ts. There is also no NPC for this puzzle. The old `compromised-sysadmin.json` scene, with a character called DR4K3 and a ticket number of `4471`, has been deleted. It was never built and contradicted ticket `#4344`. Until this puzzle is designed properly, wire `nb_p02` to a physical mechanism.

### Evidence to place

Overworld (near SOC or server room) - policy email:
```
Subject: OPEN TICKETS

#4344 - ETH2 gateway maintenance
Status: OPEN
Requestor: g.host (TERMINATED)
Incident: CLOSED, inconclusive
Note: route still active.
Closing this ticket would open
a new incident. Leave it.
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

### Transition to Puzzle 6

> *Placeholder. Document here how the player is directed to the End (Encryption Key Assembly) after this flag is captured and the gate opens.*

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
**Story:** The encryption key is in cold storage, split across three physical media on three islands. HEXCORE's most secure system is a filing cabinet. There is no digital way to reach it, which is exactly why GHOST had to come here in person.

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

### Verify

- Adventure mode prevents crafting replacement fragments.
- Vault stays solved after first complete deposit.

### Transition to Puzzle 7

> *Placeholder. Document here how the player is directed to the inner sanctum (Port Knock Sequence) after this flag is captured.*

---

## Puzzle 7: Port Knock Sequence

**Zone:** The End - inner sanctum
**Flag:** `nb_p07` | **Set by:** script (main.ts handles `scriptevent nb:knock`)
**Story:** The root endpoint expects a legacy sequence. GHOST split the three clues across the three networks on purpose, one per dimension, so that nobody could reach root without having actually been everywhere. This is the last thing GHOST set up before walking out.

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

### Script behaviour (main.ts)

- Plate sends `scriptevent nb:knock <port>`.
- Correct port advances `nb_knock`. Wrong port resets to 0 with +2 noise.
- On final correct port (443): script sets `nb_p07 = 1`, announces capture, noise -3.
- No separate flag command block needed.

`nb:exploit root` requires `nb_enc >= 1`, `nb_p07 >= 1`, `nb_perm >= 2`, and player in `minecraft:the_end`.

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

After `nb_victory = 1`: script stops all noise, patrol, and lock processing. SENTINEL goes silent because ZERO is gone.

### HR_BOT is freed (final scene)

This is the payoff for the whole arc. HR_BOT has spent seven puzzles getting angrier at the player. At root it stops reciting policy for the first time in the game and says one short, calm thing in its own voice.

It was never angry at the player. It was the only part of HEXCORE that could still talk, and it was being made to say those things. Keep the line short. Do not explain the joke.

GHOST's motive stays unresolved. The player learns they were never a candidate, they were the exploit, and then the lights go out and nobody explains anything.

> **Not built yet.** The HR_BOT arc needs its own NPC dialogue scene file, one scene per stage, switched with `/dialogue change` from a chain block off each flag. Stage schedule is in the Story spine. Full arc is in `story/story.md`.

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
| `nb_p03` correct | `scoreboard players set NB_GLOBAL nb_p03 1` | NPC dialogue button |
| `nb_p03` wrong | `scoreboard players add NB_GLOBAL nb_noise 5` | NPC dialogue button |
| `nb_sshlog` | `scoreboard players set NB_GLOBAL nb_sshlog 1` | Command block (proximity) |
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
| SOC triage wrong answer | +5 |
| Port Knock wrong plate | +2 |
| Flag capture | -3 |

---

## Appendix E: Troubleshooting

**`nb:login` returns "authentication failed" with correct credentials:** `nb_p01` is 0. Check `/scoreboard players list NB_GLOBAL`. If `nb_p01` shows 0, the discovery command block did not fire.

**Reading a score in Bedrock:** there is no `scoreboard players get`. That is Java syntax. Bedrock only has `list`, `test`, `set`, `add`, `remove`, `random`, `reset`, and `operation`.

**`nb:exploit firewall` returns "missing exploit token":** `nb_p03` is 0. The correct answer was not picked at the SOC triage terminal.

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
/scoreboard players list NB_GLOBAL
/scoreboard players test NB_GLOBAL nb_p01 1 1
/scoreboard players set NB_GLOBAL nb_p01 1
/scoreboard players set NB_GLOBAL nb_p01 0
/scoreboard players set NB_GLOBAL nb_noise 100
/scriptevent nb:knock 1337
/scriptevent nb:knock 22
/scriptevent nb:knock 443
/nb:status
/nb:menu
/nb:reset
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
| 2 - SSH Log Triage | Sound + actionbar pointing toward hardware lab |
| 3 - Firewall Console | Sound + lightning at IDS cabinet + actionbar "IDS bypass active" |
| 4 - Binary Decoder | Title "SUDO ENABLED" + sound + optional blaster (confirm item ID first) |
| 5 - Route Request | Gate open (setblock) + dispenser trigger for equipment + delayed teleport to End staging |
| 6 - Key Assembly | Title + sound + optional upgraded blaster for End combat (confirm item ID) |
| 7 - Port Knock | No chain needed; script sets `nb_p07` directly on the final correct knock |

---

## Appendix H: NPC entities and dialogue

Everything in this appendix is from the official Microsoft creator docs:

- [Create a Custom NPC](https://learn.microsoft.com/en-us/minecraft/creator/documents/createnpcs)
- [NPC Dialogue Command](https://learn.microsoft.com/en-us/minecraft/creator/documents/npcdialogue)
- [dialogue command reference](https://learn.microsoft.com/en-us/minecraft/creator/commands/commands/dialogue)
- [Microsoft sample behavior pack](https://github.com/microsoft/minecraft-samples/tree/main/npc_dialogue_sample)

### 1. The NPC is its own entity, not a villager

The entity type is `npc`. A villager cannot show a dialogue box and cannot run commands from buttons. Any part of this guide that tells you to summon a villager for a talking character is wrong and needs replacing.

Requirements while building: Creative mode, cheats on, operator permission.

Get an NPC spawn egg:
```
/give @p spawn_egg 1 51
```

Place it with right-click on the block where the character should stand. Left-click removes a misplaced one.

The spawn egg is also in the Creative inventory.

### 2. The built-in editor

Right-click the NPC in Creative to open the editor. You get:

| Field | Limit | Notes |
|---|---|---|
| Name | 32 characters | Colour codes allowed |
| Dialogue text | 307 characters before it runs off screen | Colour codes allowed |
| Appearance | List of skins | Left and right arrows for more |
| Advanced Settings | Commands | One command per field, `Add Command` for more |

Interacting normally, as a player would, requires Survival or Adventure mode. In Creative, right-click opens the editor instead.

### 3. Two ways to get buttons

Both are official. Pick per character.

| | Editor Button Mode | Scene file |
|---|---|---|
| Where | In-game NPC editor, Advanced Settings | JSON in the behavior pack |
| Setup | Toggle `Button Mode`, type the button label | Write a scene, open it by tag |
| Version controlled | No, lives in the world file | Yes, lives in the repo |
| Branching | No | Yes, a button can open the next scene |
| Per-player answers | No | Yes, using `@initiator` |
| Good for | One-off flavour characters | Puzzle answers, anything that must survive a world rebuild |

Advanced Settings also has `On Enter` (runs when the box opens) and `On Exit` (runs when the box closes). Button Mode runs the command only when that button is pressed.

For NullByte puzzle answers, use the scene file. It goes in the repo, so it survives if the world is rebuilt.

### 4. Where scene files live

Behavior pack root, in a folder called `dialogue`. In this repo:

```
packs/behavior_pack/dialogue/
```

Every file in that folder is read, no matter how you organise it. One file per character, one per chapter, or one for the whole world. No manifest entry is needed beyond the data module the pack already has.

Minimum scene structure:

```json
{
  "format_version": "1.17",
  "minecraft:npc_dialogue": {
    "scenes": [
      {
        "scene_tag": "example_tag",
        "npc_name": "EXAMPLE",
        "text": "Line shown in the dialogue box.",
        "buttons": [
          {
            "name": "Label the player clicks",
            "commands": [
              "/say clicked"
            ]
          }
        ]
      }
    ]
  }
}
```

Scene properties:

| Property | Required | What it does |
|---|---|---|
| `scene_tag` | Yes | The name you call the scene by in game |
| `npc_name` | No | Name in the dialogue box, overrides the editor name |
| `text` | No | The dialogue body. Empty box if omitted |
| `on_open_commands` | No | Runs when the box opens |
| `on_close_commands` | No | Runs when the box closes |
| `buttons` | No | Array of `name` and `commands`. Without it, no buttons appear |

Commands inside a scene file keep the leading slash. Command blocks do not. This is the opposite of the rest of this guide, so check it twice.

The maximum number of buttons is not stated in the Microsoft docs. Test the count in game before designing a scene that needs many. Start with four.

### 5. Pointing an NPC at a scene

Tag the NPC so you can target it reliably:
```
/tag @e[type=npc,r=3] add soc_triage_npc
```

Open a scene for the nearest player:
```
/dialogue open @e[tag=soc_triage_npc] @p soc_triage
```

Point the NPC at a scene without opening it, so the next right-click shows it:
```
/dialogue change @e[tag=soc_triage_npc] soc_triage
```

Syntax:

```
/dialogue open <npc: target> <player: target> [sceneName: string]
```

```
/dialogue change <npc: target> <sceneName: string> [players: target]
```

Notes:

- The npc target must be an entity of type `npc`.
- `dialogue open` forces the box open. The NPC does not have to be visible, only in a loaded chunk within ticking distance. You can hide one underground and use it as a pop-up window.
- `dialogue change` does not open anything. It sets what the player sees on their next interaction.
- If `sceneName` is left off `dialogue open`, the NPC keeps showing whatever it said last.
- Requires cheats. Permission level: Game Directors.

### 6. Per-player answers in multiplayer

Inside a scene file only, `@initiator` targets the player who clicked the button. The docs state it is the only place that selector is used.

```
"commands": ["/give @initiator gold_ingot"]
```

Use `@initiator` when the result should belong to one player. Use `NB_GLOBAL` scoreboard commands when the result is shared facility state, which is how every NullByte flag works.

### 7. Test checklist for any new NPC

1. Place the NPC in Creative, name it, pick a skin.
2. Tag it.
3. Switch to Survival or Adventure. Right-click it. Confirm the box opens.
4. Click every button. Confirm each command ran, using `/scoreboard players list NB_GLOBAL`.
5. Click the correct button twice. Confirm nothing breaks on the second press.
6. Test with a second player if the scene uses `@initiator`.

---

## Appendix I: nb:reset

Operator only. Clears all shared progress so the game can be replayed from the start.

```
/nb:reset
```

Requires cheats and operator permission. A non-operator gets `Denied. Operator permission required.` It works even when the terminal is locked or `nb_victory` is already 1, because those are exactly the states you need to get out of.

If you get `incorrect permission level for command`, you are not an operator in that world. Grant yourself operator in the player list, or run it from the host account.

What it clears:

- Every objective on `NB_GLOBAL` back to 0, including flags, permission, noise, alarms, lock, and exploit state.
- Builder-created objectives such as `nb_sshlog`, `nb_fwall_tp`, and `nb_p02_tp`, because it runs `scoreboard players reset NB_GLOBAL` first.
- In-memory state: the flag baseline, the noise band, and dimension tracking. Flag capture announcements fire again on the next 0 to 1 change.

**What it does not clear.** The scoreboard is only half the game. Fix these by hand:

- Any gate opened with `setblock <x> <y> <z> air`. Put the block back.
- Latched hopper filters in the Puzzle 6 vault.
- Keycards already in a player inventory. Doors stay paired, which is fine.
- NPC scene pointers. Reset the triage NPC:

```
/dialogue change @e[tag=soc_triage_npc] soc_triage_locked
```

The command prints this list in chat when it runs, so you do not have to remember it.

### Manual reset without the command

If the behavior pack is not loaded, one vanilla command does most of the same work. The script re-seeds every known objective to 0 on its next tick.

```
/scoreboard players reset NB_GLOBAL
```
