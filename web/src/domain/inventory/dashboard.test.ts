import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildUrgentBatches,
  computeLowStock,
  formatExpiryUrgency,
  isBatchUsableForStock,
  type DashboardBatch,
} from './dashboard.ts'

const now = new Date(2026, 7, 18, 12, 0, 0)

function batch(overrides: Partial<DashboardBatch> = {}): DashboardBatch {
  return {
    id: 'batch-a',
    productId: 'product-a',
    quantity: 5,
    unit: 'pcs',
    expiryDate: '2026-08-20',
    expiryType: 'use_by',
    status: 'active',
    estimated: false,
    ...overrides,
  }
}

describe('dashboard inventory rules', () => {
  it('orders urgent batches by calendar-day urgency and excludes later stock', () => {
    const result = buildUrgentBatches(
      [
        batch({ id: 'later', expiryDate: '2026-08-22' }),
        batch({ id: 'tomorrow', expiryDate: '2026-08-19' }),
        batch({ id: 'expired', expiryDate: '2026-08-17' }),
        batch({ id: 'today', expiryDate: '2026-08-18' }),
      ],
      now,
      3
    )

    assert.deepEqual(
      result.map((item) => [item.id, item.daysRemaining]),
      [
        ['expired', -1],
        ['today', 0],
        ['tomorrow', 1],
      ]
    )
  })

  it('orders equally urgent batches deterministically by id', () => {
    const result = buildUrgentBatches(
      [
        batch({ id: 'batch-z', expiryDate: '2026-08-19' }),
        batch({ id: 'batch-a', expiryDate: '2026-08-19' }),
      ],
      now,
      3
    )

    assert.deepEqual(result.map((item) => item.id), ['batch-a', 'batch-z'])
  })

  it('rejects invalid urgency horizons', () => {
    assert.throws(() => buildUrgentBatches([], now, -1), /horizonDays must be a non-negative integer/)
    assert.throws(() => buildUrgentBatches([], now, 1.5), /horizonDays must be a non-negative integer/)
  })

  it('does not surface depleted or zero-quantity batches as urgent', () => {
    const result = buildUrgentBatches(
      [
        batch({ id: 'depleted', status: 'depleted', expiryDate: '2026-08-18' }),
        batch({ id: 'zero', quantity: 0, expiryDate: '2026-08-18' }),
      ],
      now
    )

    assert.equal(result.length, 0)
  })

  it('excludes expired use-by stock from usable quantity', () => {
    assert.equal(
      isBatchUsableForStock(batch({ expiryDate: '2026-08-17', expiryType: 'use_by' }), now),
      false
    )
  })

  it('keeps active best-before stock usable after the date', () => {
    assert.equal(
      isBatchUsableForStock(
        batch({ expiryDate: '2026-08-17', expiryType: 'best_before' }),
        now
      ),
      true
    )
  })

  it('computes low stock only from compatible usable batches', () => {
    const result = computeLowStock(
      [
        {
          productId: 'eggs',
          minimumQuantity: 4,
          targetQuantity: 10,
          unit: 'pcs',
        },
      ],
      [
        batch({ id: 'usable', productId: 'eggs', quantity: 3, unit: 'pcs' }),
        batch({
          id: 'expired',
          productId: 'eggs',
          quantity: 4,
          unit: 'pcs',
          expiryDate: '2026-08-17',
          expiryType: 'use_by',
        }),
        batch({ id: 'wrong-unit', productId: 'eggs', quantity: 2, unit: 'kg' }),
      ],
      now
    )

    assert.deepEqual(result, [
      {
        productId: 'eggs',
        minimumQuantity: 4,
        targetQuantity: 10,
        unit: 'pcs',
        currentQuantity: 3,
        currentQuantityEstimated: false,
        recommendedQuantity: 7,
        recommendedQuantityEstimated: false,
      },
    ])
  })

  it('marks replenishment as estimated when usable stock contains an estimate', () => {
    const result = computeLowStock(
      [
        {
          productId: 'oats',
          minimumQuantity: 300,
          targetQuantity: 500,
          unit: 'g',
        },
      ],
      [batch({ productId: 'oats', quantity: 250, unit: 'g', estimated: true })],
      now
    )

    assert.deepEqual(result, [
      {
        productId: 'oats',
        minimumQuantity: 300,
        targetQuantity: 500,
        unit: 'g',
        currentQuantity: 250,
        currentQuantityEstimated: true,
        recommendedQuantity: 250,
        recommendedQuantityEstimated: true,
      },
    ])
  })

  it('sorts low stock by relative depletion and product id for equal ratios', () => {
    const result = computeLowStock(
      [
        { productId: 'z-product', minimumQuantity: 5, targetQuantity: 10, unit: 'pcs' },
        { productId: 'a-product', minimumQuantity: 5, targetQuantity: 10, unit: 'pcs' },
        { productId: 'empty-product', minimumQuantity: 5, targetQuantity: 10, unit: 'pcs' },
      ],
      [
        batch({ id: 'z-stock', productId: 'z-product', quantity: 5 }),
        batch({ id: 'a-stock', productId: 'a-product', quantity: 5 }),
      ],
      now
    )

    assert.deepEqual(result.map((item) => item.productId), [
      'empty-product',
      'a-product',
      'z-product',
    ])
  })

  it('does not recommend a purchase when usable stock is above minimum', () => {
    const result = computeLowStock(
      [
        {
          productId: 'eggs',
          minimumQuantity: 4,
          targetQuantity: 10,
          unit: 'pcs',
        },
      ],
      [batch({ productId: 'eggs', quantity: 5 })],
      now
    )

    assert.equal(result.length, 0)
  })

  it('formats urgency without treating best-before as unsafe use-by', () => {
    assert.equal(formatExpiryUrgency(-1, 'use_by'), 'prošlé')
    assert.equal(formatExpiryUrgency(-1, 'best_before'), 'po min. trvanlivosti')
    assert.equal(formatExpiryUrgency(0, 'use_by'), 'dnes')
    assert.equal(formatExpiryUrgency(1, 'use_by'), 'zítra')
    assert.equal(formatExpiryUrgency(3, 'use_by'), 'za 3 dny')
  })
})
