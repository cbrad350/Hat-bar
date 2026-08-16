# Hat Bar Tally

Register app for **Details Austin**, a custom hat bar. In production — the owner
rings up real customers on it. Live at https://cbrad350.github.io/Hat-bar/

**New here? Read `handoff/README.md` first.** It indexes everything below and
takes about fifteen minutes.

## Architecture

Zero dependencies, no build step. `index.html` is the entire app — UI, styles
and logic. `sw.js` provides offline support, `scripts/sync-square.js` runs in a
GitHub Action to pull the Square catalog, and GitHub Pages serves it all.

## Before changing pricing

Read `handoff/BUSINESS-RULES.md`. The model has a no-deducts rule *and* a
trade-up credit that looks like it contradicts it but doesn't. Requirements
arrive by voice-to-text and garble; confirm before building anything that moves
money.

## Before changing caching

Read the service-worker section of `handoff/DECISIONS-AND-GOTCHAS.md`. A
cache-first worker once pinned the owner's phone to the first build ever
deployed, silently swallowing five rounds of fixes. The page must stay
network-first, and `APP_BUILD` must be bumped with every user-visible change.

## Testing

```sh
cd handoff/tests && ./run_tests.sh      # 124 checks, expect exit=0
```

Also preview against the **real** synced catalog, not only the fixture — three
genuine bugs were visible only with her actual 39 items.

## Shipping

test → commit → PR → merge → **verify the deploy succeeded** via the Actions
API. This environment cannot fetch `github.io`, so a green deploy run is the
strongest confirmation available here; the owner is the only one who can
confirm visually.

The working branch is squash-merged, so it diverges from `main` each time —
`git rebase --onto origin/main HEAD~N` before the next PR.
