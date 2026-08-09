# Square Setup — the complete walkthrough

This guide connects Hat Bar Tally to the shop's Square account. It is written for
someone who has never used an API before. Budget about 30 minutes, and do the phone
steps on the iPhone that lives at the hat bar.

There are **two separate connections**, and they use **two different codes** from the
same Square application:

| Connection | What it does | Code it uses | Where the code goes |
| --- | --- | --- | --- |
| **1. Catalog sync** | Copies your Square item library (names, categories, prices, photos) into the app's menu | **Access Token** (secret — like a password) | A GitHub *repository secret*. Never in the app. |
| **2. Charge button** | Opens the **Square Point of Sale app** on the phone with the total, so you take payment there (tap-to-pay, reader, cash) | **Application ID** (`sq0idp-…` — public, not a secret) | Pasted into **Edit Menu → Square** in the app |

The Charge button uses Square's **Point of Sale API** (an "app switch": your register
page opens the Square POS app, Square takes the payment, then hands control back).
The catalog sync uses Square's **Catalog API** (a GitHub robot fetches your item
library once a week, or whenever you press the button). No card numbers ever touch
this app — Square handles all payment processing.

---

## Part 0 — Publish the register (do this first)

Square needs to know the register's web address before the Charge button will
work, so put the app online before touching Square.

1. **If the repo is private**, GitHub Pages needs a paid plan: **Settings →
   Billing and licensing → Plans** → upgrade to **GitHub Pro** (about $4/month).
   *(Alternative: make the repo public — Pages is free for public repos. The
   Square access token stays encrypted either way; only the app code and the
   synced item names/prices/photos would become visible.)*
2. Repo **Settings → Pages** → under **Build and deployment**, set *Source* to
   **GitHub Actions**. Save.
   This click cannot be automated — GitHub refuses to let a workflow token
   create the Pages site.
3. Go to the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**.
   (It also runs automatically on every push to `main`.) When it goes green, the
   register is live at:

   ```
   https://YOUR-GITHUB-USERNAME.github.io/Hat-bar/
   ```

4. Open that address in a browser to confirm the hat menu appears. Keep the URL
   handy — Part 3 registers it with Square, and Part 6 opens it on the phone.

## Part 1 — Create your (free) Square developer application

1. On a computer, go to **https://developer.squareup.com** and click **Sign in**
   (top right). Sign in with the **same Square account the shop uses** — the one
   you run the Square Point of Sale app with. Do *not* create a new Square account.
