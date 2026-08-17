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
- product metadata may be prefilled from Open Food Facts but must remain editable
- expiry should be quick to set
- quantity input should support sensible defaults
- repeated products should be addable with very few interactions

## Barcode and external product data

Barcode data is a convenience layer, not a source of truth.

External metadata can be missing, stale or incorrect. The user must be able to correct it. Internal product identity must not depend exclusively on an external API response.

## Shopping list

The shopping list should primarily be derived from inventory and targets, while still allowing manual items.

Derived recommendations must explain enough context to be trusted, for example:

- `Eggs: 3 at home / target 10 -> buy 7`
- `Oats: ~150 g at home / target 500 g -> buy ~350 g`

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

## Product decision rule

When evaluating a feature, ask:

1. Does this reduce food waste, shopping uncertainty or inventory maintenance effort?
2. Is the benefit frequent enough to justify the interaction and engineering cost?
3. Can the same outcome be achieved with a simpler mechanism?

If the answers are weak, do not build it yet.
