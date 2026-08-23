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

A value of `0` is an explicit backward-compatible mode. It preserves the pre-planning low-stock semantics exactly:

- only currently usable stock is compared with `minimum_quantity` and `target_quantity`,
- no future consumption is assumed,
- no future horizon projection is presented for that product,
- stock expiring later inside the selected horizon does not change the recommendation until the household opts into a consumption rate,
- the recommendation appears only when current usable stock is at or below the configured minimum.

This matters because existing stock targets predate the planning feature. Adding the planning layer must not silently change their shopping behavior.

Once expected daily consumption is greater than zero, planning becomes proactive: the recommendation aims to cover consumption over the selected horizon and still finish with the configured target reserve.

## Batch-aware projection

Batch-aware horizon projection applies only when `expected_daily_consumption > 0`.

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

For zero-rate legacy items, `plannedConsumption`, `coveredConsumption`, `unmetConsumption` and `expiredBeforeUseQuantity` remain zero and `projectedQuantity` mirrors current usable stock. The UI must label this as legacy minimum-based monitoring rather than as a horizon forecast.

## Recommendation

For horizon-planned items (`expected_daily_consumption > 0`), the canonical recommendation is:

`recommended = max(0, target reserve - projected usable stock + unmet planned consumption)`

This buys enough to satisfy missing demand during the horizon and end with the desired reserve, while accounting for stock that expires before it can remain useful.

For zero-rate legacy items, the recommendation remains:

`recommended = max(0, target quantity - current usable stock)`

and is surfaced only when:

`current usable stock <= minimum quantity`.

For packaged retail products, the final shopping decision is rounded up to purchasable whole packages using the existing package metadata contract.

## Uncertainty

An estimated inventory quantity remains numerically usable for deterministic arithmetic, but the plan must not present the result as falsely exact.

For horizon-planned items, a recommendation is marked as estimated when estimated stock actually affects covered consumption or the projected end-of-horizon stock. Estimated stock that expires unused and therefore contributes nothing to the plan does not needlessly contaminate the recommendation.

For zero-rate legacy items, estimate provenance follows current usable stock exactly, matching the previous replenishment behavior.

## Explainability requirement

The shopping UI must show enough context to reconstruct why a recommendation exists.

For horizon-planned items, include at least:

- stock at home now
- target reserve
- projected stock at the selected horizon
- expected daily consumption
- stock that becomes unusable because of `use_by`, when relevant
- unmet consumption before the end of the horizon, when relevant

For zero-rate legacy items, clearly state that the app is using minimum-based monitoring and do not present a fake future projection.

A user should not need to trust a black-box recommendation.

## Current boundary

This slice uses a user-configured daily consumption rate. It does **not** yet learn consumption automatically from `InventoryEvent` history.

A later learning layer may propose or continuously update an expected rate from observed consumption, but it must remain distinguishable from explicit user intent and must not silently rewrite inventory facts.
