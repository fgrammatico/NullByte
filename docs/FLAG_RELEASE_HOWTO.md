# Flag Release How-To

This guide details the flag release mechanics, chain command patterns, and reward options for each puzzle. For physical puzzle build instructions, sign text, and email content, see `docs/build-guide.md`.

Use both documents together: `docs/build-guide.md` tells you what to build and what messages to write; this file tells you exactly how to wire the flag, what to chain after it, and what rewards to give the players.

## Pack roles

### Behavior pack

The behavior pack is required. It contains:

- the compiled gameplay script;
- shared scoreboard initialization;
- terminal commands;
- flag detection and announcements;
- noise, patrol, permission, and victory logic; and
- NPC dialogue.

The active source is `packs/src/main.ts`. Minecraft runs the compiled file at `packs/behavior_pack/scripts/main.js`.

### Resource pack

The resource pack normally contains client assets such as textures, models, sounds, interface files, and text translations.

NullByte's current resource pack contains only `manifest.json` and `pack_icon.png`. It does not currently change the visible game. The behavior-pack manifest declares it as a dependency, so activate both packs with the current release. Removing it requires removing that dependency and changing the package process.

After importing `NullByte.mcaddon`, confirm both packs are active in the local world's Add-Ons settings. A working `nb:menu` command confirms that the behavior script is running. The current resource pack has no visible in-game test because it has no custom assets.

## Shared flag model

All puzzle flags belong to the fake scoreboard participant `NB_GLOBAL`. They do not belong to the player who presses a button or finishes a puzzle.

A released flag changes from `0` to `1`. On that transition, the behavior pack:

1. broadcasts `FLAG CAPTURED` to connected players;
2. displays the flag title;
3. removes 3 shared noise, with a minimum of 0; and
4. unlocks the matching command or world route.

Flags are permanent discoveries during normal play. Do not set them back to `0` during a live session.

## Flag map

| # | Puzzle | Objective | Unlocks |
|---|---|---|---|
| 1 | Credential Vault | `nb_p01` | `nb:login`, `nb:ls`, `nb:cat`, `nb:scan` |
| 2 | Log Analysis Wall | `nb_p03` | `nb:exploit firewall` |
| 3 | Firewall Rules Console | `nb_p05` | `nb:exploit ids` |
| 4 | Binary Access-Code Decoder | `nb_p04` | `nb:sudo` |
| 5 | Route Access Request | `nb_p02` | End portal gate |
| 6 | Encryption Key Assembly | `nb_p06` | `nb:exploit encryption` |
| 7 | Port Knock Sequence | `nb_p07` | `nb:exploit root` (with encryption) |

Flag numbers follow objective allocation, not physical puzzle order.

## Testing flags from chat

You can release flags manually while testing. The world must have cheats enabled, and your account must have operator permission. Wait until the behavior pack reports that the shared session is loaded before testing.

Inspect the Credential Vault flag. Run in the local world chat. Expected result: Minecraft prints the current shared value. Risk level: read-only.

```mcfunction
/scoreboard players get NB_GLOBAL nb_p01
```

Release the Credential Vault flag. Run in the local world chat. Expected result: `nb_p01` becomes `1`, the capture is announced, and 3 shared noise is removed. Risk level: changes test progression.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p01 1
```

Display the shared challenge count. Run in the local world chat. Expected result: the challenge total increases. Risk level: read-only.

```mcfunction
/nb:status
```

Display newly available terminal operations. Run in the local world chat. Expected result: commands unlocked by the released flag appear. Risk level: read-only.

```mcfunction
/nb:menu
```

### Manual commands for every flag

Release the Core Route flag. Run in local world chat. Expected result: `nb_p02` becomes `1`. Risk level: changes test progression.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p02 1
```

Release the Firewall Exploit Token flag. Run in local world chat. Expected result: `nb_p03` becomes `1`. Risk level: changes test progression.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p03 1
```

Release the Sudo Secret flag. Run in local world chat. Expected result: `nb_p04` becomes `1`. Risk level: changes test progression.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p04 1
```

Release the IDS Bypass Module flag. Run in local world chat. Expected result: `nb_p05` becomes `1`. Risk level: changes test progression.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p05 1
```

Release the Encryption Key flag. Run in local world chat. Expected result: `nb_p06` becomes `1`. Risk level: changes test progression.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p06 1
```

