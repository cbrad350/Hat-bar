# Fuel Bill Splitter

Standalone tool for splitting World Fuel invoices across the four owner
families of a Lear 45 and a CJ1+, using the Airplane Manager flight log to tell
who was flying. **Completely separate from the hat bar register app** — it
shares nothing with `../index.html` except the repo, and touching it cannot
affect the register. Served at `/fuel-split/` once deployed.

## Monthly workflow

1. Export the month's flight log from Airplane Manager as CSV (an Excel export
   works too — open it and Save As → CSV) and load it in step 1. Confirm the
   column mapping, then tell it which owner names belong to which family
   (remembered on that device).
2. Drop the World Fuel PDF invoices into step 2. Each parses into a line —
   date, tail, airport, gallons, total — that stays editable, so misreads are
   fixed in place. Invoices that defeat the parser (scans, odd encodings) fall
   back to paste-the-text or manual entry.
3. Review the matches. `auto` means tail + date (+ airport) lined up cleanly;
   `review` means ambiguous or a day off; `unmatched` needs a leg or family
   picked by hand.
4. Pick the month in step 3 and download the per-family CSV or print it.

## Allocation rule

An uplift is billed to the family whose trip the fuel was pumped on — the
group's agreed convention for equal-equity ownership. Fuel carried in the tanks
across trips is deliberately ignored; it evens out. Changing this rule means
changing `buildStatement`, nothing else.

## Matching heuristics (match.js)

- Tail must match (normalized: case/dashes ignored).
- Date may slip up to 2 days — late-night arrivals get invoiced the next
  morning.
- Departure-airport hit scores above arrival (fuel is pumped before takeoff);
  KAUS and AUS are treated as the same field.
- Two candidate legs with equal scores → `review`, never a silent guess.

## Privacy / storage

Everything runs in the browser tab; no data leaves the device. State lives in
`localStorage`, so use **Save backup** for a JSON file worth keeping (or to
move to another device).

## Tests

```sh
cd fuel-split/tests && ./run_tests.sh   # logic + synthetic-PDF checks, expect exit=0
```

The in-browser PDF extractor (`pdf-text.js`) is best-effort: it handles the
machine-generated, Flate-compressed PDFs invoice systems emit, and refuses
(with a paste-instead message) rather than producing garbage when it can't.
It has not yet been tuned against a real World Fuel invoice — if one parses
badly, save a redacted sample and adjust `extractInvoiceFields`'s label
patterns in `match.js` first; the raw text is usually right and the labels are
the moving part.
