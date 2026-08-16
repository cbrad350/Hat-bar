# Pricing rules — read before touching any money code

The client is **Details Austin**, a custom hat bar. These rules came from the
owner's husband over several conversations, and a couple of them reversed
earlier statements. Where a rule changed, both versions are recorded — if you
find code that looks wrong, check here before "fixing" it.

Implemented in `index.html`: `computeBill()`, `allowanceFreeUnits()`,
`allowanceCredits()`. Every rule below has a test in `handoff/tests/test_app.js`.

---

## 1. The hat is a pick-one; everything else is mix & match

A customer picks exactly one hat (`type: "single"` section), then adds any
number of bands, feathers and details (`type: "multi"` sections).

Hats come in two price tiers in the current catalog: **$185** (15 styles) and
**$225** (4 styles, the AHM collection).

## 2. The hat includes an allowance

Every hat includes, at no charge:

| Included | Qty |
| --- | --- |
| Signature bands | 3 |
| Feathers (signature or pompas) | 3 |
| Small pin | 1 |
| Burnt-in brand | 1 |

**This is enforced, not just displayed.** Each allowance line in Edit Menu is
*linked* to the menu items it covers. Units within the allowance ring up at
**$0**; units past it charge list price.

> Before this was built, the owner had to either tap the included items (and
> overcharge ~$9 a hat) or not tap them (and lose the itemised receipt). If you
> see an allowance that isn't linked, the app shows a red "⚠ Not linked"
> warning rather than silently mispricing.

## 3. Enhancements charge full list price — no deducts

Skipping something included earns **nothing**. Swapping a signature band for a
leather band charges the leather band's full price. This was the founding rule,
stated as: *"There's no deducts for not doing things, just upcharges should
they elect to swap."*

**Rule 4 is a narrow, deliberate exception to this. It is not a reversal.**

## 4. Trading up credits the unused allowance — same category only

Added later, and initially it sounded like a contradiction of rule 3. It isn't.
The owner's clarification:

> *"Normally, there is a no deducts rule if they decide not to do anything. But
> if they decide for the three bands, for instance, to only do one and then do
> one of the enhanced bands, a luxe band, a leather band, or whatever, they will
> get a credit for the bands they do not use that will go towards the upgrades.
> But you don't get the money back for other enhancements included in the
> packages that you chose not to use."*

So the credit exists **only when they're buying an upgrade in that same
category**:

| Scenario | Result |
| --- | --- |
| Uses 1 of 3 signature bands, buys a $12 Leather Band | 2 unused × $3 = **$6 credit** → band costs $6 |
| Uses 0 of 3, buys one $15 Luxe Band | **$9 credit** → band costs $6 |
| Uses 0 of 3, buys no other band | **No credit** (rule 3 stands) |
| Skips the pin, buys nothing else | **Nothing back** |

Three hard limits, all tested:

1. **Capped at what was actually spent in that category.** A $9 pool against a
   $2 band gives $2, not $9. It can zero an item; it never pays money out.
2. **Never reduces the hat price**, and never spills into another section.
3. **Never crosses categories** — unused bands cannot pay for feathers.

The credit rate is the **cheapest linked item's price** ($3 for signature
bands). Crediting is **off by default** and toggled per allowance in Edit Menu,
because the pin and brand explicitly do not work this way.

The receipt names the credit rather than shrinking a line:

```
Scarf                                  $15
2 unused Signature Bands ($3 each)     −$6
```

## 5. "$N+" items are variable-priced

The printed menu lists Luxe Band $15+, Chain $5+, Premium Hat Collection $40+.
Square stores these as **fixed** prices, so the flag cannot be imported — it is
set by hand with the **+** toggle in Edit Menu, and now survives re-imports.

Each *unit* carries its own price: two Luxe Bands can be $22 and $35, adjusted
independently. `entry.prices[]` holds them; `entry.price` is a legacy fallback.

## 6. Discount codes

Percent or dollar off, defined in Edit Menu, entered at the bottom of the
register. Applied to the subtotal **after** any trade-up credit. A code that
zeroes the bill is reported honestly ("Total is $0 after FRIENDS") rather than
as an empty tally.

---

## Open — not yet built

The owner asked for two named tiers, **Signature Hat Experience** and **Deluxe
Hat Experience**. The message arrived via voice-to-text and was partly garbled.
What's confirmed:

- Signature includes 3 signature bands, 3 feathers, 1 small pin, 1 brand
  (possibly "1 custom brand" — unclear)
- Deluxe includes more — **the contents did not come through**

**Do not guess at this.** Still needed:

1. What Deluxe includes, and how it differs from Signature
2. The price of each tier, and whether they replace or sit on top of the hat price
3. Whether both tiers apply to all 20 hats or only some
4. Whether the credit rate differs per tier

The allowance model already supports this shape — it's a matter of switching
which allowance set applies based on the chosen tier — but the numbers have to
come from the owner.
