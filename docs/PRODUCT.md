# Product Contract

## Mission

FridgeCheck / HlídačJídla helps a household know what food it has, what should be consumed soon, and what should be bought next.

The product succeeds only if it saves more time and mental energy than it costs to maintain.

## Primary user promise

Within a few seconds of opening the app, the user should understand:

- what needs attention today
- what is running low
- what should be bought

The product is not a passive database. It is an action-oriented household food assistant.

## Core loop

1. Add or confirm food after shopping.
2. Track approximate or exact remaining quantity.
3. Surface batches approaching expiry.
4. Record consumption/waste with minimal friction.
5. Recalculate usable stock.
6. Generate replenishment needs against household targets and the selected planning horizon.
7. Convert needs into a shopping list.

Every major feature should strengthen this loop.

## Product pillars

### 1. Inventory

The app records food that physically exists in the household and where it is stored.

Supported precision should match real life. Some items need exact quantities (`6 eggs`, `800 g chicken`); others may be adequately represented by approximate states (`low`, `half`, `full`).

The UI must not force false precision.

### 2. Expiry awareness

For food, distinguish at least:

- use-by / `spotřebujte do`
- best-before / `minimální trvanlivost do`
- no known expiry

Expiry is batch-specific. Two packages of the same product can have different dates.

The app should prioritize food by risk and urgency, not simply show a chronological table.

### 3. Replenishment

The app compares usable household stock with desired stock and expected/planned consumption.

A basic recommendation can be expressed as:

`recommended purchase = target requirement - usable stock`

but the implementation must account for units, multiple batches and the planning horizon.

Stock that is expired, marked unusable or likely to become unusable before it can reasonably be consumed must not create false confidence.

## Home screen principle

The home screen is an operational summary, not a vanity dashboard.

Priority order:

1. consume soon / urgent expiry
2. low stock
3. shopping needs
4. useful secondary context

Avoid prominent statistics that do not change the user's next action.

## Input friction

Every additional required field reduces long-term retention. Therefore:

- barcode scanning should accelerate entry, not be required
- product metadata may be prefilled from Open Food Facts but must remain editable on first capture
- expiry should be quick to set
- quantity input should support sensible defaults
- repeated products should be addable with very few interactions
- users must not have to perform unit arithmetic that the app can perform safely itself

A common packaged purchase such as `24 × 100 g Eidam` must be enterable as `24 balení` with `100 g / balení`; the user must not calculate and type `2400 g` manually.

When a product has trustworthy per-package quantity metadata, package-aware interaction should remain consistent across the core loop: inventory display, consumption, discard, stock correction, stock targets, replenishment and shopping. Canonical inventory arithmetic may still use mass/volume/count internally.

## Barcode and external product data

Barcode data is a convenience layer, not a source of truth.

For household-private product definitions, a valid barcode already known in the active household must resolve locally before any external lookup. Repeated scanning should add another physical batch rather than ask for product metadata again or create a duplicate product definition.

External metadata can be missing, stale or incorrect. A valid barcode that Open Food Facts does not know is a normal first-time path, not a dead end: the user can enter the product manually once, save it with that barcode, and the household should recognize it locally on subsequent scans.

Internal product identity must not depend exclusively on an external API response. External lookup outages must not prevent manual food entry.

## Shopping list

The shopping list should primarily be derived from inventory and targets, while still allowing manual items.

Derived recommendations must explain enough context to be trusted, for example:

- `Eggs: 3 at home / target 10 -> buy 7`
- `Oats: ~150 g at home / target 500 g -> buy ~350 g`
- `Eidam: 25 packages at home / target 30 -> buy 5 packages`

For retail packaged goods, recommendations should resolve to purchasable whole packages rather than forcing impossible fractional package arithmetic.

The user must be able to override the recommendation without corrupting underlying inventory data.

## Consumption and waste

The app should distinguish food that was:

- consumed
- discarded/wasted
- corrected because the recorded quantity was wrong

This distinction matters for future consumption prediction and waste insights.

When automatically selecting inventory for consumption, prefer FEFO (First Expired, First Out).

## MVP boundaries

The current priority is the mobile-first web/PWA product.

Do not make native mobile, recipe generation, broad AI assistants, retailer integrations, receipt OCR, price comparison or nutrition tracking prerequisites for the core product.

Those features may be explored only after the core loop is reliable and demonstrably useful in everyday use.

## Success criteria

The MVP is successful when a real user can use it continuously without the inventory drifting badly out of reality and can reliably answer:

- What should I eat first?
- What am I running out of?
- What should I buy for the next few days?

A non-technical household member should not need to understand terms such as batch, database, RLS, Supabase, internal unit representation or external product-provider behavior to complete the core loop.

## Product decision rule

When evaluating a feature, ask:

1. Does this reduce food waste, shopping uncertainty or inventory maintenance effort?
2. Is the benefit frequent enough to justify the interaction and engineering cost?
3. Can the same outcome be achieved with a simpler mechanism?

If the answers are weak, do not build it yet.
