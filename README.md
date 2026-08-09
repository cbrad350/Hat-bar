# Hat Bar Tally 🤠

A phone-first register for a custom hat bar, styled after the printed menu. Ring up a
hat's enhancements in seconds while the customer mixes and matches, then hand the total
straight to **Square Point of Sale** for payment.

## The pricing model

- The **base hat** (default: Women's Custom Hat, **$185**) includes an allowance shown
  right on the tally: *3 signature bands, 3 feathers (signature or pompas), 1 small
  pin, 1 burnt-in brand*.
- Everything on the enhancements menu is charged at **full list price** — swaps and
  extras only ever **add** to the total. Skipping an included item never deducts
  anything.
- Items priced like **$15+** (Luxe Band, Chain, Premium Hat Collection) are
  *variable-priced*: tapping **+** asks for the exact price for that hat, which can be
  adjusted later from the item row.

## Using it

**Tally screen:** the menu ships pre-loaded from the printed price list (Feathers,
Bands, Details, Hat Upgrades). Tap **+ / −** to stack enhancements; the pinned bar shows
the running total — tap it for an itemized receipt (including the "base includes" note
for the customer). **New Hat** clears for the next customer (with Undo).
**Charge** sends the total to Square.

**Edit Menu screen:** rename the shop, base hat, and any section or item; change
prices; add/remove/reorder everything; adjust the included-allowance list; toggle the
**+** flag for variable pricing; and **tap an item's circle to attach a product photo**
from the camera roll (photos are stored on the phone, shown as thumbnails on the menu).
Changes save automatically to the device — no account or server.

## Square payments

The **Charge** button uses Square's [Point of Sale API](https://developer.squareup.com/docs/pos-api/what-it-does)
app-switch: it opens the Square POS app on the same phone with the exact total and an
itemized note, payment is taken there (tap-to-pay, reader, cash…), and the sale lands
in the connected Square account. When Square hands control back, the app marks the hat
paid and clears for the next customer.

One-time setup:

1. Install the **Square Point of Sale** app on the iPhone and sign in to the business
   Square account.
2. At [developer.squareup.com](https://developer.squareup.com) create a (free)
   application and copy its **production Application ID** (`sq0idp-…`).
3. In the tally app: **Edit Menu → Square Payments**, paste the ID.

Note: a static app can't call Square's server APIs (that would expose the account's
secret key), so item photos aren't pulled from the Square catalog automatically —
attach them from the camera roll instead, and take payment through the POS app-switch
above, which needs no secret at all.

## Putting it on an iPhone

1. Host with HTTPS — the zero-cost route is **GitHub Pages**: repo **Settings →
   Pages**, *Source*: "Deploy from a branch", branch `main`, folder `/ (root)`.
   The app goes live at `https://<username>.github.io/Hat-bar/`.
2. Open that URL in **Safari** on the iPhone.
3. **Share → Add to Home Screen → Add.**

It launches full-screen from its own hat icon and keeps working offline. Menu edits,
photos, and the Square ID live in that phone's storage, so set everything up on the
phone used at the bar.

## Development

No build step — a single static page. Try it locally:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: UI, styles, tally/menu/photo/Square logic |
| `manifest.json` | PWA manifest (name, icons, standalone display) |
| `sw.js` | Service worker for offline caching (bump `CACHE_VERSION` when files change) |
| `icons/` | Home-screen / favicon images |
