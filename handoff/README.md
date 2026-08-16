# Handoff — start here

You've picked up **Hat Bar Tally**, a working register app for Details Austin, a
custom hat bar. It is **in production** — the owner rings up real customers on
it. Nothing here is greenfield.

Read in this order. It's about fifteen minutes.

| # | File | Why |
| --- | --- | --- |
| 1 | **`PROJECT-STATE.md`** | Where things stand, who's who, what's owed by whom |
| 2 | **`BUSINESS-RULES.md`** | The pricing model. **Read before touching money code** — some rules reversed mid-project and the reasons matter |
| 3 | **`DECISIONS-AND-GOTCHAS.md`** | Hard-won knowledge. The service-worker section alone will save you a day |
| 4 | `alternatives-report.md` | Independent evaluation of whether this approach was right at all, with cited Square docs |
| 5 | `../README.md`, `../SQUARE_SETUP.md` | The app's own docs — architecture and the owner-facing Square walkthrough |

## Verify your setup

```sh
cd handoff/tests
npm install          # playwright-core
python3 -m pip install pillow
./run_tests.sh       # expect: ALL CHECKS PASSED, exit=0
```

124 checks in a real Chromium at iPhone size. If Chromium lives somewhere
unusual, set `CHROME_PATH`. The script stashes the real synced catalog, runs
against a fixture, and restores it — **don't bypass that**, an earlier version
deleted the live data.

## The five things most likely to bite you

1. **The service worker can pin the app to a stale build.** This cost five
   rounds of shipped fixes that never reached the phone. Current strategy is
   network-first for the page — don't regress it, and bump `APP_BUILD` on every
   user-visible change.
2. **"No deducts" and the trade-up credit both exist.** They are not
   contradictory. `BUSINESS-RULES.md` §3 and §4.
3. **Preview against the real catalog, not just the fixture.** Three real bugs
   were only visible with her actual 39 items.
4. **The Square POS callback can't reach a home-screen app** — iOS storage
   partitioning. The "Did the payment finish?" prompt is the deliberate
   workaround, not a missing feature.
5. **Confirm anything about pricing before building it.** Requirements arrive by
   voice-to-text and garble exactly where it's most expensive to guess.

## Working style that fit this client

- He wants it hands-off. Do the work, merge it, verify the deploy, then tell him
  what to tap. Give **direct URLs** rather than navigation instructions.
- Verify deploys via the Actions API before claiming something is live. This
  environment's egress blocks `github.io`, so the site itself can't be fetched
  from here — the owner is the only one who can confirm visually.
- Every change: test → commit → PR → merge → confirm the deploy succeeded.

## Layout

```
handoff/
├── README.md                   this file
├── PROJECT-STATE.md            status, people, open work
├── BUSINESS-RULES.md           pricing model + what's still unspecified
├── DECISIONS-AND-GOTCHAS.md    architecture decisions, traps
├── alternatives-report.md      independent evaluation, cited
└── tests/
    ├── run_tests.sh            fixture setup + restore, run this
    ├── test_app.js             124 checks
    ├── make_icons.py           regenerates app icons
    └── package.json
```
