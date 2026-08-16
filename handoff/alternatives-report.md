# Details Austin Hat Bar — Strategic Alternatives Evaluation

Date: 2026-08-09. Evaluator role: independent product assessment of the current build at
`/home/user/Hat-bar` (zero-dependency PWA + Square POS API app-switch + GitHub Action catalog
sync) against everything else the owner could plausibly use.

Note on sources: `squareup.com` / `developer.squareup.com` were blocked by this environment's
egress proxy, so Square claims below were verified through search-result excerpts of the official
help/dev pages and Square Community threads; each claim cites the page it came from. Anything I
could not verify to a citation is marked **[verify on device]**.

---

## 1. The Big Question: could pure Square POS do this with no custom app?

### What Square's own products verifiably support

| Capability needed | Pure Square POS (free) | Source |
| --- | --- | --- |
| Item grid with photos, tap-to-add, running itemized ticket | Yes — tile images display on the POS checkout grid | [Set up item grid](https://squareup.com/help/us/en/article/8334-set-up-item-grid), [Square AU visual-browse post](https://squareup.com/au/en/the-bottom-line/inside-square/visual-browse) |
| Priced modifiers on an item (e.g. "Leather Band +$12") | Yes — modifiers can carry a price; seller sets price per option | [Create and edit modifiers](https://squareup.com/help/us/en/article/5119-create-and-manage-item-modifiers) |
| "First 3 included" allowance | Approximable — a $0-priced modifier set ("Included signature bands — choose up to 3") with a **maximum selections** rule; min/max selection rules exist ("If allow more than one modifier is selected, you can set a maximum number of selections") | [Community: Set Minimum and Maximum Number of Choices](https://community.squareup.com/t5/Questions-How-To/Is-there-a-way-to-increase-the-number-of-modifiers-I-can-add-to/m-p/159963) |
| Multiple of the same modifier (2× Luxe Feather) | Yes, behind a toggle — "Allow multiple quantities of a single modifier" when multi-select is on | [Community: Setting Up Modifier Quantities](https://community.squareup.com/t5/Payments-Troubleshooting/Setting-Up-Modifier-Quantities/td-p/338844), [Modifier Quantities beta thread](https://community.squareup.com/t5/Square-Point-of-Sale/Beta-Available-Modifier-Quantities/td-p/105411) |
| "$N+" variable-priced items | Yes as items — leave the price field blank and the register asks for the amount at checkout ("variable item"); **No as modifiers** — "variably priced modifiers are not a feature of Square Point of Sale" | [Community: variably priced item at checkout](https://community.squareup.com/t5/Orders-Menu-Items-Catalog/How-can-I-create-a-variably-priced-item-that-allows-me-to-enter/m-p/751513), [Community: variable price modifier](https://community.squareup.com/t5/Questions-How-to/How-to-create-a-modifier-with-a-variable-price-or-change/m-p/120631) |
| Discounts: %, $, variable, manual or automatic | Yes — discount types Amount / Percentage / Variable amount / Variable percentage, applied manually by the cashier or automatically by rule (incl. customer-group triggers) | [Create and edit discounts](https://squareup.com/help/us/en/article/3955-create-and-manage-discounts), [Apply discounts](https://squareup.com/help/us/en/article/5362-apply-discounts) |
| Itemized receipt to the customer | Yes — native; this is the thing POS does best |
| No-deduct swaps | Trivially yes — simply create no negative-priced modifiers (negative prices are possible but optional) | [Create and edit modifiers](https://squareup.com/help/us/en/article/5119-create-and-manage-item-modifiers) |
| Photos **on modifiers** at the POS | **No** on free Square POS — modifier images can be uploaded but "are currently viewable only within the Square for Restaurants app"; showing them in Square POS is an open feature request | [Community: Modifier images on POS](https://community.squareup.com/t5/Feature-Requests/Modifier-images-on-POS/idi-p/840800), [Community: display modifier image](https://community.squareup.com/t5/Orders-Menu-Items-Catalog/How-can-I-display-a-modifier-image-on-the-Square-for-Restaurants/td-p/676281) |
| Guided step-by-step build flow | Partially — modifier sets pop up in sequence when the hat item is tapped (sets progress from fewest to most requirements), but it is a functional dialog, not a browsable, branded menu | [Community modifier progression thread](https://community.squareup.com/t5/Questions-How-To/Is-there-a-way-to-increase-the-number-of-modifiers-I-can-add-to/m-p/159963) |
| Discount **codes** typed at the register | No — POS discounts are tapped from a pre-made list (or auto-applied); typed coupon codes are a Square Online checkout concept. Functionally equivalent for in-person use: a named discount the owner taps. | [Apply discounts](https://squareup.com/help/us/en/article/5362-apply-discounts) |

Square for Retail / Restaurants paid tiers add inventory depth and menu layouts but nothing this
business needs that free POS lacks ([Merchant Maverick comparison](https://www.merchantmaverick.com/comparing-square-pos-square-for-retail/)).

### How a pure-Square configuration would look

Two workable shapes, no code, no hosting, no GitHub:

- **Modifier-centric:** "Classic Collection Hat $185" and "AHM Collection Hat $225" items, each
  with modifier sets: *Included signature bands (choose up to 3, $0)* → *Included feathers (up to
  3, $0)* → *Included small pin (up to 1, $0)* → *Band upgrades (priced)* → *Feather upgrades
  (priced)* → *Details (priced)*. Tap the hat, walk the popups, done. Weakness: modifier popups
  are text-only, quantities need the toggle, and "$15+ Luxe Band" cannot be a modifier (no
  variable-price modifiers) — it must be rung as a separate blank-price item.
- **Item-grid-centric (closer to the current app's mental model):** a Favorites grid page per
  category (Hats page, Bands page, Feathers page, Details page), every enhancement is its own
  item with a photo tile at list price, variable "$N+" items with blank prices. The owner taps
  through pages exactly like the accordion sections. Every sale is fully itemized in reporting.

### Verdict on the big question

**Pure Square POS gets roughly 80–85% of the desired experience with zero code and zero
maintenance, and is *better* than the custom app on one axis that matters to a business owner:
every sale becomes real line items, so Square reporting shows which bands/feathers actually sell,
attach rates, and category revenue — the current app charges one lump "custom amount" with a text
note, which leaves Square's item analytics permanently empty.**

What pure Square cannot replicate: the branded, photo-rich, customer-facing *menu experience*
(modifier popups have no photos on free POS), the "every hat includes…" allowance banner as a
selling moment, auto-advancing guided flow, and typed discount codes (tap-to-apply named
discounts instead — arguably better in person). Whether that last 15–20% justifies a custom app
is a real judgment call, not an obvious yes — but it is defensible, because the guided visual
experience *is* the product at a hat bar ("delight" drives the $40+ of enhancements per hat).

An important observed fact: the owner's Square catalog must already contain all items with photos
for the current build's sync to work at all. **So the pure-Square register is ~2–4 hours of
dashboard configuration away regardless, and should exist as the fallback register even if the
PWA remains primary.** (As of this evaluation, `square-catalog.json` does not yet exist in the
repo — the sync has never been run — so the Square-side catalog work is still pending either way.)

---

## 2. Hybrid options: can the custom UI push *real line items* into Square?

- **POS API app-switch (current):** passes only `amount_money`, `notes`, tender types, callback.
  No line items — confirmed by the request structure in the
  [Mobile Web technical reference](https://developer.squareup.com/docs/pos-api/web-technical-reference)
  and the [Square Corner Blog walkthrough](https://medium.com/square-corner-blog/building-web-based-points-of-sale-for-android-ios-9dfbc0f261e4).
  This is a hard ceiling: the current architecture can never itemize inside Square.
- **Orders API from the browser:** not viable without a server. Square access tokens must stay
  server-side ("only use OAuth Access Tokens or Personal Access Tokens within BACKEND
  workflows"; browser use is explicitly not recommended) —
  [Access Tokens and Other Credentials](https://developer.squareup.com/docs/build-basics/access-tokens),
  [Create Orders](https://developer.squareup.com/docs/orders-api/create-orders). A thin free
  backend (Cloudflare Worker) could create itemized orders, **but** an API-created order only
  surfaces in Square POS *after it is paid* ("An order appears in … Square Point of Sale if …
  the order includes fulfillment [and] the order is paid") —
  [Orders API: How It Works](https://developer.squareup.com/docs/orders-api/how-it-works),
  [Orders Push beta post](https://developer.squareup.com/blog/orders-push-public-beta/). So you
  cannot "push a cart to the POS and tap to pay there." The pay-first path would require web
  card entry (no Tap to Pay) or **Terminal API + a $299 Square Terminal** as the tap device —
  workable but adds hardware, a backend, and token custody: the opposite of hands-off.
- **Native app + Mobile Payments SDK:** the only path that gives the custom UI *and* real Square
  line items *and* Tap to Pay on iPhone — "Payments taken with the Mobile Payments SDK can be
  linked to Square Order objects to enable itemization" and Tap to Pay is supported (iPhone XS+,
  iOS 16.7+) — [Mobile Payments SDK](https://developer.squareup.com/docs/mobile-payments-sdk),
  [Tap to Pay on iPhone](https://developer.squareup.com/docs/mobile-payments-sdk/ios/tap-to-pay).
  Costs: Apple Developer **organization** account required for the Tap to Pay entitlement
  (a real hurdle for a sole proprietor), $99/yr, App Store review, code signing, update
  maintenance. This is the "right" architecture for a chain; it is over-engineered for one shop.
- **Catalog-as-modifiers + custom app as menu only:** configure Square fully (Section 1) and
  demote the PWA to a beautiful customer-facing menu/spec-sheet (browse, tally as a quote), while
  the owner rings the actual sale in Square POS. Double entry costs ~30–60 seconds per sale;
  in exchange, reporting/inventory is real and the payment path is 100% Square-supported. This
  is the strongest hybrid available **without** any server or App Store involvement.

---

## 3. Alternative platforms

- **Native SwiftUI app:** covered above. Benefits (itemization + Tap to Pay in one app, no PWA
  storage fragility) are real but the overhead (org dev account, $99/yr, review cycles,
  TestFlight builds expiring in 90 days, a developer on call) contradicts "maximally hands-off,
  non-technical owner." Not recommended at this scale.
- **Square Online / product options:** built for self-serve prepaid web orders; option/variation
  UIs exist but the in-person, hands-on styling experience is the product here. Coupon codes do
  exist there (unlike POS). Not a fit as the register; could someday serve gift-card/deposit
  bookings. [Options & Variations vs Modifiers](https://community.squareup.com/t5/Online-Store/Options-amp-Variations-vs-Modifiers/td-p/761926).
- **Square Kiosk (customer self-serve):** requires an iPad, $149 kiosk hardware, and a **paid**
  POS plan (~$50/mo/device tier cited) — [Square Kiosk](https://squareup.com/us/en/hardware/kiosk),
  [fitsmallbusiness kiosk roundup](https://fitsmallbusiness.com/best-self-service-kiosk/).
  Restaurant-oriented; wrong economics for one hat bar.
- **Other no-code POS/menu builders** (Shopify POS, Toast, etc.): all either subscription-priced,
  restaurant-locked, or would abandon the owner's existing Square account/photos — a net loss
  versus configuring Square itself.
- **PWA reality check (what the current choice accepts):** iOS home-screen web apps are exempt
  from Safari's 7-day script-storage cap (they keep "their own counter of days of use" —
  [WebKit ITP coverage](https://www.theregister.com/2020/03/26/apple_relax_were_not_totally/),
  [Didomi summary of the 7-day cap](https://support.didomi.io/apple-adds-a-7-day-cap-on-all-script-writable-storage)),
  but storage is still lost if the icon is deleted or Safari website data is cleared; there is no
  push, no multi-device sync, and the home-screen instance has **storage partitioned away from
  Safari** ([Netguru on PWA/Safari state sharing](https://www.netguru.com/blog/how-to-share-session-cookie-or-state-between-pwa-in-standalone-mode-and-safari-on-ios),
  [MagicBell PWA iOS limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)).
  These are acceptable trade-offs for a single-station register *if* a backup/export path exists
  (it currently does not — see Section 5).

---

## 4. Interface methodology

Two users, two jobs: the **owner mid-rush** (fewest taps, no mistakes, thumb-reachable) and the
**customer browsing** (photos, wants, "ooh add that").

- **Single-scroll accordion (current):** right construction for a one-phone, owner-driven
  register. Auto-advance after the hat pick, +/− steppers, pinned total with expandable receipt,
  and "Next section ↓" are all speed-correct. A full-screen **step wizard** would add taps and
  punish backtracking ("wait, add one more feather") — worse for the rush. **Receipt-first bar-POS
  layout** (big grid, ticket rail) is the fastest for an expert operator but sacrifices the
  customer-facing menu quality on a 6" screen — a net loss here.
- **Where the current UI is weakest:** (a) mix-and-match rows are list-shaped; a 2–3 column
  photo-grid per section (tap to add, qty badge) would browse better for customers without
  slowing the owner; (b) no upsell affordances — "Most popular" badges and a per-section featured
  item measurably lift average ticket in menu design; (c) the allowance ("3 bands, 3 feathers…")
  appears only in the Hats section banner and receipt footer — a small live "included: 2 of 3
  bands used" chip would turn the allowance into an upsell moment ("your third band is
  included — pick one more").
- **Customer-facing kiosk/self-serve:** the highest-upside interface *addition* — publish the
  same page in a read-only "menu mode" (no Charge/New Hat/Edit) reachable by QR code or on a
  cheap counter iPad. Customers browse photos and build wish-lists while waiting; the owner keeps
  the tally on her phone. Near-zero marginal engineering (same repo, `?menu=1`), no paid Square
  Kiosk needed, no payment surface exposed.

---

## 5. Reliability and risk of the current parts

| # | Risk | Severity | Likelihood | Simplest mitigation |
| --- | --- | --- | --- | --- |
| 1 | **Square callback returns to Safari, not the PWA.** After payment, Square POS opens `callback_url` (an https URL); iOS home-screen apps can't claim https links, so it opens a Safari tab whose storage is partitioned from the PWA — the app's "Payment recorded ✓ / auto-reset" code (index.html `handleSquareCallback`) runs against the *wrong* localStorage. Every single sale ends in a confusing Safari tab while the PWA still shows the old tally. | **High (UX), certain frequency** | Every sale | Stop depending on the callback: point `callback_url` at a tiny static `payment-complete.html` ("Payment recorded — return to the Hat Bar app"), and in the PWA show a "Charged in Square? → New Hat" confirmation when returning via app switcher. ~1 hour. |
| 2 | **App-switch from standalone mode itself.** Custom schemes (`square-commerce-v1://`) generally do launch native apps from home-screen PWAs, but this exact flow (plus the required registration of the web callback URL in the Square Developer Console) has not been proven on-device in this repo. | High if broken | Unknown | 15-minute on-device test before launch **[verify on device]**; fallback: run from a Safari tab instead of the home-screen icon. |
| 3 | **localStorage is the only home of irreplaceable config** (edited menu, camera-roll photos as base64, logo, discount codes, Square app ID). Home-screen apps are exempt from the 7-day cap, but deleting the icon, clearing Safari website data, or device restore wipes it; iOS localStorage quota (~5MB) can also be hit by base64 camera-roll photos. | **High** | Low-medium | Add "Export / Restore backup" (share-sheet JSON file); prefer synced `square-photos/` file paths over base64. 2–3 hours. |
| 4 | Phone lost/broken = register gone (single-device lock-in). | Medium | Low | Same backup file restores to a new phone in minutes; defaults (printed price list, repo logo) already rebuild a usable baseline. |
| 5 | GitHub Pages outage. | Low | Low | Service worker serves the whole app from cache; only fresh syncs/photos wait. No action needed. |
| 6 | Square access token in repo secret expires. | Low | Low | Personal access tokens do **not** expire (only OAuth tokens do, 30 days) — [Square access tokens doc](https://developer.squareup.com/docs/build-basics/access-tokens), [forum clarification](https://developer.squareup.com/forums/t/clarity-on-the-personal-access-token-and-refresh-token/22739). Failure mode is owner-initiated regeneration; GitHub emails on failed workflow runs. |
| 7 | GitHub disables scheduled workflows after 60 days without commits — [keepalive docs](https://github.com/efrecon/gh-action-keepalive), [dev.to guide](https://dev.to/gautamkrishnar/how-to-prevent-github-from-suspending-your-cronjob-based-triggers-knf). | Low | Low | Already accidentally mitigated: `generatedAt` changes every run, so the weekly sync always commits, resetting the timer. Document this so nobody "optimizes" it away; manual **Run workflow** also always remains available. |
| 8 | POS note truncated at 250 chars — a maximal build's itemization gets cut in Square's transaction record. | Low | Medium | Compress note format (drop prices, keep names ×qty), or accept. |

---

## 6. Overall verdict

**Partially the right approach.** The PWA is a genuinely good fit for the *experience* half of the
problem (guided, branded, photo-rich, offline, $0/month, no app store), and its two Square
connections are cleverly designed to keep secrets out of the client. But the honest case against
it: (1) the lump-sum charge permanently forfeits Square's item-level analytics and inventory —
the single biggest business-value gap versus just using Square POS; (2) the after-payment return
trip is broken-by-platform (Safari partition) and will confuse the owner on every sale; (3) all
owner-entered config lives in one phone's evictable localStorage with no backup path; and (4) a
2–4 hour pure-Square configuration would deliver ~80–85% of the outcome with literally nothing to
maintain — the custom build must earn its keep with the guided/photo experience, and the owner
should make that trade knowingly, with the pure-Square register configured as the fallback either
way.

## 7. Ranked recommendations

1. **Configure Square POS itself as the complete fallback register** (photo tile grid per
   category, $0 "included — choose up to 3" modifier sets, priced extras, blank-price "$N+"
   items, named discounts). Benefit: zero-code register that survives any app failure, plus real
   itemized reporting whenever it's used. Effort: 2–4 hours in the Square Dashboard; owner with a
   tech-comfortable helper; no developer needed.
2. **Fix the payment return trip** (static `payment-complete.html` as callback + in-app "Charged?
   → New Hat" prompt; delete the cross-instance callback logic). Benefit: removes a
   every-sale confusion. Effort: ~1 hour, developer.
3. **Add settings export/restore** (one-tap backup file of menu/photos/logo/codes/app ID).
   Benefit: converts the two highest data-loss risks into a 2-minute recovery. Effort: 2–3
   hours, developer.
4. **Customer-facing menu mode + QR / counter tablet** with "Most popular" badges and an
   "included allowance" live chip. Benefit: upsell and delight while the owner keeps the phone;
   no paid Square Kiosk. Effort: 2–4 hours, developer.
5. **Only if the business scales** (second station, staff, inventory pressure): revisit a native
   SwiftUI app on Square's Mobile Payments SDK (real line items + Tap to Pay in one app). Benefit:
   closes the itemization gap without double entry. Effort: weeks + $99/yr + Apple org account +
   ongoing maintenance — not now.
