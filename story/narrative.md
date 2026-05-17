# NULLBYTE — The Hiring Protocol
## Story & Lore Document

---

## Background

HEXCORE is an offensive security firm that doesn't advertise jobs. They never have.

Every quarter, they plant a single challenge somewhere on the internet — a corrupted pixel in a favicon, a malformed HTTP header on their status page, a base64 string hidden in the alt text of their 404 image. Candidates who find it and decode it receive a single encrypted message. The message always contains the same three things: a Minecraft Realm code, a time window, and this text:

> "This is our staging environment. It replicates one of our live client engagements.
> Your job: get root access. You have 90 minutes.
> Every command is logged. Every mistake is scored.
> Credentials are in the building. GHOST left them behind.
> Don't embarrass yourself.
>
> — ZERO"

That's the entire job posting.

The staging environment is a Minecraft Bedrock Realm. No commands, no terminals — just hardware puzzles, locked vaults, security cameras, and a very patient defense AI watching every move.

---

## Characters

### ZERO
The CISO of HEXCORE. Nobody on the team has ever seen their face. They communicate only through in-game signs, terminal output, and encrypted notes scattered across the map. ZERO built the staging environment personally. They have a dry, unsentimental sense of humor and no tolerance for candidates who skip the recon phase.

Sample ZERO quotes (on signs around the map):
- "If you're reading this, you at least know what `ls` does. Congratulations."
- "The credential is in the server room. Yes, on a sticky note. That's not a joke. That's Tuesday in most enterprises."
- "You found the encryption key. Either you're good, or you got lucky. We'll figure out which one at the interview."
- "SENTINEL is not your enemy. Your enemy is noise. SENTINEL is just the consequence."

### GHOST
A former HEXCORE developer who went rogue — or was set up. Nobody is sure. GHOST left behind exploit tokens, bypass chips, and breadcrumbs throughout the Overworld before disappearing. Whether GHOST is a whistleblower, an insider threat, or a plant by ZERO to test candidates is deliberately ambiguous. Candidates who read the logs carefully will find conflicting evidence.

GHOST's notes are written in a hurry — typos, truncated sentences, a sense of paranoia:
- "they're watching the main terminal. use the lab entrance. the bypass chip is in the hardware cabinet, second shelf. don't tell zero i left this here"
- "default creds haven't been rotated in 14 months. i filed the ticket. nobody cared. now you know."
- "if you're reading this, i'm either fired or worse. the sudo hash is SHA-256. the answer is simpler than you think."

### SENTINEL
The defense AI. SENTINEL is not evil — it's doing its job. But it has opinions about candidates who trigger alarms. Its messages appear on signs and computer mail as noise (traps) escalates.

SENTINEL messages:
- **First alarm triggered:** "Anomalous activity detected. Countermeasures deployed."
- **Second alarm:** "You did it again. IR team is now active."
- **Third alarm:** "At this point I'm just watching. Please continue."
- **If the candidate finishes cleanly:** "Root achieved. 0 alarm triggers. Impressive. Or lucky. We'll find out."

### DELTA
An NPC representing a compromised internal server in the Nether segment. DELTA speaks in corrupted, fragmented system messages — the result of partial compromise. Candidates with admin credentials can interact with DELTA to complete lateral movement. DELTA gives hints but never direct answers.

DELTA sample dialogue:
- "...DELTA_SRV_04... partial session... auth required... fragments available for authenticated users..."
- "[ADMIN SESSION DETECTED] — Pivot route to System Core available via eth2. Encryption layer active. Key in cold storage."
- "...end of recoverable data... good luck..."

---

## The World

The staging environment models a corporate network in three segments. Each segment corresponds to a Minecraft dimension. Progression between them is gated by physical puzzles — locked vaults, redstone combination panels, and item-frame relay circuits. No commands. No scripts. Just locks and the ability to figure out how to open them.

### Overworld — eth0 — Corporate Network (User Space)

A sprawling corporate campus. Server racks made of iron blocks and observers. A security operations center with glass walls. A hardware lab with locked iron doors. HR offices with bookshelves full of useless policy documents. A break room with a sign that says "PLEASE WASH YOUR MOBS."

The Overworld is deliberately messy and realistic. Cables (redstone) run visibly between rooms. Not everything is labeled. GHOST's breadcrumbs are here — but players have to look for them.

The tone is: corporate chaos. The kind of place where critical credentials are on sticky notes because the ticketing system is down again.

### Nether — eth1 — Restricted Services (Internal Network)

Hot. Red. Loud. The Nether represents HEXCORE's internal services segment — the part of the network that was never meant to be touched by outsiders. Exposed pipes (lava channels) represent unencrypted data flows. Bastions represent hardened service nodes. Nether brick server racks line the walls.

The Nether is where the real infrastructure lives — and where GHOST clearly spent a lot of time. Signs here are older, more confident. GHOST knew this network.

The tone is: this is the real work. The Overworld was just the lobby.

### The End — eth2 — System Core (Air-Gapped Cold Storage)

Silent. Isolated. The End island represents HEXCORE's air-gapped core — encryption key vaults, the master control terminal, the final system lock. There are no spawning mobs here by default. The silence is intentional. The only sounds are the player's footsteps and the ambient hum of the void.

A single sign at the entrance, from ZERO:
> "eth2. Air-gapped. Cold storage. You shouldn't be here.
> Since you are: the key vault is at the far island.
> The master panel is at the central node.
> Don't sprint. SENTINEL is still watching.
> This is the final exam."

The tone is: you made it. Don't blow it now.

---

## The Twist

Candidates are told they are the only one running the environment. They are not. Up to 10 candidates run simultaneously on the same Realm. The first to achieve root (open the final vault and read the ROOT_ACCESS_GRANTED written book) gets the senior offer. Everyone else is ranked by the evaluation criteria: puzzles completed, alarms triggered, and time taken.

The leaderboard (a scoreboard display in the Overworld lobby) shows live rankings by noise score, not by permission level. The quietest candidate often wins — not the fastest.

---

## Ending

When a candidate opens the final vault and reads the `ROOT_ACCESS_GRANTED.txt` written book, the victory sequence plays:

1. All guard mobs despawn (spawner boxes connected to command blocks are disabled by the winning player stepping on a pressure plate at the vault exit)
2. Firework dispensers fire around the central End island
3. A command block broadcasts a message to all players:
   > "[SYSTEM] Root access granted to [playername]. Staging environment terminated."
4. The final vault contains a personal written book from ZERO:
   > "You made it. Report to careers@hexcore.io within 48 hours."
   > "Subject line: null://root"
   > "Don't be late. We're not patient people."
5. All other active candidates receive a chest containing a written book:
   > "[SYSTEM] HEXCORE staging environment terminated by root compromise. Session ended."
   > "Your evaluation report will be sent within 24 hours."
   > "Thank you for playing. Or trying to."

---

## Tone Summary

The game is dry, technical, and occasionally funny in the way that only people who have worked in security will find funny. It respects the intelligence of the candidates. It does not explain what binary means. It does not hand-hold. The humor comes from ZERO's flat corporate voice, GHOST's paranoid scrawl, and SENTINEL's escalating passive aggression — not from jokes.

The addons (vaults, laser pistols, cameras, computers) provide the physical metaphor for real concepts: vaults are credential stores, cameras are IDS sensors, laser pistols are exploit tools, computers are the lore layer. None of this needs scripting. It needs thoughtful map design and good writing on the signs and computer mails.

Candidates who get it, get it. Candidates who don't, probably aren't the right hire.
