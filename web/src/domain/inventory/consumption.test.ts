import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allocateConsumption, orderBatchesForFefo } from './consumption.ts'
import type { DashboardBatch } from './dashboard.ts'

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
    ...overrides,
  }
}

describe('FEFO consumption allocation', () => {
  it('orders dated usable stock before undated stock by earliest expiry', () => {
    const ordered = orderBatchesForFefo(
      [
        batch({ id: 'undated', expiryDate: null, expiryType: 'unknown' }),
        batch({ id: 'later', expiryDate: '2026-08-23' }),
        batch({ id: 'earlier', expiryDate: '2026-08-19' }),
      ],
      'pcs',
      now
    )

    assert.deepEqual(ordered.map((item) => item.id), ['earlier', 'later', 'undated'])
  })

  it('prioritizes use-by over best-before when the date is identical', () => {
    const ordered = orderBatchesForFefo(
      [
        batch({ id: 'best-before', expiryDate: '2026-08-20', expiryType: 'best_before' }),
        batch({ id: 'use-by', expiryDate: '2026-08-20', expiryType: 'use_by' }),
      ],
      'pcs',
      now
    )

    assert.deepEqual(ordered.map((item) => item.id), ['use-by', 'best-before'])
  })

  it('orders equal undated unknown batches deterministically by id', () => {
    const ordered = orderBatchesForFefo(
      [
        batch({ id: 'batch-z', expiryDate: null, expiryType: 'unknown' }),
        batch({ id: 'batch-a', expiryDate: null, expiryType: 'unknown' }),
      ],
      'pcs',
      now
    )

    assert.deepEqual(ordered.map((item) => item.id), ['batch-a', 'batch-z'])
  })

  it('excludes expired use-by stock but keeps past best-before stock usable', () => {
    const ordered = orderBatchesForFefo(
      [
        batch({ id: 'expired-use-by', expiryDate: '2026-08-17', expiryType: 'use_by' }),
        batch({ id: 'past-best-before', expiryDate: '2026-08-17', expiryType: 'best_before' }),
        batch({ id: 'fresh', expiryDate: '2026-08-19', expiryType: 'use_by' }),
      ],
      'pcs',
      now
    )

    assert.deepEqual(ordered.map((item) => item.id), ['past-best-before', 'fresh'])
  })

  it('ignores depleted, zero-quantity and incompatible-unit batches', () => {
    const ordered = orderBatchesForFefo(
      [
        batch({ id: 'depleted', status: 'depleted' }),
        batch({ id: 'zero', quantity: 0 }),
        batch({ id: 'wrong-unit', unit: 'kg' }),
        batch({ id: 'usable' }),
      ],
      'pcs',
      now
    )

    assert.deepEqual(ordered.map((item) => item.id), ['usable'])
  })

  it('allocates consumption across batches in FEFO order', () => {
    const allocations = allocateConsumption(
      [
        batch({ id: 'later', quantity: 6, expiryDate: '2026-08-21' }),
        batch({ id: 'early', quantity: 4, expiryDate: '2026-08-19' }),
        batch({ id: 'undated', quantity: 10, expiryDate: null, expiryType: 'unknown' }),
      ],
      7,
      'pcs',
      now
    )

    assert.deepEqual(allocations, [
      { batchId: 'early', quantity: 4 },
      { batchId: 'later', quantity: 3 },
    ])
  })

  it('keeps three-decimal quantity arithmetic deterministic', () => {
    const allocations = allocateConsumption(
      [
        batch({ id: 'first', quantity: 0.125, unit: 'kg' }),
        batch({ id: 'second', quantity: 0.375, unit: 'kg', expiryDate: '2026-08-21' }),
      ],
      0.4,
      'kg',
      now
    )

    assert.deepEqual(allocations, [
      { batchId: 'first', quantity: 0.125 },
      { batchId: 'second', quantity: 0.275 },
    ])
  })

  it('rejects a request larger than usable stock instead of partially allocating', () => {
    assert.throws(
      () => allocateConsumption([batch({ quantity: 2 })], 3, 'pcs', now),
      /Insufficient usable stock/
    )
  })

  it('rejects zero, negative, non-finite and over-precise requests', () => {
    assert.throws(() => allocateConsumption([batch()], 0, 'pcs', now), RangeError)
    assert.throws(() => allocateConsumption([batch()], -1, 'pcs', now), RangeError)
    assert.throws(() => allocateConsumption([batch()], Number.NaN, 'pcs', now), RangeError)
    assert.throws(() => allocateConsumption([batch()], 1.0001, 'pcs', now), RangeError)
  })
})
