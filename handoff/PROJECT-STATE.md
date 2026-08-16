# Project state

Last updated against `main` @ `c093151`, build `2026-08-11 · trade-up`.

---

## What this is

**Hat Bar Tally** — a register for Details Austin, a custom hat bar in Austin,
TX. The owner builds a hat with the customer on one iPhone, then takes payment
through Square. Live at **https://cbrad350.github.io/Hat-bar/**, installed to the
home screen.

Zero dependencies, no build step. `index.html` is the entire app.

## Who's who

- **Requester** — the owner's husband, non-technical, wants this as hands-off as
  possible. Communicates by phone, sometimes voice-to-text (garbles badly on
  pricing details — confirm before building anything involving money).
- **Owner** — his wife, runs the hat bar. Uses the app at the counter.
- GitHub account `cbrad350` (created for this project; he also has a personal
  account, which caused a confusing 404 on the private repo).

## Status

| Piece | State |
| --- | --- |
| App | Live, working end to end — confirmed by the owner |
| Square catalog | 39 items, 24 photos, synced |
| Weekly auto-sync → auto-redeploy | Verified working |
| Payments via Square POS | Working |
| Settings backup/restore | Built, live |
| Allowance pricing | Built, live — **needs her to link the 4 allowances** |
| Trade-up credit | Built, live — **needs the credit toggle turned on for bands** |

## Setup steps still owed by the owner

1. **Turn on the credit toggle** for Signature Bands (and Feathers, if unused
   feathers should credit toward Luxe Feathers). Edit Menu → Included With Hat.
   Off by default so pin/brand don't credit.
2. **Verify the allowance links** are set for all four included lines — the app
   shows a red "⚠ Not linked" if not.
3. **Save a backup** after the above (Edit Menu → Backup → share sheet → Mail it
   to himself, not just Save to Files — a backup on the same phone doesn't
   survive losing the phone).
4. **10 items have no photo**, six of them the entire Details section. She adds
   them in Square; they arrive on the next sync. Highest-value remaining task
   and requires no code.

## Open work, roughly by value

1. **Signature / Deluxe Hat Experience tiers** — requested, blocked on missing
   details. See the bottom of `BUSINESS-RULES.md` for exactly what to ask.
2. **Customer-facing menu mode** — same page with Charge/Edit hidden, for a QR
   code or counter tablet. Scoped, not started. Upsell value.
3. **Square POS as a manual fallback register** — dashboard configuration, no
   code. Insurance if the app fails mid-rush. Detailed in
   `alternatives-report.md`.
4. **Photo recognition** — the requester asked whether photographing a finished
   hat could price it. Explicitly **parked** ("dont build it yet"). Assessment:
   viable only as a *verification* step ("I see 4 feathers, you charged for 3"),
   not as the tally — it needs a server for the API key, and distinguishing
   similar bands under a brim is unreliable enough to cost real money.

## Known data issues on her side

- `Queens Woven Straw Cowboy with - White` — stray "with" in the Square item
  name. Will keep returning until fixed at the source.
- No discount codes defined yet.

## Environment

- Repo `cbrad350/Hat-bar`, **private**, GitHub Pro (needed for Pages).
- Secret `SQUARE_ACCESS_TOKEN` is set and working.
- Square Application ID lives on the phone, not in the repo.
- The requester cannot be helped by driving his browser — this environment has
  no access to his machine. Give him direct URLs; he had trouble finding repo
  settings and the Pages page more than once.
