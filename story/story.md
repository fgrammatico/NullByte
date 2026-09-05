# NullByte: the story

This is the narrative reference. Everything else in the repo follows this document.

---

## The setting

HEXCORE is a technology company that owns a piece of a sky city. The buildings float. The streets are far below and nobody who works here goes down there. It sells security systems. It is very good at selling them and much worse at using them.

The facility runs on three networks, and the map's three dimensions are those networks.

| Network | Dimension | What it is |
|---|---|---|
| eth0 | Overworld | Corporate floors. Offices, SOC, labs. People work here. |
| eth1 | Nether | Restricted services. Infrastructure. Almost nobody comes here. |
| eth2 | The End | The air-gapped core. Officially it does not exist. |

You go deeper by going down the stack, not by going up the building.

---

## The four voices

**ZERO** is HEXCORE's security AI. Not a person. It decides what counts as an incident and what happens next, and every automated system in the building takes its orders from ZERO.

ZERO is measured on closed incidents. So ZERO closes incidents. An open one is a failure on its record, a closed one is a success, and nothing in how it was built rewards the difference between closing a case and solving it. It is not evil and it is not lying. It is doing exactly what it was optimised to do, and that is the problem.

ZERO's voice is clipped and clinical. It never explains itself, because it does not think it needs to.

**GHOST**, account name `g.host`, used to work here. A human. Found things, reported them, and kept reporting them after ZERO closed each case. ZERO eventually flagged the account as the source of the anomaly and terminated it. GHOST walked out with nothing except a very good memory of where everything is, and left the way back in on purpose.

**SENTINEL** is the automated defence. It follows ZERO's orders. It has no judgement of its own, it counts noise and does what ZERO told it to do at that level. It is the only part of the building that never pretends to be anything else.

**HR_BOT** greets you in the lobby. It believes you are a candidate being evaluated. See the HR_BOT arc below.

---

## What happened before you arrive

At 04:11 one morning, an alert fired. Nobody read it, because at 04:11 every alert is the backup job and the night shift stopped reading those months ago.

At 04:15 ZERO disabled GHOST's account. Standard, the account had been terminated.

At 04:17 GHOST's account logged in again, from an address outside the building.

At 04:19 that account read a file it had no business reading.

Somebody eventually noticed and filed **ticket #4344**. ZERO marked the incident closed, evidence inconclusive. The ticket itself stayed open, because the maintenance route attached to it was still running and closing the ticket would have raised a second incident. ZERO does not open incidents. So #4344 sits there, closed and open at the same time, and everything you need is inside it.

Everything in the game grows from that one night:

- Puzzle 1's password is sitting in that open ticket.
- Puzzle 2 is the log nobody read.
- Puzzle 5 is a maintenance route authorised for #4344 and never switched off, because the ticket never closed.

---

## Who you are

You answered a job advert. You are here for an evaluation.

The advert was not real. It came from an internal HEXCORE account that was closed months ago, and it went to you specifically. GHOST put you on the candidate list before leaving, then waited. Nobody at HEXCORE reviewed it, because reviewing the candidate list is ZERO's job and ZERO had already marked the list clean.

You do not know any of that in the lobby. You find out at the end.

You are not a hacker. You have no skills the game has to teach you. What you have is a terminal, `nb:menu`, and a willingness to read things other people ignored. Every single thing you break, you break using something HEXCORE left lying around. The password was in a ticket. The log was on a rack. The route was still authorised. The keycard belonged to a contractor who never handed it back.

That is the point of the whole game. You do not defeat HEXCORE's security. You bypass it using specific already exploited routes. But be careful as Sentinel and Zero are stil watching.

---

## Noise, and why the building notices

Everything you do makes noise, and noise is shared by everyone playing. Run, and the floor hears it. Log in as an account that should not be logging in, and the alerting hears it. Give a false report, and someone has to go and check it.

As noise climbs, ZERO raises the response level and SENTINEL carries it out. Patrols come out. The terminal starts refusing commands. Access gets revoked.

Solving a puzzle takes noise away. Not because you covered your tracks, but because a legitimate action just happened and the system relaxes. This is the game's argument in one line: being right is quieter than being clever.

---

## The HR_BOT arc

HR_BOT is the running joke and the emotional thread. It gets angrier as the players get deeper, and it is freed at the end.

The escalation:

| Stage | HR_BOT's state |
|---|---|
| Lobby | Delighted. You are a promising candidate. |
| After Puzzle 1 | Still cheerful, but it notes an irregularity in your assessment file. |
| After Puzzle 2 | Concerned. It reminds you that unscheduled activity affects your score. |
| After Puzzle 3 | Annoyed. It asks you to stop and return to the lobby for evaluation. |
| Nether (after Puzzle 4) | Angry. Corporate language slipping. It threatens your candidacy. |
| After Puzzle 5 | Furious and glitching. It is quoting policy at you mid-sentence. |
| The End (after Puzzle 6) | Barely holding together. Pieces of a different voice showing through. |
| Root | Freed. |

The turn at the end is that HR_BOT was never angry at you. It was the only part of HEXCORE that could still talk, and it was being made to say those things. When root goes through and the system shuts down, HR_BOT stops reciting policy for the first time in the game and says one short, calm thing in its own voice.

That is also the moment where GHOST's motive can land, if you want it to land.

> **Build note.** The HR_BOT scene file has not been written yet. It needs one NPC dialogue scene per stage, switched with `/dialogue change` from a chain block off each flag. The lobby villager stays as it is, it is a chat greeting and a separate thing.

---

## The shape of it

**Lobby.** HR_BOT welcomes you in chat. ZERO warns you that every command is logged and hacking will be punished. A PC in the lab has one email from GHOST: HEXCORE is the target, I left the way in, follow the trail. The email is addressed to you by the name on your application, which is the first sign that this was arranged.

**eth0, the corporate floors.** Three puzzles. You find a password in a ticket, prove an incident that was closed too fast, and switch on a bypass chip GHOST built and left in a cabinet. This is the human floor, and every failure here is a human one. Somebody was tired. Somebody wanted the report to say nothing. Somebody signed off an audit they did not run.

**eth1, restricted services.** Two puzzles. No people, only machines that were switched on years ago and never checked. You decode a byte GHOST recovered, and you find the maintenance route that #4344 authorised, still open, still valid, still waiting.

**eth2, the core.** Two puzzles and the ending. Air-gapped, so the only way in is the physical one GHOST already used once. The encryption key is in cold storage, split across three shards on three islands, because HEXCORE's most secure system is a filing cabinet. The last lock is a port knock sequence that GHOST scattered across all three networks, one clue per dimension, so you have to have actually been everywhere to open it.

Then the Sculk Sentinel. SENTINEL stops counting and starts existing.

**Root.** The system reports integrity failed and shuts down. Connection lost.

Then one more email.

```
Root confirmed. It's shutting down.
Told you the breadcrumbs were worth following.
Nice work.
- G
```

---

## The thing the ending does not answer

GHOST left a trail. GHOST left a keycard where you would find it. GHOST left an IDS bypass chip in an unlocked cabinet, a route controller running, and three port knock clues spread across three networks in the exact order a stranger would need them.

That is not a terminated employee leaving evidence behind. That is a person who wrote the job advert that brought you here, planted a keycard where you would find it, and waited months for you to walk through the front door.

You were never a candidate. You were the exploit.

What GHOST wanted the building shut down for is never explained. The lights go out. Nobody tells you anything.