2. The first time, Square asks you to agree to developer terms and opens the
   **Developer Console** (you can always get back to it at
   https://developer.squareup.com/apps).
3. Click **“+”  / Create your first application** (or **+ New application**).
4. Name it something recognizable, e.g. `Hat Bar Tally`, accept the defaults, and
   create it. (Everything here is free — a developer "application" is just a set of
   credentials attached to your Square account.)

## Part 2 — Copy the two production credentials

1. In the Developer Console, click your new **Hat Bar Tally** application to open it.
2. At the top of the page there is a **Sandbox / Production** switch. Switch it to
   **Production**. (Sandbox is Square's practice mode — it does **not** work with
   the Point of Sale app, so everything in this guide uses Production.)
3. In the left pane, open the **Credentials** page. You'll see:
   - **Production Application ID** — starts with `sq0idp-`. This one is *public*;
     it identifies your app. You'll paste it into the register app in Part 6.
   - **Production Access Token** — long random string, hidden behind a **Show**
     button. This one is a **secret**: treat it exactly like your Square password.
     You'll paste it into a GitHub secret in Part 4 — nowhere else, ever.
4. Keep this browser tab open; you'll come back to it.

## Part 3 — Register the register's web address for the Charge button

Square's Point of Sale API refuses to hand results back to a web page it doesn't
recognize, so you must tell Square your register's address (its "Web callback URL")
once:

1. Still inside your application in the Developer Console, look in the **left pane**
   for **Point of Sale API** and click it.
2. Find the **Web** section (it lists **Web Callback URLs**).
3. Enter the register's exact address on GitHub Pages, e.g.:

   ```
   https://YOUR-GITHUB-USERNAME.github.io/Hat-bar/
   ```

   and, on a second line / second entry, the same address ending in the file name,
   because the phone may open it either way:

   ```
   https://YOUR-GITHUB-USERNAME.github.io/Hat-bar/index.html
   ```

4. Click **Save**.

> Why: when the Square POS app finishes a payment it calls back to
> `https://…github.io/Hat-bar/` with the result. Square checks that address against
> this list. If it isn't listed you'll see an error like *"the web callback URL does
> not match"* and the charge hand-off fails.

## Part 4 — Give the GitHub robot the Access Token (catalog sync)

1. Open the repo on GitHub → **Settings** tab → in the left sidebar,
   **Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `SQUARE_ACCESS_TOKEN` (exactly, all caps).
4. Value: back in the Square **Credentials** tab, click **Show** next to
   **Production Access Token**, copy it, and paste it here.
5. Click **Add secret**. GitHub stores it encrypted; it is only ever readable by the
   sync robot, never by the web page or anyone browsing the repo.

## Part 5 — Run the catalog sync and import it on the phone

1. On GitHub → **Actions** tab → in the left list choose **Sync Square catalog** →
   **Run workflow** → green **Run workflow** button.
2. Wait for the green check (a minute or two). This fetched your whole Square item
   library — items, categories, prices, product photos — and committed it to the
   repo as `square-catalog.json` + `square-photos/`. It also re-runs itself every
   Monday automatically.
3. On the iPhone, open Hat Bar Tally → **Edit Menu** (pencil) → scroll to the
   **Square** card → tap **⟳ Import items & photos from Square** → confirm.
   Your menu now mirrors the Square library (the HAT category becomes the pick-one
   Hats section; other categories become the mix-&-match sections).
4. Whenever the Square library changes: re-run the Action (step 1), then re-import
   (step 3) — or just wait for Monday's automatic sync and re-import.

## Part 6 — Paste the Application ID into the app

1. On the iPhone, in Hat Bar Tally → **Edit Menu** → **Square** card.
2. In **Application ID (for the Charge button)** paste the **Production Application
   ID** from Part 2 (`sq0idp-…`). It's saved on the phone instantly.
3. Make sure the **Square Point of Sale** app (the free one from the App Store) is
   installed on this same iPhone and signed in to the shop's Square account.

## Part 7 — The first $1 test charge

The Point of Sale API has **no practice mode** (Square's sandbox does not support
it), so the test is a real — but tiny and refundable — transaction:

1. In Hat Bar Tally, add any item, then edit or pick something so the total is small
   (or temporarily add a $1 test item in Edit Menu).
2. Tap **Charge**. The phone should flip to the **Square Point of Sale** app showing
   the exact total, with the itemized order in the note.
3. **Dry run with cash first**: in Square POS choose **Cash** as the payment method
   and complete it. Nothing is charged to any card; a $1 cash sale is recorded, which
   you can leave (or delete from the Square Dashboard's transactions).
4. **Then a real card**: repeat with $1, pay with a real card via your reader or
   tap-to-pay, then in Square POS (or the Square Dashboard → Transactions) issue a
   **refund** for it. Square refunds the processing fee on refunds.
5. After Square finishes, the phone hands control back to the register page.
   **Heads-up:** if you launched Hat Bar Tally from its home-screen icon, the return
   trip opens in the **Safari browser** instead of the home-screen app (an iPhone
   limitation — see Troubleshooting). The payment is recorded in Square either way.
   When you switch back to the register app, it asks **"Did the $X payment
   finish?"** — tap **Paid — clear it** and it resets for the next customer
   (tap **Not paid — keep tally** if the charge didn't go through, so you can
   fix things and Charge again).

Done. Daily flow: build the hat → Charge → take payment in Square POS → back to the
register → confirm "Paid — clear it".

---

## Troubleshooting

**Tapping Charge does nothing / "address invalid" pops up.**
The Square Point of Sale app isn't installed on this phone (or you're on a device
without it, e.g. a laptop). Install "Square Point of Sale" from the App Store and
sign in. The Charge button only works on the iPhone with Square POS installed.

**Charge opens Square POS but it shows an error instead of the total.**
- *"…callback URL does not match"* — Part 3 wasn't done, or the address you
  registered isn't exactly what the phone uses. Register **both** forms
  (`…/Hat-bar/` and `…/Hat-bar/index.html`), with `https://`, no typos, and Save.
- *Not logged in* — open Square POS and sign in to the shop's account first.
- *Unsupported version / can't process* — update the Square POS app in the App
  Store (old versions don't understand newer requests).
- *Amount errors* — the total must be at least $1.00 for card payments.
- App ID rejected — make sure you pasted the **Production** Application ID
  (`sq0idp-…`), not the Sandbox one (`sandbox-sq0idb-…`) and not the Access Token.

**Payment went through, but I never saw "Payment recorded in Square ✓" back in the app.**
Expected when the register runs as a home-screen app. iPhone home-screen web apps
and Safari are walled off from each other (separate storage), and Square's return
trip opens in Safari — so the confirmation toast appears in a Safari copy of the
page (which may even show the default menu, since your edits live in the home-screen
app's own storage). **The sale is safely recorded in Square regardless** — verify in
Square POS → Transactions. That's exactly why the register asks **"Did the $X
payment finish?"** whenever you come back after a Charge: answer **Paid — clear it**
(reset for the next customer) or **Not paid — keep tally** (nothing sent, keep
building/charging). The same guard means tapping Charge again before answering
re-asks instead of silently sending the same total to Square twice. If you want the
fully automatic confirmation-and-reset round trip, run the register in Safari itself
instead of from the home-screen icon; everything else works the same.

**The Sync Square catalog action fails.**
Open the failed run in the Actions tab and read the last lines:
- `SQUARE_ACCESS_TOKEN is not set` — Part 4 secret missing or misnamed
  (must be exactly `SQUARE_ACCESS_TOKEN`).
- `Square API 401` — the token is wrong, expired, or was revoked. Generate/copy a
  fresh **Production Access Token** (Credentials page) and update the secret
  (Settings → Secrets and variables → Actions → `SQUARE_ACCESS_TOKEN` → Update).
- `Square API 403` — the token doesn't have catalog permission; personal access
  tokens from your own app have full account access, so this usually means a wrong
  or truncated paste.

**Import says "No synced catalog found".**
The action hasn't run successfully yet (Part 5), or GitHub Pages hasn't redeployed
the new `square-catalog.json` yet — wait a couple of minutes after the action's
green check, then try again with the phone online.

**Items are missing after import.**
Items without a fixed price on any variation are skipped on purpose (the sync log
lists them as `skip (no fixed price)`), and variable-price things are better handled
by the app's own "$N+" items. Give the item a price in Square, re-run the sync,
re-import.

**"Nothing to charge yet."**
The running total is $0 — included items (the allowance) are free and don't count;
add a hat or a paid enhancement first.

---

## Why this integration (and not Square's other options)

For a one-person shop selling **in person on a single iPhone**, with the register
hosted as a **static page** (GitHub Pages — no server, nowhere to keep secrets):

- **Point of Sale API (what this app uses)** — the only Square option that takes
  in-person payments from a plain web page with **zero backend**: the page just
  opens the Square POS app, which does the actual payment with Square's hardware
  (reader / Tap to Pay) at **in-person card-present rates**. No secrets in the page,
  works offline until the moment of payment, and every sale lands in the normal
  Square Dashboard.
- *Web Payments SDK + Payments API* — needs your own server to finish each payment
  (impossible on GitHub Pages) and charges higher online card-not-present rates.
  Built for e-commerce, not a counter.
- *Payment Links / Checkout* — creating a link with the day's custom total requires
  a secret-token API call (again, needs a server), and pre-made links can't carry a
  per-hat total; also online rates. Fine for "pay me later" links, wrong for a
  walk-up register.
- *Terminal API* — requires buying a Square Terminal device **and** a backend that
  sends it checkout commands. Overkill.
- *Invoices API* — sends bills by email/SMS to pay later online. Wrong flow for
  point-of-sale.

## Known gaps (verified against Square's docs, August 2026)

Honest notes where the docs and this app don't perfectly line up:

1. **The payment confirmation doesn't reach the home-screen app.** Square's mobile
   web flow assumes the same browser that started the charge receives the callback.
   On iPhone, the callback opens in Safari, and Apple keeps Safari's storage separate
   from the home-screen app's — so the app's "Payment recorded ✓ + reset" step runs
   in Safari, not in the register you're using. Payments are unaffected. The register
   compensates: it remembers every hand-off and asks **"Did the $X payment finish?"**
   when you return, so a paid tally can't linger, be built on top of, or be charged
   twice — but it's a question, not an automatic confirmation, because iOS gives the
   home-screen app no way to hear Square's answer today.
2. **No sandbox = no true test mode.** Square's sandbox doesn't support the Point of
   Sale API, and the app has no practice switch — the first test charge is a real $1
   transaction (use the cash-tender dry run in Part 7).
3. **Local-file testing can't do the round trip.** If the page is opened as a file
   (not over https), the app substitutes `https://squareup.com` as the callback,
   which isn't a registered callback URL — Charge from a non-hosted copy won't
   return to the app. Test the full flow on the real GitHub Pages address.
4. **The callback URL match is exact.** The app sends its own current address
   (origin + path) as the callback, so the Developer Console list must contain the
   exact address(es) the phone uses — that's why Part 3 registers both the `/` and
   `/index.html` forms.
5. **Receipt note is trimmed to 250 characters.** Square accepts longer notes, but
   very large orders will show a truncated item list in the Square note. The
   charged amount is always exact.
6. **The sync pins Square API version `2025-01-23`.** That's a real, supported
   Square-Version and the pin is deliberate (it keeps Square's monthly API updates
   from silently changing the sync's behavior); it just means the sync doesn't pick
   up newer catalog features until the pin is bumped.
