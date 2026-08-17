import { daysUntilExpiry } from '@/domain/expiry/expiry'

export type DashboardExpiryType = 'use_by' | 'best_before' | 'unknown'
export type DashboardBatchStatus = 'active' | 'depleted' | 'discarded'

export type DashboardBatch = {
  id: string
  productId: string
  quantity: number
  unit: string
  expiryDate: string | null
  expiryType: DashboardExpiryType
  status: DashboardBatchStatus
}

export type DashboardStockTarget = {
  productId: string
  minimumQuantity: number
  targetQuantity: number
  unit: string
}

export type UrgentBatch = DashboardBatch & {
  daysRemaining: number
}

export type LowStockItem = DashboardStockTarget & {
  currentQuantity: number
  recommendedQuantity: number
}

export function isBatchUsableForStock(batch: DashboardBatch, now: Date = new Date()): boolean {
  if (batch.status !== 'active' || batch.quantity <= 0) return false

  if (
    batch.expiryType === 'use_by' &&
    batch.expiryDate &&
    daysUntilExpiry(batch.expiryDate, now) < 0
  ) {
    return false
  }

  return true
}

export function buildUrgentBatches(
  batches: DashboardBatch[],
  now: Date = new Date(),
  horizonDays = 3
): UrgentBatch[] {
  if (!Number.isInteger(horizonDays) || horizonDays < 0) {
    throw new RangeError('horizonDays must be a non-negative integer')
  }

  return batches
    .filter((batch) => batch.status === 'active' && batch.quantity > 0 && batch.expiryDate)
    .map((batch) => ({
      ...batch,
      daysRemaining: daysUntilExpiry(batch.expiryDate!, now),
    }))
    .filter((batch) => batch.daysRemaining <= horizonDays)
    .sort((a, b) => {
      if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining
      return a.id.localeCompare(b.id)
    })
}

export function computeLowStock(
  targets: DashboardStockTarget[],
  batches: DashboardBatch[],
  now: Date = new Date()
): LowStockItem[] {
  return targets
    .map((target) => {
      const currentQuantity = batches
        .filter(
          (batch) =>
            batch.productId === target.productId &&
            batch.unit === target.unit &&
            isBatchUsableForStock(batch, now)
        )
        .reduce((sum, batch) => sum + batch.quantity, 0)

      return {
        ...target,
        currentQuantity,
        recommendedQuantity: Math.max(0, target.targetQuantity - currentQuantity),
      }
    })
    .filter(
      (item) =>
        item.currentQuantity <= item.minimumQuantity && item.recommendedQuantity > 0
    )
    .sort((a, b) => {
      const aRatio = a.targetQuantity === 0 ? 1 : a.currentQuantity / a.targetQuantity
      const bRatio = b.targetQuantity === 0 ? 1 : b.currentQuantity / b.targetQuantity
      if (aRatio !== bRatio) return aRatio - bRatio
      return a.productId.localeCompare(b.productId)
    })
}

export function formatExpiryUrgency(
  daysRemaining: number,
  expiryType: DashboardExpiryType
): string {
  if (daysRemaining < 0) {
    return expiryType === 'best_before' ? 'po min. trvanlivosti' : 'prošlé'
  }
  if (daysRemaining === 0) return 'dnes'
  if (daysRemaining === 1) return 'zítra'
  return `za ${daysRemaining} dny`
}
