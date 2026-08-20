import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPackageExpiryBatches } from './expiryGroups.ts'

describe('mixed package expiry groups', () => {
  it('converts package groups into canonical batches while preserving dates', () => {
    assert.deepEqual(
      buildPackageExpiryBatches(24, 100, 'use_by', [
        { packageCount: 10, expiryDate: '2026-09-05' },
        { packageCount: 8, expiryDate: '2026-09-12' },
        { packageCount: 6, expiryDate: '2026-09-20' },
      ]),
      {
        ok: true,
        batches: [
          { quantity: 1000, expiry_type: 'use_by', expiry_date: '2026-09-05' },
          { quantity: 800, expiry_type: 'use_by', expiry_date: '2026-09-12' },
          { quantity: 600, expiry_type: 'use_by', expiry_date: '2026-09-20' },
        ],
      }
    )
  })

  it('rejects a split that does not add up to the entered package count', () => {
    assert.deepEqual(
      buildPackageExpiryBatches(24, 100, 'best_before', [
        { packageCount: 10, expiryDate: '2026-09-05' },
        { packageCount: 8, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'Rozděl ještě 6 balení.' }
    )

    assert.deepEqual(
      buildPackageExpiryBatches(24, 100, 'best_before', [
        { packageCount: 20, expiryDate: '2026-09-05' },
        { packageCount: 8, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'Rozděleno je o 4 balení víc, než přidáváš.' }
    )
  })

  it('rejects invalid overall package counts and package sizes', () => {
    const validGroups = [
      { packageCount: 1, expiryDate: '2026-09-05' },
      { packageCount: 1, expiryDate: '2026-09-12' },
    ]

    assert.deepEqual(
      buildPackageExpiryBatches(0, 100, 'use_by', validGroups),
      { ok: false, error: 'Celkový počet balení není platný.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(Number.NaN, 100, 'use_by', validGroups),
      { ok: false, error: 'Celkový počet balení není platný.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(1.2345, 100, 'use_by', validGroups),
      { ok: false, error: 'Celkový počet balení není platný.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(2, 0, 'use_by', validGroups),
      { ok: false, error: 'Velikost jednoho balení není platná.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(2, Number.POSITIVE_INFINITY, 'use_by', validGroups),
      { ok: false, error: 'Velikost jednoho balení není platná.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(2, 1.2345, 'use_by', validGroups),
      { ok: false, error: 'Velikost jednoho balení není platná.' }
    )
  })

  it('requires a known expiry type and between two and fifty groups', () => {
    assert.deepEqual(
      buildPackageExpiryBatches(2, 100, 'unknown', [
        { packageCount: 1, expiryDate: '2026-09-05' },
        { packageCount: 1, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'Pro různá data vyber typ data na obalu.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(1, 100, 'use_by', [
        { packageCount: 1, expiryDate: '2026-09-05' },
      ]),
      { ok: false, error: 'Pro různá data rozděl balení alespoň do dvou skupin.' }
    )

    const tooManyGroups = Array.from({ length: 51 }, (_, index) => ({
      packageCount: 1,
      expiryDate: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
    }))
    assert.deepEqual(
      buildPackageExpiryBatches(51, 100, 'best_before', tooManyGroups),
      { ok: false, error: 'Najednou můžeš rozdělit nejvýše 50 různých dat.' }
    )
  })

  it('rejects invalid group quantities and dates', () => {
    assert.deepEqual(
      buildPackageExpiryBatches(2, 100, 'use_by', [
        { packageCount: 0, expiryDate: '2026-09-05' },
        { packageCount: 2, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'Každá skupina musí mít platný počet balení větší než nula.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(2, 100, 'use_by', [
        { packageCount: Number.NaN, expiryDate: '2026-09-05' },
        { packageCount: 2, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'Každá skupina musí mít platný počet balení větší než nula.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(2, 100, 'use_by', [
        { packageCount: 0.1234, expiryDate: '2026-09-05' },
        { packageCount: 1.8766, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'Každá skupina musí mít platný počet balení větší než nula.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(2, 100, 'use_by', [
        { packageCount: 1, expiryDate: '' },
        { packageCount: 1, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'U každé skupiny vyber platné datum.' }
    )
    assert.deepEqual(
      buildPackageExpiryBatches(2, 100, 'use_by', [
        { packageCount: 1, expiryDate: '2026-02-30' },
        { packageCount: 1, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'U každé skupiny vyber platné datum.' }
    )
  })

  it('rejects canonical arithmetic overflow instead of persisting an invalid quantity', () => {
    assert.deepEqual(
      buildPackageExpiryBatches(2e155, 1e155, 'use_by', [
        { packageCount: 1e155, expiryDate: '2026-09-05' },
        { packageCount: 1e155, expiryDate: '2026-09-12' },
      ]),
      { ok: false, error: 'Množství jedné ze skupin se nepodařilo spočítat.' }
    )
  })

  it('accepts three-decimal package counts without floating-point drift', () => {
    assert.deepEqual(
      buildPackageExpiryBatches(1.5, 100, 'use_by', [
        { packageCount: 0.5, expiryDate: '2026-09-05' },
        { packageCount: 1, expiryDate: '2026-09-12' },
      ]),
      {
        ok: true,
        batches: [
          { quantity: 50, expiry_type: 'use_by', expiry_date: '2026-09-05' },
          { quantity: 100, expiry_type: 'use_by', expiry_date: '2026-09-12' },
        ],
      }
    )
  })
})