Release the Port Knock flag directly. Run in local world chat only when bypassing the sequence for testing. Expected result: `nb_p07` becomes `1`. Risk level: bypasses the Port Knock puzzle.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p07 1
```

## Releasing a flag from a completed puzzle

### Standard command-block pattern

Use this pattern for Puzzles 1 through 6:

1. Build the physical puzzle and produce one redstone output only when its solution is correct.
2. Connect that output to an impulse command block.
3. Set the command block to `Impulse`.
4. Set the condition to `Unconditional`.
5. Set redstone mode to `Needs Redstone`.
6. Set delay to `0` ticks.
7. Enter the matching scoreboard command without a leading slash.
8. Test the wrong state first. The flag must remain `0`.
9. Enter the correct state. The flag must change to `1`.
10. Verify the capture announcement and unlocked operation.

Never use `@p`, `@s`, or `@initiator` as the scoreboard participant. Those selectors conflict with shared progression and can target the wrong nearby player.

### Reward chain blocks

After the flag-setting impulse block, attach chain command blocks to deliver rewards. Each chain block runs immediately after the previous one with no additional redstone required.

Chain command block settings:

| Setting | Value |
|---|---|
| Mode | Chain |
| Condition | Unconditional (or Conditional if it should only fire when the previous block succeeded) |
| Redstone | Always Active |
| Delay | 0 (or a tick delay for staggered effects) |

Chain blocks do not need a leading slash.

Common reward types:

```
title @a actionbar §aText here
```
```
playsound random.levelup @a
```
```
give @a[r=20] <item_id> 1
```
```
tp @a <x> <y> <z>
```
```
setblock <x> <y> <z> air
```
```
summon fireworks_rocket <x> <y> <z>
```

For items from commercial add-ons (blasters, armor), confirm the exact item ID from the add-on's documentation before wiring the give command. Use a dispenser pre-loaded with the item as an alternative to `/give` when item IDs are uncertain.

### Puzzle 1: Credential Vault

Fires when the discovery button is pressed beside the `auth.log backup` book.

Flag block:
```
scoreboard players set NB_GLOBAL nb_p01 1
```

Chain 1 - confirmation title:
```
title @a actionbar §aCredentials: RECOVERED
```

Chain 2 - audio feedback:
```
playsound random.levelup @a
```

Optional chain 3 - give a flavor item that represents the session token (any distinctive item works; players cannot use it but it signals the discovery):
```
give @a[r=20] gold_nugget 1
```

### Puzzle 2: Log Analysis Wall

The correct button fires the flag. Three trap buttons fire noise penalties.

Flag block (correct button):
```
scoreboard players set NB_GLOBAL nb_p03 1
```

Chain 1:
```
playsound random.levelup @a
```

Chain 2 - hint pointing toward the hardware lab:
```
title @a actionbar §6Firewall exploit token acquired. Check the hardware lab.
```

Trap blocks (each wrong button, separate impulse blocks):
```
scoreboard players add NB_GLOBAL nb_noise 5
```

### Puzzle 3: Firewall Rules Console

Fires when the AND/NOT redstone circuit closes (levers 80 and 443 ON, all others OFF).

Flag block:
```
scoreboard players set NB_GLOBAL nb_p05 1
```

Chain 1:
```
playsound random.levelup @a
```

Chain 2 - visual effect at the IDS cabinet to sell the bypass activation:
```
summon lightning_bolt <cabinet_x> <cabinet_y> <cabinet_z>
```

Chain 3 - status message:
```
title @a actionbar §6IDS bypass active. Firewall weakened.
```

No trap penalty here; wrong lever combinations simply do not close the circuit.

### Puzzle 4: Binary Access-Code Decoder

Fires when the AND/NOT redstone circuit closes (levers 64 and 1 ON, all others OFF).

Flag block:
```
scoreboard players set NB_GLOBAL nb_p04 1
```

Chain 1 - privilege escalation effect:
```
title @a title §6SUDO ENABLED
```

Chain 2:
```
playsound random.levelup @a
```

Optional chain 3 - give a weapon upgrade now that players are escalating privileges. Use a blaster item from the commercial add-on (confirm item ID first):
```
give @a[r=20] <blaster_item_id> 1
```

### Puzzle 5: Route Access Request

This flag is set by the script when players run `nb:request 4471 ETH2-GW 04:30 ZERO` in the terminal. The script validates all four evidence fields and sets `nb_p02` on a match; wrong fields add 6 shared noise.

Because the script sets this flag (not a command block), rewards cannot chain directly from a flag-setting block. Use a **staging pad confirmation button** instead: players press it once the terminal confirms the route is open. Wire the button to the reward chain.

Alternatively, a Repeating command block can monitor the scoreboard and fire a one-shot reward:

```
[Repeating / Always Active]
execute if score NB_GLOBAL nb_p02 matches 1 unless score NB_GLOBAL nb_p02_done matches 1 run scoreboard players set NB_GLOBAL nb_p02_done 1
```

Note: `nb_p02_done` must be registered as a scoreboard objective first, or use a different latch mechanism.

Regardless of trigger method, the reward chain should:

Chain 1 - open the physical gate:
```
setblock <gate_x> <gate_y> <gate_z> air
```

Chain 2 - activate the equipment dispenser (pre-load the dispenser with blasters and armor; power it via the chain block):
```
setblock <dispenser_x> <dispenser_y> <dispenser_z> dispenser [facing=player_direction]
```
Or connect the chain block to a redstone pulse that triggers the dispenser.

Chain 3 - give individual armor pieces if not using a dispenser (confirm item IDs from the commercial add-on):
```
give @a[r=20] <armor_helmet_id> 1
give @a[r=20] <armor_chestplate_id> 1
```

Chain 4 - briefing title before teleport:
```
title @a title §cCORE ROUTE OPEN
```

Chain 5 (delay: 60) - teleport to End staging pad after 3 seconds:
```
tp @a <staging_x> <staging_y> <staging_z>
```

Wrong terminal submission is handled by the script automatically (+6 noise).

### Puzzle 6: Encryption Key Assembly

Fires when all three hopper item filters are latched and the AND gate closes.

Flag block:
```
scoreboard players set NB_GLOBAL nb_p06 1
```

Chain 1:
```
title @a title §aENCRYPTION KEY ASSEMBLED
```

Chain 2:
```
playsound random.levelup @a
```

Chain 3 - optional weapon upgrade for the End combat sequence (confirm item ID):
```
give @a[r=20] <upgraded_blaster_id> 1
```

Do not connect an unfiltered chest comparator directly to this command. Each receiver must reject unrelated items.

## Puzzle 7 Port Knock

Port Knock is the exception. Its plates do not set `nb_p07` directly. Each plate sends a script event, and the behavior pack validates the shared sequence `1337`, `22`, `443`.

Configure the 1337 plate's impulse command block. Expected result: sequence step 1 is accepted when it is the expected step. Risk level: changes shared sequence state.

```mcfunction
scriptevent nb:knock 1337
```

Configure the 22 plate's impulse command block. Expected result: sequence step 2 is accepted after 1337. Risk level: changes shared sequence state.

```mcfunction
scriptevent nb:knock 22
```

Configure the 443 plate's impulse command block. Expected result: the final valid step releases `nb_p07`. Risk level: changes world progression.

```mcfunction
scriptevent nb:knock 443
```

Configure the 80 decoy plate's impulse command block. Expected result: the sequence resets and shared noise increases by 2. Risk level: changes defense state.

```mcfunction
scriptevent nb:knock 80
```

Configure the 8080 decoy plate's impulse command block. Expected result: the sequence resets and shared noise increases by 2. Risk level: changes defense state.

```mcfunction
scriptevent nb:knock 8080
```

Any unexpected port or wrong order resets `nb_knock` to `0` and adds 2 shared noise. The final correct event sets `nb_p07` to `1`; no separate flag command block is needed.

## Testing a puzzle again

Resetting flags is for a disposable test world only. Physical doors, latches, and puzzle items must also be reset by the builder.

Reset the Credential Vault flag. Run in local world chat. Expected result: `nb_p01` returns to `0`. Risk level: destructive to current test progression.

```mcfunction
/scoreboard players set NB_GLOBAL nb_p01 0
```

Wait at least one game tick before setting it back to `1`. The script must observe the `0` state before it can detect another `0` to `1` transition. If the flag is already `1` when the script establishes its startup baseline, no capture announcement or noise reward is issued.

Do not test flag capture after `nb_victory` is `1`. Victory stops normal flag monitoring. Use a fresh test world or reset the complete session state and physical build through the approved admin reset process.

## Troubleshooting

### Objective does not exist

The behavior pack has not initialized correctly. Confirm that it is active, that Script API dependencies are available, and that the world has completed loading.

### Flag changes but no message appears

Check these conditions:

- the value changed from `0` to `1`, not from `1` to `1`;
- the script observed the previous `0` state;
- `nb_victory` is still `0`; and
- the behavior pack script is active.

### Command works in chat but not in a command block

Remove the leading slash from commands entered in a command block. Keep the slash in chat and NPC dialogue JSON.

### Puzzle announces correctly but the door stays closed

The flag stores progression. A physical door still needs its own redstone, chain command block, piston, or coordinate-specific world action.

### The wrong player receives progress

Replace player selectors with `NB_GLOBAL`. All NullByte gameplay state is shared.