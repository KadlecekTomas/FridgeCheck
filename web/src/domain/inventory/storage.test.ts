import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { storageDeletionBlockReason, storageTypeLabel } from './storage.ts'

describe('storage management rules', () => {
  it('labels supported storage types for the UI', () => {
    assert.equal(storageTypeLabel('fridge'), 'Lednice')
    assert.equal(storageTypeLabel('freezer'), 'Mrazák')
    assert.equal(storageTypeLabel('pantry'), 'Spíž')
    assert.equal(storageTypeLabel('cabinet'), 'Skříňka')
    assert.equal(storageTypeLabel('other'), 'Jiné')
  })

  it('does not allow deleting the last storage unit', () => {
    assert.equal(
      storageDeletionBlockReason({ totalStorageUnits: 1, referencedBatchCount: 0 }),
      'Domácnost musí mít alespoň jedno úložné místo.'
    )
  })

  it('does not allow deleting a storage unit referenced by batch history', () => {
    assert.equal(
      storageDeletionBlockReason({ totalStorageUnits: 3, referencedBatchCount: 1 }),
      'Úložiště má historii zásob. Přejmenuj ho místo smazání, aby zůstala historie dohledatelná.'
    )
  })

  it('allows deleting an unused non-last storage unit', () => {
    assert.equal(
      storageDeletionBlockReason({ totalStorageUnits: 2, referencedBatchCount: 0 }),
      null
    )
  })
})
