import { isBatchUsableForStock, type DashboardBatch } from './dashboard.ts'

export type ConsumptionAllocation = {
  batchId: string
  quantity: number
}

const QUANTITY_SCALE = 1000

function toScaledQuantity(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite non-negative number`)
  }

  const scaled = Math.round(value * QUANTITY_SCALE)
  if (Math.abs(scaled / QUANTITY_SCALE - value) > Number.EPSILON * 16) {
    throw new RangeError(`${field} supports at most three decimal places`)
  }

  return scaled
}

function expiryTypePriority(expiryType: DashboardBatch['expiryType']): number {
  if (expiryType === 'use_by') return 0
  if (expiryType === 'best_before') return 1
  return 2
}

export function orderBatchesForFefo(
  batches: DashboardBatch[],
  unit: string,
  now: Date = new Date()
): DashboardBatch[] {
  return batches
    .filter(
      (batch) =>
        batch.unit === unit &&
        isBatchUsableForStock(batch, now)
    )
    .slice()
    .sort((a, b) => {
      if (a.expiryDate === null && b.expiryDate !== null) return 1
      if (a.expiryDate !== null && b.expiryDate === null) return -1

      if (a.expiryDate !== null && b.expiryDate !== null) {
        const byDate = a.expiryDate.localeCompare(b.expiryDate)
        if (byDate !== 0) return byDate
      }

      const byExpiryType = expiryTypePriority(a.expiryType) - expiryTypePriority(b.expiryType)
      if (byExpiryType !== 0) return byExpiryType

      return a.id.localeCompare(b.id)
    })
}

export function allocateConsumption(
  batches: DashboardBatch[],
  requestedQuantity: number,
  unit: string,
  now: Date = new Date()
): ConsumptionAllocation[] {
  const requestedScaled = toScaledQuantity(requestedQuantity, 'requestedQuantity')
  if (requestedScaled <= 0) {
    throw new RangeError('requestedQuantity must be greater than zero')
  }

  const ordered = orderBatchesForFefo(batches, unit, now)
  const availableScaled = ordered.reduce(
    (sum, batch) => sum + toScaledQuantity(batch.quantity, 'batch.quantity'),
    0
  )

  if (availableScaled < requestedScaled) {
    throw new RangeError('Insufficient usable stock')
  }

  let remainingScaled = requestedScaled
  const allocations: ConsumptionAllocation[] = []

  for (const batch of ordered) {
    if (remainingScaled === 0) break

    const availableInBatch = toScaledQuantity(batch.quantity, 'batch.quantity')
    const consumedScaled = Math.min(availableInBatch, remainingScaled)

    if (consumedScaled > 0) {
      allocations.push({
        batchId: batch.id,
        quantity: consumedScaled / QUANTITY_SCALE,
      })
      remainingScaled -= consumedScaled
    }
  }

  return allocations
}
