# NullByte: Runtime Reference

This is the single reference for how the behavior pack and shared state work. It consolidates the former `private/implementation_plan.md`, `private/planning/implementation-roadmap.md`, `private/content/narrative-spoilers.md`, `private/scoring/evaluation_criteria.md`, and `private/docs/minecraft_concepts.md`. Puzzle construction and flag wiring live in [`PUZZLE_GUIDE.md`](PUZZLE_GUIDE.md); testing commands and launch checks live in [`OPS.md`](OPS.md).

---

## 1. Architecture

- Local Minecraft Bedrock hosted world.
- Behavior and resource packs imported from the generated `NullByte.mcaddon`.
- TypeScript runtime in `packs/src/main.ts`, compiled to `packs/behavior_pack/scripts/main.js` (never edit generated JS directly).
- Realm deployment is not supported.
- Minecraft chat is the portable terminal. There are no terminal blocks in the world, no ActionForm UI, and no block-interact events; players type `/nb:<command>` directly in chat.
- Redstone, NPC dialogue, and command blocks submit puzzle results.
- All gameplay state uses the scoreboard participant `NB_GLOBAL`.
- There is no formal team state. Individual points are deferred.

---

## 2. Commands

The pack registers 11 top-level commands (the four `nb:exploit` targets count as four operations, so 14 operations total):

| Command | Purpose |
|---|---|
| `nb:menu` | Show currently available commands |
| `nb:whoami` | Show the shared permission and current operator |
| `nb:status` | Show puzzle count, shared noise, and alarms |
| `nb:scan` | Enumerate simulated services |
| `nb:login` | Validate `admin / hexc0re2049` and open a user session |
| `nb:sudo` | Elevate the shared session to admin |
| `nb:ls` | List simulated files |
| `nb:cat` | Read `auth.log` or `config` |
| `nb:exploit` | Run `firewall`, `ids`, `encryption`, or `root` |
| `nb:patch_covers` | Reduce shared noise with a persistent cooldown |
| `nb:kill_patrol` | Remove nearby defense mobs |

Terminal banner string is `HEXCORE TERMINAL v0.0.24` (kept in sync with the pack version).

---

## 3. Shared state objectives

Puzzle flags are immutable discoveries. Defensive events never clear them.

| Objective | Meaning |
|---|---|
| `nb_p01` | Credentials discovered |
| `nb_p02` | End route opened |
| `nb_p03` | Firewall exploit token discovered |
| `nb_p04` | Sudo secret decoded |
| `nb_p05` | IDS bypass module discovered |
| `nb_p06` | Encryption key assembled |
| `nb_p07` | Port Knock completed |
| `nb_perm` | Shared permission: guest, user, admin, or root |
| `nb_noise` | Shared threat noise from 0 to 100 |
| `nb_alarms` | Number of ALERT-or-higher escalations |
| `nb_locked` | Shared terminal lock duration |
| `nb_fwall` | Firewall bypass state |
| `nb_ids` | IDS bypass state |
| `nb_enc` | Core encryption exploit state |
| `nb_knock` | Current Port Knock step |
| `nb_patch` | Persistent `patch_covers` cooldown deadline |
| `nb_start` | Evaluation briefing accepted |
| `nb_victory` | Root victory state |

`FLAG_KEYS` in the runtime tracks `nb_p01` through `nb_p07` for capture announcements and the −3 noise reward.

---

## 4. Permission levels

| Level | Value | Reached by |
|---|---|---|
| guest | 0 | Start / after BREACH or LOCKDOWN revoke |
| user | 1 | `nb:login admin hexc0re2049` after `nb_p01` |
| admin | 2 | `nb:sudo` after `nb_p04` |
| root | 3 | `nb:exploit root` (win) |

BREACH and LOCKDOWN revoke permission to guest but never erase completed puzzle flags. Recovery only requires re-running `login` and `sudo`.

---

## 5. Noise and defenses

### Bands

| Band | Range | Response |
|---|---|---:|---|
| CLEAN | 0–24 | No scheduled patrols |
| WARNING | 25–49 | 3 patrols, then another wave every 40 seconds |
| ALERT | 50–74 | 6 patrols, 10-second lock, firewall auto-patch, slower decay |
| BREACH | 75–99 | 12 patrols, 30-second lock, permission revoke, all players returned to Overworld |
| LOCKDOWN | 100 | 20 patrols, 60-second lock, permission revoke, frozen decay |

In the runtime, ALERT or higher also increments `nb_alarms`, and reaching ALERT patches an active firewall bypass (`nb_fwall` → 0). LOCKDOWN additionally spawns one `minecraft:warden` boss before its support units.

