import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatPackageCount,
  formatQuantity,
  formatStockQuantity,
  hasAtMostThreeDecimals,
  packageCountForTotal,
  roundInventoryQuantity,
  roundUpToPackage,
  totalForPackages,
} from './quantity.ts'

describe('package-aware inventory quantities', () => {
  it('rounds inventory arithmetic to the database precision', () => {
    assert.equal(roundInventoryQuantity(0.1 + 0.2), 0.3)
    assert.equal(roundInventoryQuantity(1.23456), 1.235)
    assert.equal(hasAtMostThreeDecimals(1.234), true)
    assert.equal(hasAtMostThreeDecimals(1.2345), false)
  })

  it('converts package counts to stored quantities without user arithmetic', () => {
    assert.equal(totalForPackages(24, 100), 2400)
    assert.equal(totalForPackages(3, 0.1), 0.3)
    assert.equal(totalForPackages(0, 100), null)
    assert.equal(totalForPackages(Number.NaN, 100), null)
    assert.equal(totalForPackages(2, 0), null)
    assert.equal(totalForPackages(2, Number.POSITIVE_INFINITY), null)
  })

  it('converts stored quantities back to package counts', () => {
    assert.equal(packageCountForTotal(2400, 100), 24)
    assert.equal(packageCountForTotal(50, 100), 0.5)
    assert.equal(packageCountForTotal(-1, 100), null)
    assert.equal(packageCountForTotal(Number.NaN, 100), null)
    assert.equal(packageCountForTotal(100, 0), null)
    assert.equal(packageCountForTotal(100, Number.NaN), null)
  })

  it('rounds replenishment up to whole retail packages', () => {
    assert.equal(roundUpToPackage(350, 100), 400)
    assert.equal(roundUpToPackage(400, 100), 400)
    assert.equal(roundUpToPackage(0, 100), 0)
    assert.equal(roundUpToPackage(Number.NaN, 100), 0)
    assert.equal(roundUpToPackage(100, 0), null)
    assert.equal(roundUpToPackage(100, Number.NaN), null)
  })

  it('formats direct and packaged stock for people instead of database units', () => {
    assert.equal(formatQuantity(2.5, 'kg'), '2,5 kg')
    assert.equal(formatQuantity(6, 'pcs'), '6 ks')
    assert.equal(formatPackageCount(24), '24 balení')
    assert.equal(formatStockQuantity(2400, 'g', 100, 'g'), '24 balení · 100 g / balení')
    assert.equal(formatStockQuantity(2400, 'g', null, null), '2 400 g')
    assert.equal(formatStockQuantity(2400, 'g', 100, 'ml'), '2 400 g')
    assert.equal(formatStockQuantity(2400, 'g', 0, 'g'), '2 400 g')
  })
})
