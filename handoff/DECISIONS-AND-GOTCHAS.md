# Decisions and gotchas

Things that cost real time to discover. Read this before changing architecture
or debugging something that "should work".

---

## Platform

### Why a PWA and not a native app

App Store review, a $99/yr Apple developer account, and TestFlight for every
change — for a one-person shop with one phone. The PWA installs to the home
screen, works offline, and updates without her doing anything.

An independent evaluation (`alternatives-report.md`) weighed this against
alternatives and concluded the PWA is right for the *experience*, while noting
two genuine costs: Square never learns item-level detail (the POS hand-off
carries a total plus a text note, nothing more), and there's no item-level
sales analytics as a result.

### The service worker will pin the app to a stale build — this already happened

**The single most expensive bug in this project.** `sw.js` was originally
cache-first for every request. Once `index.html` was cached, the phone served
that copy forever. Five rounds of shipped fixes deployed correctly to the site
and **never reached the installed app**. Force-quitting doesn't help: the worker
answers before the network, and the browser had no reason to fetch a new worker
because `sw.js` itself never changed.

It surfaced as the owner reporting "it didn't work" with no other detail.

Current strategy (do not regress this):

| Request | Strategy |
| --- | --- |
| The page (`navigate`, `/`, `/index.html`) | **network-first**, cache fallback |
| `square-catalog.json`, `square-photos/` | **network-first**, cache fallback |
| Everything else, same-origin | **stale-while-revalidate** |

Nothing depends on remembering to bump a version string, which is exactly what
failed. `activate` also carries synced catalog and photos forward across cache
versions so an app update can't wipe the offline menu.

**`APP_BUILD` in `index.html` prints at the bottom of Edit Menu.** Bump it with
every user-visible change — when the owner says something isn't working, the first
question is what version her phone reports.

### GitHub Pages needs a paid plan on a private repo

The repo is private, so Pages requires GitHub Pro (~$4/mo), which the owner
bought. A workflow **cannot** enable Pages itself — `actions/configure-pages`
with `enablement: true` fails with `Resource not accessible by integration`
because the built-in token is refused by that endpoint. Enabling Pages is a
one-time human click: Settings → Pages → Source → **GitHub Actions**.

Also: the Pages *site* is public even though the repo is private (private Pages
is Enterprise-only). That's what we want — her phone and Square must reach it
without a login — but it means the synced catalog is publicly fetchable by URL.

---

## Square

### Two credentials, two very different places

| Credential | Secret? | Where |
| --- | --- | --- |
| **Access Token** (`EAAA…`) | Yes | GitHub repo secret `SQUARE_ACCESS_TOKEN` — never in the page |
| **Application ID** (`sq0idp-…`) | No | Pasted into the app, Edit Menu → Square |

Square POS answers a wrong `client_id` with a bare *"your application ID was
invalid"*, which doesn't say which of the look-alike credentials got pasted.
`diagnoseAppId()` names the mistake — Access Token, or a Sandbox ID — and blocks
the hand-off before the screen flips. Anything unrecognised only warns, so an
unfamiliar future format can never strand a sale.

**Sandbox does not work with the Point of Sale API at all.** There is no test
mode; the first real charge is a real (refundable) transaction.

### The POS callback does not reach a home-screen app

iOS keeps Safari's storage separate from a home-screen web app's. Square's
return trip opens in Safari, so the app's "payment recorded" handler runs
against the *wrong* storage. This is a platform limitation, not a bug.

The app compensates: it records `tally.pendingCharge` **before** app-switching,
and on return asks *"Did the $X payment finish?"* — Paid clears it, Not paid
keeps the build. The same guard stops a second Charge tap re-sending the total.

**Do not "fix" this by trusting the callback.** It works in Safari and not from
the icon, and the icon is how she uses it.

### Import quirks, all found against real data

The fixture in `run_tests.sh` deliberately reproduces these:

- **Category prefix ≠ category name.** Her category is `Hats`; item names are
  prefixed `HAT:`. A pattern built from the category name never matched, so
  every hat kept its prefix. `cleanName()` also strips any all-caps `WORD:`.
- **`+ Basic Customization Package` suffixes** restate what the price already
  includes — stripped.
- **`Copy` tails** from duplicating items in the Square dashboard — stripped,
  including repeats.
- **Square returns categories alphabetically**, which put `Bands` first and
  `Hats` **last** — the customer would have picked bands before the hat.
  Imported sections are forced into build order: Hats → Hat Upgrades → Bands →
  Feathers → Details.

### Re-import merges; it does not replace

Imported items carry their Square id (`sqId`). On re-import, Square owns names,
prices and photos; **the owner owns** the `$N+` flags, camera-roll photos
(a `data:` URI beats Square's), notes and ordering. Items she added by hand have
no `sqId` and are never touched. Items deleted in Square are removed.

The **first** import is still a replacement — the menu holds sample items at
that point — and asks for confirmation. Later imports are silent unless a hat is
in progress.

---

## Testing

`handoff/tests/run_tests.sh` — 124 checks in a real Chromium at iPhone viewport
(393×852). It stashes the real `square-catalog.json` / `square-photos/`, swaps
in a fixture, and restores them via an `EXIT` trap. **Never let the suite delete
the synced data** — an earlier version did.

**Preview against the real catalog, not just the fixture.** Three genuine bugs
were caught only by rendering the actual 39-item library: the alphabetical
section order, the surviving `HAT:` prefixes, and a section header billing
allowance-covered units that the total correctly made free.

`preview_grid.js` / `preview_mm.js` patterns (import real catalog → screenshot)
are worth recreating when changing layout.

### Test-order coupling

The suite is one long session, so state carries between blocks. Several failures
during development were tests perturbing later ones — a `variable` flag left on
Signature Band turned a stepper into a price sheet; changed prices broke
downstream totals. **If you add a block that mutates the catalog, restore it at
the end.** There's a cleanup block after the trade-up credit tests doing exactly
this.

---

## Workflow notes

- The working branch is squash-merged, so it diverges from `main` every time.
  Rebase with `git rebase --onto origin/main HEAD~N` before opening the next PR,
  or the merge conflicts.
- Two GitHub Actions: **Sync Square catalog** (weekly Monday + manual) and
  **Deploy to GitHub Pages** (push to main + after a sync via `workflow_run` —
  token-authored pushes don't fire `push` triggers, which is why the chain
  exists).
- `git push` from this environment sometimes needs `--force-with-lease` after a
  squash merge. Verify with `git diff --stat origin/<branch> origin/main` first;
  empty means the branch content is already merged and safe to reset.
