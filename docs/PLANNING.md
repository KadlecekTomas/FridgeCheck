# Purchase Planning Contract

## Purpose

FridgeCheck should answer not only **what is low now**, but also **what will need to be bought for the next few days**.

The planning layer is deterministic and explainable. It does not replace inventory facts with an opaque score or AI guess.

## Inputs

For each product with a `StockTarget`, planning uses:

- current active inventory batches
- batch unit and status
- batch `use_by` expiry
- batch quantity precision (`quantity_is_estimate`)
- `minimum_quantity`
- `target_quantity`
- `expected_daily_consumption`
- selected planning horizon in days

`expected_daily_consumption` is stored on `stock_targets` in the same canonical unit as the target. Example: a packaged cheese whose canonical unit is grams may be edited as `1 package / day`, while persistence remains `100 g / day` when one package is 100 g.

The planning horizon is a parameter of the current shopping decision. The first UI offers 3, 7 and 14 days and defaults to 7 days; it is not duplicated as global household state.

## Semantics

Expected daily consumption is a planning assumption, not observed history. It must never create fake `InventoryEvent` rows.

A value of `0` preserves the previous low-stock behavior: the app does not proactively top a product back up merely because current stock is below the target; it recommends when projected usable stock reaches the configured minimum.

Once expected daily consumption is greater than zero, planning becomes proactive: the recommendation aims to cover consumption over the selected horizon and still finish with the configured target reserve.

## Batch-aware projection

Planning must not treat all current stock as equally usable for the whole horizon.

For every day in the horizon:

1. Use only active, positive-quantity batches in the target unit.
2. Consume stock in FEFO order.
3. A `use_by` batch may be consumed through its expiry date, but not on later days.
4. `best_before` stock remains usable after its date under the current product contract.
5. Track planned demand that current stock cannot cover.
6. At the end of the horizon, remove remaining `use_by` stock that will already be expired.

This produces:

- `currentQuantity`
- `plannedConsumption`
- `coveredConsumption`
- `unmetConsumption`
- `expiredBeforeUseQuantity`
- `projectedQuantity`

## Recommendation

The canonical recommendation is:

`recommended = max(0, target reserve - projected usable stock + unmet planned consumption)`

This is equivalent to buying enough to satisfy missing demand during the horizon and end with the desired reserve, while also accounting for stock that expires before it can remain useful.

For packaged retail products, the final shopping decision is rounded up to purchasable whole packages using the existing package metadata contract.

## Uncertainty

An estimated inventory quantity remains numerically usable for deterministic arithmetic, but the plan must not present the result as falsely exact.

A recommendation is marked as estimated when estimated stock actually affects covered consumption or the projected end-of-horizon stock. Estimated stock that expires unused and therefore contributes nothing to the plan does not needlessly contaminate the recommendation.

## Explainability requirement

The shopping UI must show enough context to reconstruct why a recommendation exists, including at least:

- stock at home now
- target reserve
- projected stock at the selected horizon
- expected daily consumption
- stock that becomes unusable because of `use_by`, when relevant
- unmet consumption before the end of the horizon, when relevant

A user should not need to trust a black-box recommendation.

## Current boundary

This slice uses a user-configured daily consumption rate. It does **not** yet learn consumption automatically from `InventoryEvent` history.

A later learning layer may propose or continuously update an expected rate from observed consumption, but it must remain distinguishable from explicit user intent and must not silently rewrite inventory facts.
