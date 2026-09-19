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

**Gh0st**, account name `gh0st`, used to work here. A human. Found things, reported them, and kept reporting them after ZERO closed each case. ZERO eventually flagged the account as the source of the anomaly and terminated it. Gh0st walked out with nothing except a very good memory of where everything is, and left the way back in on purpose.

**SENTINEL** is the automated defence. It follows ZERO's orders. It has no judgement of its own, it counts noise and does what ZERO told it to do at that level. It is the only part of the building that never pretends to be anything else.

**HR_BOT** greets you in the lobby. It believes you are a candidate being evaluated. See the HR_BOT arc below.

### How each voice reaches the player

The game can only deliver these voices in a few fixed ways. Every line written for them has to fit one of these, or it cannot be built.

| Voice | Only ever appears as | Never |
|---|---|---|
| Gh0st | Emails on a PC, printed notes, books, signs | Never speaks live, never stands in a room |
| ZERO | Chat lines and on-screen alerts (like a system log) | No emails, no notes |
| SENTINEL | Chat lines, on-screen alerts, and the thing it does to you (patrols, doors, lasers) | No emails, no notes |
| Terminal | Text the `nb:` commands print back in chat | It is the system answering, not a character |

Forum posts are shared and readable from any PC at any time, so they are background chatter only. A forum post never holds an answer and never tells you where to go next. Anything that gates progress is an email with a keycard, an on-screen alert, or a locked door.

---

## What happened before you arrive

At 04:11 one morning, an alert fired. Nobody read it, because at 04:11 every alert is the backup job and the night shift stopped reading those months ago.

At 04:15 ZERO disabled Gh0st's account. Standard, the account had been terminated.

At 04:17 Gh0st's account logged in again, from an address outside the building.

At 04:19 that account read a file it had no business reading.

Somebody eventually noticed and filed **ticket #4344**. ZERO marked the incident closed, evidence inconclusive. The ticket itself stayed open, because the maintenance route attached to it was still running and closing the ticket would have raised a second incident. ZERO does not open incidents. So #4344 sits there, closed and open at the same time, and everything you need is inside it.

Everything in the game grows from that one night:

- Puzzle 1's password is sitting in that open ticket.
- Puzzle 2 is the log nobody read.
- Puzzle 4 is a maintenance route authorised for #4344 and never switched off, because the ticket never closed.

---

## Who you are

You answered a job advert. You are here for an evaluation.

The advert was not real. It came from an internal HEXCORE account that was closed months ago, and it went to you specifically. Gh0st put you on the candidate list before leaving, then waited. Nobody at HEXCORE reviewed it, because reviewing the candidate list is ZERO's job and ZERO had already marked the list clean.

You do not know any of that in the lobby. You find out at the end.

You are not a hacker. You have no skills the game has to teach you. What you have is a terminal, `nb:menu`, and a willingness to read things other people ignored. Every single thing you break, you break using something HEXCORE left lying around. The password was in a ticket. The log was on a rack. The route was still authorised. The keycard belonged to a contractor who never handed it back.

That is the point of the whole game. You do not defeat HEXCORE's security. You bypass it using specific already exploited routes. But be careful as SENTINEL and ZERO are still watching.

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
| Nether (after Puzzle 3) | Angry. Corporate language slipping. It threatens your candidacy. |
| After Puzzle 4 | Furious and glitching. It is quoting policy at you mid-sentence. |
| The End (after the boss) | Barely holding together. Pieces of a different voice showing through. |
| Root | Freed. |

The turn at the end is that HR_BOT was never angry at you. It was the only part of HEXCORE that could still talk, and it was being made to say those things. When root goes through and the system shuts down, HR_BOT stops reciting policy for the first time in the game and says one short, calm thing in its own voice.

That is also the moment where Gh0st's motive can land, if you want it to land.

> **Build note.** Only the lobby greeting is in scope right now. HR_BOT currently just welcomes players in the lobby as a chat greeting. The full escalation arc above is deferred and not being built yet. More bots may be placed around later; ignore the per-stage schedule until then.

---

## The shape of it

**Lobby.** HR_BOT welcomes you in chat. ZERO warns you that every command is logged and hacking will be punished. A PC in the lab has one email from Gh0st: HEXCORE is the target, I left the way in, follow the trail. The email is addressed to you by the name on your application, which is the first sign that this was arranged.

**eth0, the corporate floors.** Two puzzles. You find a password in a ticket, then prove an incident that was closed too fast. This is the human floor, and every failure here is a human one. Somebody was tired. Somebody wanted the report to say nothing. Somebody stopped reading the alerts.

**eth1, restricted services.** Two puzzles. No people, only machines that were switched on years ago and never checked. You decode a byte Gh0st recovered, and you find the maintenance route that #4344 authorised, still open, still valid, still waiting.

**eth2, the core.** The boss and one last puzzle. Air-gapped, so the only way in is the physical one Gh0st already used once. First the core defends itself: the Sculk Sentinel, where SENTINEL stops counting and starts existing. You fight it with what HEXCORE left at the staging pad. With the core defense down, one lock remains, a port knock sequence that Gh0st scattered across all three networks, one clue per dimension, so you have to have actually been everywhere to open it.

**Root.** The system reports integrity failed and shuts down. Connection lost. The lights come back on and you are put back in the lobby.

Then one more email.

```
Root confirmed. It's shutting down.
Told you the breadcrumbs were worth following.
Nice work.
- G
```

---

## The thing the ending does not answer

Gh0st left a trail. Gh0st left a keycard where you would find it. Gh0st left a route controller running, and three port knock clues spread across three networks in the exact order a stranger would need them.

That is not a terminated employee leaving evidence behind. That is a person who wrote the job advert that brought you here, planted a keycard where you would find it, and waited months for you to walk through the front door.

You were never a candidate. You were the exploit.

What Gh0st wanted the building shut down for is never explained. The lights go out. Nobody tells you anything.