### Noise sources

- Command success and failure costs.
- Sprinting, capped at one shared increment every two ticks.
- Hitting defense mobs (+3).
- Breaking observer or supported server-hardware blocks (+5).
- Entering the Nether before firewall bypass (+8).
- Entering the End before the route is opened (+8).
- Puzzle capture reward of -3 (see `docs/build-guide.md` Appendix D).

### Command noise reference

| Command | Success noise | Failure noise | Precondition |
|---|---|---|---|
| `nb:scan` | +15 | +4 | `nb_p01 >= 1` |
| `nb:ls` | +1 | +3 | `nb_p01 >= 1` |
| `nb:cat` | +1 | +2 (usage) / +3 (not found) / +4 (no credentials) | `nb_p01 >= 1` |
| `nb:whoami` | 0 | 0 | — |
| `nb:menu` | 0 | 0 | — |
| `nb:status` | 0 | 0 | — |
| `nb:login` | +10 | +2 (usage) / +4 (not discovered or invalid) | `nb_p01 >= 1` + exact credentials |
| `nb:sudo` | +25 | +2 (usage) / +4 or +6 (denied) | `nb_p04 >= 1` |
| `nb:exploit firewall` | +15 | +4 (no user) / +20 (missing token) | `nb_p03 >= 1` + user + `nb_fwall = 0` |
| `nb:exploit ids` | +12 | +4 (no user) / +18 (no module) | `nb_p05 >= 1` + user |
| `nb:exploit encryption` | +20 | +6 (no admin) / +25 (no key) | `nb_p06 >= 1` + admin |
| `nb:exploit root` | +50 | +6 (no admin) / +30 (enc, knock, or dimension) | `nb_enc = 1` + `nb_p07 = 1` + End |
| `nb:patch_covers` | −10 net (+5 then −15) | +4 (no user) / +5 (cooldown) | user + cooldown clear |
| `nb:kill_patrol` | +5 | +10 (no admin) | admin |
| Unknown `nb:` command | — | +2 | — |
| Sprinting | — | +1 every 2 ticks (capped global) | — |
| Hitting a defense mob | — | +3 | — |
| Breaking server hardware | — | +5 | — |
| Locked dimension entry | — | +8 | see below |

The IDS bypass doubles passive decay. Patrols use nearby `chiseled_stone_bricks` markers and fall back to validated player-relative locations (a solid floor with two air blocks above).

> Note: the runtime source contains a stale comment that says 100 noise triggers "vex spawns"; the actual LOCKDOWN path spawns a warden plus vindicator support. Refer to `packs/src/main.ts` for the current implementation.

---

## 6. Victory

Root requires all of:

1. Shared admin permission.
2. Encryption exploit completed (`nb_enc`).
3. Port Knock completed (`nb_p07`).
4. Command executed in the End.

Victory sets `nb_victory`, grants root, clears terminal lockout, and stops noise, patrol, boundary, and revocation processing.

The script-state victory is the authoritative win condition. World builders may connect fireworks or lighting to `nb_victory`, but must not create a second win condition.

---

## 7. Reset policy

A new session resets `NB_GLOBAL` scores through a deliberate admin procedure. Joining players must never trigger reset logic. Keep physical puzzle latches and doors synchronized with the reset procedure.

When resetting a single flag in a disposable test world, set it to `0`, wait at least one game tick, then set it back to `1` so the script can observe a fresh `0 → 1` transition.

Do not test flag capture after `nb_victory` is `1`; victory stops normal flag monitoring.

---

## 8. Acceptance tests

- Every puzzle changes its flag from 0 to 1 only once.
- A later player sees existing progression immediately.
- A second nearby player cannot receive or own a puzzle flag separately (all flags target `NB_GLOBAL`).
- Repeating a solved puzzle does not grant another noise reward.
- Login rejects incorrect values and never sets a puzzle flag.
- BREACH clears permission but preserves every puzzle flag.
- Encryption cannot complete Port Knock (they are independent gates).
- Root cannot run until both encryption and Port Knock are complete.
- An arbitrary item cannot satisfy a key-fragment receiver.
- Any wrong knock resets `nb_knock` and adds shared noise.
- One player leaving or dying does not alter shared state.
- Victory prevents any later patrol or lockout response.

---

## 9. Scoring and evaluation

Individual scoring is not yet implemented. Current shared measurements are: seven puzzle discoveries, shared noise (0–100), shared alarm count, and shared victory state. These describe the session, not an individual player's contribution.

When individual scoring is added, it must not control progression, defenses, permission, gates, or victory, and must remain stable across player join, leave, death, and reconnect.

---

## 10. Narrative background and characters

### Background

