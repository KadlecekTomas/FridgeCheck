import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { computePurchasePlan, type PurchasePlanTarget } from './planning.ts'
import type { DashboardBatch } from './dashboard.ts'

const now = new Date(2026, 7, 23, 12, 0, 0)

function target(overrides: Partial<PurchasePlanTarget> = {}): PurchasePlanTarget {
  return {
    productId: 'eggs',
    minimumQuantity: 10,
    targetQuantity: 20,
    expectedDailyConsumption: 2,
    unit: 'pcs',
    ...overrides,
  }
}

function batch(overrides: Partial<DashboardBatch> = {}): DashboardBatch {
  return {
    id: 'batch-a',
    productId: 'eggs',
    quantity: 30,
    quantityIsEstimate: false,
    unit: 'pcs',
    expiryDate: null,
    expiryType: 'unknown',
    status: 'active',
    ...overrides,
  }
}

describe('purchase planning', () => {
  it('plans proactively so the household finishes the horizon at its target', () => {
    const result = computePurchasePlan([target()], [batch()], 7, now)

    assert.deepEqual(result, [
      {
        ...target(),
        horizonDays: 7,
        currentQuantity: 30,
        currentQuantityIsEstimate: false,
        plannedConsumption: 14,
        coveredConsumption: 14,
        unmetConsumption: 0,
        expiredBeforeUseQuantity: 0,
        projectedQuantity: 16,
        projectedQuantityIsEstimate: false,
        recommendedQuantity: 4,
        recommendationIsEstimate: false,
      },
    ])
  })

  it('adds unmet consumption to the end-of-horizon reserve', () => {
    const result = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10 })],
      [batch({ quantity: 6 })],
      7,
      now
    )

    assert.equal(result[0]?.plannedConsumption, 14)
    assert.equal(result[0]?.coveredConsumption, 6)
    assert.equal(result[0]?.unmetConsumption, 8)
    assert.equal(result[0]?.projectedQuantity, 0)
    assert.equal(result[0]?.recommendedQuantity, 18)
  })

  it('uses FEFO and stops counting use-by stock after it expires', () => {
    const result = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10, expectedDailyConsumption: 2 })],
      [
        batch({ id: 'expires-today', quantity: 10, expiryDate: '2026-08-23', expiryType: 'use_by' }),
        batch({ id: 'stable', quantity: 10, expiryDate: null, expiryType: 'unknown' }),
      ],
      3,
      now
    )

    assert.equal(result[0]?.plannedConsumption, 6)
    assert.equal(result[0]?.coveredConsumption, 6)
    assert.equal(result[0]?.expiredBeforeUseQuantity, 8)
    assert.equal(result[0]?.projectedQuantity, 6)
    assert.equal(result[0]?.recommendedQuantity, 4)
  })

  it('breaks equal FEFO dates deterministically by batch id', () => {
    const result = computePurchasePlan(
      [target({ minimumQuantity: 0, targetQuantity: 10, expectedDailyConsumption: 1 })],
      [
        batch({ id: 'batch-z', quantity: 1, quantityIsEstimate: true, expiryDate: '2026-08-30', expiryType: 'use_by' }),
        batch({ id: 'batch-a', quantity: 1, quantityIsEstimate: false, expiryDate: '2026-08-30', expiryType: 'use_by' }),
      ],
      1,
      now
    )

    assert.equal(result[0]?.coveredConsumption, 1)
    assert.equal(result[0]?.projectedQuantity, 1)
    assert.equal(result[0]?.projectedQuantityIsEstimate, true)
  })

  it('keeps best-before stock available after its date', () => {
    const result = computePurchasePlan(
      [target({ minimumQuantity: 2, targetQuantity: 4, expectedDailyConsumption: 2 })],
      [batch({ quantity: 10, expiryDate: '2026-08-23', expiryType: 'best_before' })],
      3,
      now
    )

    assert.equal(result.length, 0)
  })

  it('preserves the legacy minimum threshold when daily consumption is not configured', () => {
    const enough = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10, expectedDailyConsumption: 0 })],
      [batch({ quantity: 8 })],
      7,
      now
    )
    assert.equal(enough.length, 0)

    const low = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10, expectedDailyConsumption: 0 })],
      [batch({ quantity: 3 })],
      7,
      now
    )
    assert.equal(low[0]?.recommendedQuantity, 7)
    assert.equal(low[0]?.projectedQuantity, 3)
  })

  it('keeps zero-rate targets backward compatible even when current stock expires inside the horizon', () => {
    const enoughToday = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10, expectedDailyConsumption: 0 })],
      [
        batch({ id: 'soon', quantity: 5, expiryDate: '2026-08-24', expiryType: 'use_by' }),
        batch({ id: 'stable', quantity: 3 }),
      ],
      7,
      now
    )

    assert.equal(enoughToday.length, 0)

    const lowToday = computePurchasePlan(
      [target({ minimumQuantity: 12, targetQuantity: 20, expectedDailyConsumption: 0 })],
      [batch({ quantity: 6, expiryDate: '2026-08-26', expiryType: 'use_by' })],
      7,
      now
    )

    assert.equal(lowToday[0]?.currentQuantity, 6)
    assert.equal(lowToday[0]?.plannedConsumption, 0)
    assert.equal(lowToday[0]?.expiredBeforeUseQuantity, 0)
    assert.equal(lowToday[0]?.projectedQuantity, 6)
    assert.equal(lowToday[0]?.recommendedQuantity, 14)
  })

  it('propagates estimate uncertainty only when estimated stock affects the plan', () => {
    const result = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10, expectedDailyConsumption: 2 })],
      [batch({ quantity: 8, quantityIsEstimate: true })],
      3,
      now
    )

    assert.equal(result[0]?.currentQuantityIsEstimate, true)
    assert.equal(result[0]?.projectedQuantityIsEstimate, true)
    assert.equal(result[0]?.recommendationIsEstimate, true)
  })

  it('preserves estimate provenance in legacy zero-rate recommendations', () => {
    const result = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10, expectedDailyConsumption: 0 })],
      [batch({ quantity: 3, quantityIsEstimate: true })],
      7,
      now
    )

    assert.equal(result[0]?.currentQuantityIsEstimate, true)
    assert.equal(result[0]?.projectedQuantityIsEstimate, true)
    assert.equal(result[0]?.recommendationIsEstimate, true)
  })

  it('ignores wrong-unit, depleted and already-expired use-by stock', () => {
    const result = computePurchasePlan(
      [target({ minimumQuantity: 4, targetQuantity: 10, expectedDailyConsumption: 0 })],
      [
        batch({ id: 'usable', quantity: 3 }),
        batch({ id: 'wrong-unit', quantity: 50, unit: 'kg' }),
        batch({ id: 'depleted', quantity: 50, status: 'depleted' }),
        batch({ id: 'expired', quantity: 50, expiryDate: '2026-08-22', expiryType: 'use_by' }),
      ],
      7,
      now
    )

    assert.equal(result[0]?.currentQuantity, 3)
    assert.equal(result[0]?.recommendedQuantity, 7)
  })

  it('sorts stronger shortages before weaker shortages', () => {
    const result = computePurchasePlan(
      [
        target({ productId: 'critical', minimumQuantity: 1, targetQuantity: 10, expectedDailyConsumption: 0 }),
        target({ productId: 'partial', minimumQuantity: 10, targetQuantity: 20, expectedDailyConsumption: 0 }),
      ],
      [batch({ id: 'partial-stock', productId: 'partial', quantity: 10 })],
      7,
      now
    )

    assert.deepEqual(result.map((item) => item.productId), ['critical', 'partial'])
  })

  it('sorts equal shortage ratios deterministically by product id', () => {
    const result = computePurchasePlan(
      [
        target({ productId: 'z-product', minimumQuantity: 1, targetQuantity: 10, expectedDailyConsumption: 0 }),
        target({ productId: 'a-product', minimumQuantity: 1, targetQuantity: 10, expectedDailyConsumption: 0 }),
      ],
      [],
      7,
      now
    )

    assert.deepEqual(result.map((item) => item.productId), ['a-product', 'z-product'])
  })

  it('rejects invalid horizons and invalid target quantities', () => {
    assert.throws(() => computePurchasePlan([target()], [], 0, now), /between 1 and 30/)
    assert.throws(() => computePurchasePlan([target()], [], 1.5, now), /between 1 and 30/)
    assert.throws(() => computePurchasePlan([target()], [], 31, now), /between 1 and 30/)
    assert.throws(
      () => computePurchasePlan([target({ expectedDailyConsumption: -1 })], [], 7, now),
      /finite non-negative/
    )
    assert.throws(
      () => computePurchasePlan([target({ expectedDailyConsumption: Number.POSITIVE_INFINITY })], [], 7, now),
      /finite non-negative/
    )
    assert.throws(
      () => computePurchasePlan([target({ minimumQuantity: 11, targetQuantity: 10 })], [], 7, now),
      /greater than or equal/
    )
  })
})
