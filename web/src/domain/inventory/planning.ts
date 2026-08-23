import { daysUntilExpiry } from '../expiry/expiry.ts'
import { isBatchUsableForStock, type DashboardBatch } from './dashboard.ts'
import { roundInventoryQuantity } from './quantity.ts'

export type PurchasePlanTarget = {
  productId: string
  minimumQuantity: number
  targetQuantity: number
  expectedDailyConsumption: number
  unit: string
}

export type PurchasePlanItem = PurchasePlanTarget & {
  horizonDays: number
  currentQuantity: number
  currentQuantityIsEstimate: boolean
  plannedConsumption: number
  coveredConsumption: number
  unmetConsumption: number
  expiredBeforeUseQuantity: number
  projectedQuantity: number
  projectedQuantityIsEstimate: boolean
  recommendedQuantity: number
  recommendationIsEstimate: boolean
}

type SimulatedBatch = {
  batch: DashboardBatch
  expiryDays: number | null
  remaining: number
}

function validateTarget(target: PurchasePlanTarget) {
  const values = [
    target.minimumQuantity,
    target.targetQuantity,
    target.expectedDailyConsumption,
  ]

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('planning target quantities must be finite non-negative numbers')
  }

  if (target.targetQuantity < target.minimumQuantity) {
    throw new RangeError('targetQuantity must be greater than or equal to minimumQuantity')
  }
}

function canUseOnDay(batch: SimulatedBatch, dayOffset: number) {
  if (batch.batch.expiryType !== 'use_by' || batch.expiryDays === null) return true
  return batch.expiryDays >= dayOffset
}

function sortFefo(a: SimulatedBatch, b: SimulatedBatch) {
  const aExpiry = a.expiryDays ?? Number.POSITIVE_INFINITY
  const bExpiry = b.expiryDays ?? Number.POSITIVE_INFINITY
  if (aExpiry !== bExpiry) return aExpiry - bExpiry
  return a.batch.id.localeCompare(b.batch.id)
}

export function computePurchasePlan(
  targets: PurchasePlanTarget[],
  batches: DashboardBatch[],
  horizonDays: number,
  now: Date = new Date()
): PurchasePlanItem[] {
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 30) {
    throw new RangeError('horizonDays must be an integer between 1 and 30')
  }

  return targets
    .map((target) => {
      validateTarget(target)

      const simulated = batches
        .filter(
          (batch) =>
            batch.productId === target.productId &&
            batch.unit === target.unit &&
            isBatchUsableForStock(batch, now)
        )
        .map<SimulatedBatch>((batch) => ({
          batch,
          expiryDays: batch.expiryDate ? daysUntilExpiry(batch.expiryDate, now) : null,
          remaining: batch.quantity,
        }))
        .sort(sortFefo)

      const currentQuantity = roundInventoryQuantity(
        simulated.reduce((sum, item) => sum + item.remaining, 0)
      )
      const currentQuantityIsEstimate = simulated.some(
        (item) => item.batch.quantityIsEstimate === true
      )

      const plannedConsumption = roundInventoryQuantity(
        target.expectedDailyConsumption * horizonDays
      )
      let coveredConsumption = 0
      let consumedEstimatedStock = false

      for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
        let remainingDailyNeed = target.expectedDailyConsumption
        if (remainingDailyNeed <= 0) break

        for (const item of simulated) {
          if (remainingDailyNeed <= 0) break
          if (item.remaining <= 0 || !canUseOnDay(item, dayOffset)) continue

          const consumed = Math.min(item.remaining, remainingDailyNeed)
          if (consumed > 0 && item.batch.quantityIsEstimate === true) {
            consumedEstimatedStock = true
          }

          item.remaining = roundInventoryQuantity(item.remaining - consumed)
          remainingDailyNeed = roundInventoryQuantity(remainingDailyNeed - consumed)
          coveredConsumption = roundInventoryQuantity(coveredConsumption + consumed)
        }
      }

      const unmetConsumption = roundInventoryQuantity(
        Math.max(0, plannedConsumption - coveredConsumption)
      )

      const projectedUsable = simulated.filter((item) => canUseOnDay(item, horizonDays))
      const projectedQuantity = roundInventoryQuantity(
        projectedUsable.reduce((sum, item) => sum + item.remaining, 0)
      )
      const projectedQuantityIsEstimate = projectedUsable.some(
        (item) => item.remaining > 0 && item.batch.quantityIsEstimate === true
      )
      const expiredBeforeUseQuantity = roundInventoryQuantity(
        simulated
          .filter((item) => !canUseOnDay(item, horizonDays))
          .reduce((sum, item) => sum + item.remaining, 0)
      )

      const recommendedQuantity = roundInventoryQuantity(
        Math.max(0, target.targetQuantity - projectedQuantity + unmetConsumption)
      )
      const recommendationIsEstimate = consumedEstimatedStock || projectedQuantityIsEstimate

      return {
        ...target,
        horizonDays,
        currentQuantity,
        currentQuantityIsEstimate,
        plannedConsumption,
        coveredConsumption,
        unmetConsumption,
        expiredBeforeUseQuantity,
        projectedQuantity,
        projectedQuantityIsEstimate,
        recommendedQuantity,
        recommendationIsEstimate,
      }
    })
    .filter((item) => {
      if (item.recommendedQuantity <= 0) return false

      // Preserve the legacy threshold when no consumption assumption is configured,
      // while allowing proactive planning as soon as the household defines a rate.
      return (
        item.expectedDailyConsumption > 0 ||
        item.projectedQuantity <= item.minimumQuantity ||
        item.unmetConsumption > 0
      )
    })
    .sort((a, b) => {
      const aRequirement = a.targetQuantity + a.plannedConsumption
      const bRequirement = b.targetQuantity + b.plannedConsumption
      const aShortageRatio = aRequirement > 0 ? a.recommendedQuantity / aRequirement : 0
      const bShortageRatio = bRequirement > 0 ? b.recommendedQuantity / bRequirement : 0

      if (aShortageRatio !== bShortageRatio) return bShortageRatio - aShortageRatio
      return a.productId.localeCompare(b.productId)
    })
}