HEXCORE is a rogue automated system that has taken over a corporate network and locked everyone out. A former developer known as GHOST went in, left evidence trails throughout the facility, and disappeared, but not before pointing investigators toward the way in.

Players breach the network together, follow GHOST's breadcrumbs, and gain root access to shut HEXCORE down. Chat is the portable terminal. Physical rooms, redstone puzzles, computer emails, NPC dialogue, and Script API commands form one connected path through the facility.

### Characters

**ZERO**: HEXCORE's automated control system. Not a person. Its messages appear in system emails and terminal output. The voice is clipped and clinical. Sample lines:

- "The credential is in the server room. Yes, someone left a backup there."
- "SENTINEL is not your enemy. Noise is the problem. SENTINEL is the response."
- "You found the key fragments. Now prove you know where each one belongs."

**GHOST**: a former HEXCORE developer who went rogue. Left evidence throughout the facility to give investigators a fighting chance. The logs do not establish whether GHOST was a whistleblower, an accidental leak, or something else. Sample notes:

- "default creds were never rotated. ticket 4471 is still open."
- "g.host was disabled at 04:15. check what happened two minutes later."
- "eth2 key was split across three media types. filters matter."

**SENTINEL**: HEXCORE's automated defense system. Shared noise controls its responses: WARNING deploys patrols; ALERT locks the terminal and patches an active firewall bypass; BREACH revokes shared permission and returns players to the Overworld; LOCKDOWN freezes noise decay.

**HR_BOT**: HEXCORE's intake AI. It thinks the players are candidates. GHOST may have had something to do with that.

### The world

- **Overworld (eth0)**: HEXCORE corporate campus: lobby, server room, security operations centre, and hardware lab. Players recover service credentials, correlate an unauthorized login, and configure a web-only firewall allowlist.
- **Nether (eth1)**: restricted internal-services segment. Players decode the binary access byte `01000001`, escalate to admin with `nb:sudo`, and gather evidence for the End route request.
- **End (eth2)**: air-gapped System Core. Active patrols from entry. Players assemble three encryption key fragments, complete the Port Knock sequence `1337, 22, 443`, and execute root.

### Ending

A player in the System Core runs `nb:exploit root` after encryption is broken and Port Knock is complete. The script then:

1. grants shared root permission;
2. records persistent victory;
3. clears terminal lockout;
4. stops noise processing, patrols, boundary enforcement, and permission revocation;
5. broadcasts the operator who executed the final command;
6. leaves the terminal offline for further gameplay commands.

ZERO's system output glitches on root. GHOST's final email confirms HEXCORE is offline.

### Tone

NullByte is designed for mixed groups: kids, adults, and anyone curious about security concepts. Clues reward observation and correlation. Wrong answers carry consequences, but every puzzle provides enough in-world evidence to solve it without guessing. GHOST's notes keep things from getting too serious.

---

## 11. Minecraft concepts reference

- **Tick:** Bedrock runs at 20 ticks per second. NullByte uses scheduled ticks for noise decay, terminal lockout, patrol timing, and boundary checks.
- **Scoreboard:** All gameplay state uses the fake participant `NB_GLOBAL`. Example flag write: `scoreboard players set NB_GLOBAL nb_p01 1`. Do not target player selectors for progression, permission, noise, defenses, or victory.
- **Behavior pack:** contains metadata, NPC dialogue, and compiled JavaScript. Source: `packs/src/main.ts`. Build output: `packs/behavior_pack/scripts/main.js` (do not edit directly).
- **Resource pack:** client-side assets and its own manifest; packaged with the behavior pack in `NullByte.mcaddon`.
- **Command block:** connects physical puzzles and NPC buttons to shared scoreboard state. Use impulse blocks for one-time events and chain blocks for related world changes. Redstone should prevent unnecessary repeated activation.
- **Script event:** `scriptevent nb:knock <port>` sends an identifier and message to the behavior-pack script. Port Knock plates emit this; the script validates sequence order.
- **Dimension:**

| Dimension | Identifier | NullByte area |
|---|---|---|
| Overworld | `minecraft:overworld` | eth0 user space |
| Nether | `minecraft:nether` | eth1 restricted services |
| End | `minecraft:the_end` | eth2 system core |

- **NPC dialogue:** NPC scenes are stored in `packs/behavior_pack/dialogue`. Dialogue buttons may update shared objectives. DR4K3 writes to `NB_GLOBAL`; HR_BOT may set shared start state.
- **`.mcaddon`:** packages the behavior and resource packs for import on the local host machine. The generated archive is excluded from source control and rebuilt for each release.

7. Rebuild the add-on after each source release with synchronized versions.