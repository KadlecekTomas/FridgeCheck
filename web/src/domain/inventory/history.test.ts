import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatInventoryEventQuantity,
  inventoryEventDirection,
  inventoryEventLabel,
} from './history.ts'

describe('inventory history presentation', () => {
  it('uses user-facing labels for every inventory event type', () => {
    assert.equal(inventoryEventLabel('purchase'), 'Nákup')
    assert.equal(inventoryEventLabel('consume'), 'Spotřeba')
    assert.equal(inventoryEventLabel('discard'), 'Vyhození')
    assert.equal(inventoryEventLabel('correction'), 'Oprava stavu')
    assert.equal(inventoryEventLabel('move'), 'Přesun')
    assert.equal(inventoryEventLabel('open'), 'Otevření')
  })

  it('formats signed Czech quantities and preserves estimate provenance', () => {
    assert.equal(formatInventoryEventQuantity(1, 'pcs'), '+1 ks')
    assert.equal(formatInventoryEventQuantity(-2, 'pcs'), '−2 ks')
    assert.equal(formatInventoryEventQuantity(1.25, 'kg'), '+1,25 kg')
    assert.equal(formatInventoryEventQuantity(-0.125, 'l'), '−0,125 l')
    assert.equal(formatInventoryEventQuantity(150, 'g', true), '+≈150 g')
    assert.equal(formatInventoryEventQuantity(-100, 'g', true), '−≈100 g')
  })

  it('does not pretend a precision-only correction changed quantity', () => {
    assert.equal(formatInventoryEventQuantity(0, 'g'), null)
    assert.equal(formatInventoryEventQuantity(0, 'g', true), null)
  })

  it('returns no quantity when delta or unit is absent', () => {
    assert.equal(formatInventoryEventQuantity(null, 'pcs'), null)
    assert.equal(formatInventoryEventQuantity(1, null), null)
  })

  it('classifies quantity direction for visual treatment', () => {
    assert.equal(inventoryEventDirection(2), 'increase')
    assert.equal(inventoryEventDirection(-2), 'decrease')
    assert.equal(inventoryEventDirection(0), 'neutral')
    assert.equal(inventoryEventDirection(null), 'neutral')
  })
})
