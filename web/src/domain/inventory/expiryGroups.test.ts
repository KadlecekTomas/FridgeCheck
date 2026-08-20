import { describe, expect, it } from 'vitest'
import { buildPackageExpiryBatches } from './expiryGroups'

describe('buildPackageExpiryBatches', () => {
  it('converts package groups into canonical batches while preserving dates', () => {
    expect(
      buildPackageExpiryBatches(24, 100, 'use_by', [
        { packageCount: 10, expiryDate: '2026-09-05' },
        { packageCount: 8, expiryDate: '2026-09-12' },
        { packageCount: 6, expiryDate: '2026-09-20' },
      ])
    ).toEqual({
      ok: true,
      batches: [
        { quantity: 1000, expiry_type: 'use_by', expiry_date: '2026-09-05' },
        { quantity: 800, expiry_type: 'use_by', expiry_date: '2026-09-12' },
        { quantity: 600, expiry_type: 'use_by', expiry_date: '2026-09-20' },
      ],
    })
  })

  it('rejects a split that does not add up to the entered package count', () => {
    expect(
      buildPackageExpiryBatches(24, 100, 'best_before', [
        { packageCount: 10, expiryDate: '2026-09-05' },
        { packageCount: 8, expiryDate: '2026-09-12' },
      ])
    ).toEqual({ ok: false, error: 'Rozděl ještě 6 balení.' })

    expect(
      buildPackageExpiryBatches(24, 100, 'best_before', [
        { packageCount: 20, expiryDate: '2026-09-05' },
        { packageCount: 8, expiryDate: '2026-09-12' },
      ])
    ).toEqual({ ok: false, error: 'Rozděleno je o 4 balení víc, než přidáváš.' })
  })

  it('rejects missing dates, unknown expiry type and invalid group quantities', () => {
    expect(
      buildPackageExpiryBatches(2, 100, 'unknown', [
        { packageCount: 1, expiryDate: '2026-09-05' },
        { packageCount: 1, expiryDate: '2026-09-12' },
      ])
    ).toEqual({ ok: false, error: 'Pro různá data vyber typ data na obalu.' })

    expect(
      buildPackageExpiryBatches(2, 100, 'use_by', [
        { packageCount: 1, expiryDate: '' },
        { packageCount: 1, expiryDate: '2026-09-12' },
      ])
    ).toEqual({ ok: false, error: 'U každé skupiny vyber platné datum.' })

    expect(
      buildPackageExpiryBatches(2, 100, 'use_by', [
        { packageCount: 0, expiryDate: '2026-09-05' },
        { packageCount: 2, expiryDate: '2026-09-12' },
      ])
    ).toEqual({ ok: false, error: 'Každá skupina musí mít platný počet balení větší než nula.' })
  })

  it('accepts three-decimal package counts without floating-point drift', () => {
    expect(
      buildPackageExpiryBatches(1.5, 100, 'use_by', [
        { packageCount: 0.5, expiryDate: '2026-09-05' },
        { packageCount: 1, expiryDate: '2026-09-12' },
      ])
    ).toEqual({
      ok: true,
      batches: [
        { quantity: 50, expiry_type: 'use_by', expiry_date: '2026-09-05' },
        { quantity: 100, expiry_type: 'use_by', expiry_date: '2026-09-12' },
      ],
    })
  })
})
