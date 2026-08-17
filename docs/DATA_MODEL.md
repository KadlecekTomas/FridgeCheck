# Data Model Contract

## Purpose

The persistence model must support accurate inventory, batch-specific expiry, low-friction corrections, shopping recommendations and future consumption learning without forcing a rewrite.

The most important distinction is:

**A product is not an inventory batch.**

A product describes what something is. A batch describes a physical amount that currently exists or existed in a household.

## Core entities

### Household

Represents the ownership/security boundary for shared food inventory.

Typical fields:

- `id`
- `name`
- `created_at`

Membership and authorization are separate concerns and must be enforced by RLS/backend rules.

### StorageUnit

A physical storage location within a household.

Examples:

- fridge
- freezer
- pantry
- cabinet

Typical fields:

- `id`
- `household_id`
- `name`
- `type`
- `created_at`

### Product

Reusable definition of a food/product independent of any one purchase.

Typical fields:

- `id`
- `household_id` when product definitions are household-private, or another explicit ownership model
- `name`
- `brand`
- `ean_code`
- `category`
- `image_url`
- `default_unit`
- `created_at`
- `updated_at`

External metadata provenance may be stored, but third-party data is not the source of truth.

EAN must not be assumed globally unique without handling missing/invalid codes and user-created products.

### InventoryBatch

Represents a physical amount of one product acquired together and sharing relevant expiry/storage attributes.

Typical fields:

- `id`
- `household_id`
- `product_id`
- `storage_unit_id`
- `quantity`
- `unit`
- `expiry_date`
- `expiry_type` (`use_by`, `best_before`, `unknown`)
- `purchased_at`
- `opened_at`
- `status`
- `created_by`
- `created_at`
- `updated_at`

Expiry belongs here, not on `Product`.

A product can have multiple active batches with different dates and locations.

### StockTarget

Defines the household's desired stock level for a product.

Typical fields:

- `id`
- `household_id`
- `product_id`
- `minimum_quantity`
- `target_quantity`
- `unit`
- optional planning metadata
- `created_at`
- `updated_at`

Targets are preferences, not inventory facts.

### InventoryEvent

Append-only history of meaningful inventory changes.

Recommended event types include:

- `purchase`
- `consume`
- `discard`
- `correction`
- `move`
- `open`

Typical fields:

- `id`
- `household_id`
- `product_id`
- `inventory_batch_id`
- `type`
- `quantity_delta`
- `unit`
- `reason`
- `created_by`
- `created_at`

The current batch quantity can remain materialized for fast reads, but quantity-changing operations should create enough history to explain how the state was reached.

History is important for future consumption prediction and waste analysis.

### ShoppingListItem

Represents an explicit shopping-list decision.

A shopping item can be:

- derived from replenishment logic
- manually added

Keep the recommendation calculation separate from the user's final shopping intent so a user override does not corrupt inventory or targets.

## Derived concepts

### Usable stock

Usable stock is the amount that can reasonably satisfy a requirement.

It must exclude at least:

- consumed/depleted batches
- discarded batches
- expired batches when they are treated as unusable

Future logic may discount stock that will expire before the relevant planning horizon, but that behavior must be explicit and tested.

### Replenishment need

A simple baseline is:

`need = max(0, target requirement - usable stock)`

The real implementation must also handle:

- unit normalization
- multiple batches
- planning horizon
- expected/planned consumption
- manual overrides

Do not encode this formula independently in multiple UI components.

## Quantity rules

Use explicit numeric quantity plus unit for precise inventory.

Supported unit families should be centralized, for example:

- mass: `g`, `kg`
- volume: `ml`, `l`
- count: `pcs`

Only convert within compatible families unless product-specific conversion metadata exists.

Do not use floating-point arithmetic carelessly for values where rounding can accumulate. Define normalization and rounding rules centrally.

Approximate inventory (`low`, `half`, `full`) may be supported as a separate explicit mode; do not pretend approximate states are precise measurements.

## Expiry rules

Use a date value when expiry is day-based.

`expiry_type` must distinguish use-by from best-before because the product meaning differs.

Expiry urgency is derived behavior and should not be persisted as mutable labels such as `red`, `orange`, `green` unless used only as cache with a clear invalidation strategy.

## FEFO consumption

When the user consumes a product without selecting a specific batch, allocate consumption from the earliest suitable expiry first (FEFO: First Expired, First Out).

Rules for no-expiry batches and best-before/use-by ordering must be explicit in the domain module and covered by tests.

## Corrections

Inventory systems drift. Corrections are a normal operation, not an exceptional admin task.

A correction should:

- update the current state
- preserve an audit event
- optionally capture a reason
- never masquerade as consumption if the user is fixing incorrect data

## Deletion

Prefer state transitions/archive semantics for inventory history over destructive deletion where history is valuable.

Hard deletion may be appropriate for accidental test data or privacy requirements, but must respect referential integrity and authorization.

## Migration from current `foods`

The existing `foods` model combines product metadata and batch state. Migration toward this contract should be incremental and data-safe.

A migration plan should:

1. introduce the new tables/columns
2. map each existing food row to a product and inventory batch
3. preserve household, storage, expiry, EAN and creator relationships
4. validate row counts and critical relationships
5. switch reads/writes only after migration validation
6. remove obsolete fields only in a later cleanup migration

Do not perform a destructive one-step rewrite.

## Constraints and indexes

Use database constraints for facts the database can enforce.

Examples:

- non-negative active quantity where appropriate
- valid enum/check values
- required household ownership
- foreign-key integrity
- uniqueness only when semantics truly require it

Add indexes based on actual access paths, especially household-scoped active inventory and expiry queries.

## Authorization

Every household-scoped table must have an explicit access model.

RLS policies must prevent cross-household access even if a client sends another household ID manually.

Authorization behavior requires automated tests.
