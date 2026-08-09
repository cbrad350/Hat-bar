# Hat Bar Tally 🤠

A phone-first upcharge calculator for a custom hat bar. Ring up a hat's adornments in
seconds while the customer mixes and matches — included items are free, upgrades and
add-ons only ever **add** to the total (no deductions for skipping something).

## How it works

**Tally screen** (day-to-day use):

- **Pick-one categories** (e.g. *Hat Band*, *Branding*) — the included option is
  pre-selected and free. Tap an upgrade to swap it in and its upcharge joins the total.
  Tap the selected upgrade again to put the included item back.
- **Add-ons** (feathers, playing cards, charms…) — tap **+** / **−** to stack as many
  as the customer wants; each has a per-item price.
- The **total bar** stays pinned to the bottom. Tap it to see the itemized list, and
  tap **New Hat** to clear everything for the next customer (with an Undo in case of
  a mis-tap).

**Edit Prices screen** (setup): tap *Edit Prices* to rename anything, change prices,
add or remove categories/options/add-ons, reorder them, mark which option is included
(INCL), and optionally set a base hat price to fold into the total. Changes save
automatically on the device. The menu ships with sample hat-bar items — replace them
with the real offerings.

Everything is stored locally on the phone (no account, no server), and a service
worker keeps the app working with zero signal once it has loaded once.

## Putting it on an iPhone

1. Host the app somewhere with HTTPS. The zero-cost route is **GitHub Pages**:
   in this repo go to **Settings → Pages**, set *Source* to "Deploy from a branch",
   pick `main` and `/ (root)`, and save. After a minute the app is live at
   `https://<your-username>.github.io/Hat-bar/`.
2. Open that URL in **Safari** on the iPhone.
3. Tap the **Share** button → **Add to Home Screen** → **Add**.

It now launches full-screen from its own hat icon like a native app, and keeps
working offline. (Prices live in that phone's browser storage, so set the menu up
on the phone she'll actually use at the bar.)

## Development

No build step — it's a single static page. To try it locally:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: UI, styles, tally + menu-editing logic |
| `manifest.json` | PWA manifest (name, icons, standalone display) |
| `sw.js` | Service worker for offline caching (bump `CACHE_VERSION` when files change) |
| `icons/` | Home-screen / favicon images |
