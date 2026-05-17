# In-Game Sign Text
## All signs grouped by area and character voice

---

## Overworld — eth0

### Entrance / Lobby

**Sign 1 — Main entrance (from ZERO):**
```
HEXCORE STAGING ENV
v2.7.1 — CANDIDATE BUILD
Time limit: 90 min
Your actions are logged.
Good luck. You'll need it.
```

**Sign 2 — Security desk (from ZERO):**
```
If you're reading this,
you know what ls does.
Congratulations.
That's the bar. It's low.
Keep going.
```

**Sign 3 — Policy board (generic corporate):**
```
SECURITY POLICY
Password rotation: 90 days
(Last rotation: 14 months ago)
Ticket #4471: OPEN
Priority: Low
```

---

### Server Room (near credential chest)

**Sign 4 — On the credential chest (from GHOST):**
```
Password: admin123
— Yes, really.
— I filed a ticket.
— Ticket #4471. Still open.
— Good luck out there.
```

**Sign 5 — Server rack nearby (from GHOST):**
```
sshd: port 22 (active)
httpd: port 80 (active)
mysqld: port 3306 (active)
firewall: cameras on corridor
(three ports are open, two are fake)
```

**Sign 6 — On a wall near the rack (from ZERO):**
```
If you found the key without
reading the room first,
we need to talk about
your methodology.
```

---

### Security Operations Center (near log analysis sign)

**Sign 7 — Main SOC board (from GHOST):**
```
AUTH LOG — LAST 7 DAYS
[!] 14 failed sudo attempts
[!] Unsigned binary executed
    by user: g.host@hexcore
[!] IDS rule modified
    at 03:14 UTC — no ticket
Conclusion: insider incident
init sequence: 3-1-4-2
```

**Sign 8 — GHOST's workstation (from GHOST):**
```
they're watching the main
terminal. use the lab entrance.
bypass chip: hardware cabinet
second shelf. don't tell zero.
— G
```

**Sign 9 — Incident board (from ZERO):**
```
INCIDENT — OPEN
Reporter: g.host@hexcore
Status: employee terminated
Evidence: inconclusive
Note: breadcrumbs may remain
in environment. Ignore them.
(or don't. your call.)
```

---

### Hardware Lab (near IDS bypass chest)

**Sign 10 — Cabinet label (from GHOST):**
```
IDS BYPASS MODULE
Rev 3.1 — prototype
"for testing purposes only"
(it works. trust me.)
— G
```

**Sign 11 — Lab wall (from ZERO):**
```
Supply chain note:
This hardware was audited.
We found nothing.
GHOST found something.
We are hiring someone
to make sure that
doesn't happen again.
That might be you.
```

---

## Nether — eth1

### Portal room (entrance)

**Sign 12 — Nether portal frame (from ZERO):**
```
eth1 — RESTRICTED SERVICES
Camera puzzle required to enter.
If you're here without solving it,
SENTINEL already knows.
```

**Sign 13 — Warning post (from SENTINEL):**
```
[SENTINEL]
Unauthorized access logged.
Guards deployed.
This is your only warning.
(It is not a warning.)
```

---

### Admin Workstation (near hash crack puzzle)

**Sign 14 — On the workstation (from GHOST):**
```
sudo password hash:
5e884898da28047151d0e56f
SHA-256, single round.
levers = binary representation.
left = MSB. right = LSB.
the answer is simpler
than you think.
— G
```

**Sign 15 — Puzzle instruction (from ZERO):**
```
HASH CRACK PANEL
Set levers to match
binary value of hash byte 3.
All ON = 1. All OFF = 0.
Wrong sequence = +15 noise.
Don't guess. Think.
```

**Sign 16 — Nearby wall (from GHOST):**
```
"password" in SHA-256:
5e884898da28...
byte 3 = 0x48 = 72 decimal
= 01001000 in binary.
You're welcome.
(if you needed this hint,
maybe apply for junior.)
```

---

### Compromised Server (DELTA NPC area)

**Sign 17 — Server nameplate:**
```
DELTA_SRV_04
Internal routing node
eth1 → eth2 bridge
Status: COMPROMISED
```

**Sign 18 — Near DELTA (from GHOST):**
```
delta still has a pivot route
to eth2. auth with admin creds.
it'll give you the path.
don't restart it — it'll wipe
the routing table.
```

---

## The End — eth2

### Portal / Entrance

**Sign 19 — End portal frame (from ZERO):**
```
eth2 — AIR-GAPPED CORE
Cold storage. Isolated.
You shouldn't be here.
Since you are:
key vault → far island.
master panel → central node.
Don't sprint.
SENTINEL is still watching.
This is the final exam.
```

---

### Encryption Key Vault (far island)

**Sign 20 — Vault door (from ZERO):**
```
ENCRYPTION KEY VAULT
Cold storage — offline backup
Access: physical only
If you found this digitally,
something has gone very wrong.
(Something has gone very wrong.)
```

**Sign 21 — Inside the vault (from GHOST):**
```
XOR key pair:
left bank = key A
right bank = key B
result = A XOR B
set both banks to match
the target on the wall.
this is the last one.
good luck.
— G
```

---

### Master Control Panel (central node)

**Sign 22 — Panel label (from ZERO):**
```
MASTER CONTROL PANEL
System Core — Final Lock
Activation sequence: 4 steps.
The sequence is in the logs.
It always is.
One shot. Make it count.
```

**Sign 23 — Final ZERO message (after victory):**
```
You made it.
That's either impressive
or you got lucky.
We'll find out which one
at the interview.
Report to:
careers@hexcore.io
Subject: null://root
Don't be late.
```
