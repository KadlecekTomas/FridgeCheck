import { hasAtMostThreeDecimals, roundInventoryQuantity, totalForPackages } from './quantity'

export type KnownExpiryType = 'use_by' | 'best_before'

export type PackageExpiryGroupInput = {
  packageCount: number
  expiryDate: string
}

export type CanonicalExpiryBatch = {
  quantity: number
  expiry_type: KnownExpiryType
  expiry_date: string
}

export type PackageExpiryBatchResult =
  | { ok: true; batches: CanonicalExpiryBatch[] }
  | { ok: false; error: string }

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function buildPackageExpiryBatches(
  expectedPackageCount: number,
  packageQuantity: number,
  expiryType: string,
  groups: PackageExpiryGroupInput[]
): PackageExpiryBatchResult {
  if (
    !Number.isFinite(expectedPackageCount) ||
    expectedPackageCount <= 0 ||
    !hasAtMostThreeDecimals(expectedPackageCount)
  ) {
    return { ok: false, error: 'Celkový počet balení není platný.' }
  }

  if (
    !Number.isFinite(packageQuantity) ||
    packageQuantity <= 0 ||
    !hasAtMostThreeDecimals(packageQuantity)
  ) {
    return { ok: false, error: 'Velikost jednoho balení není platná.' }
  }

  if (expiryType !== 'use_by' && expiryType !== 'best_before') {
    return { ok: false, error: 'Pro různá data vyber typ data na obalu.' }
  }

  if (groups.length < 2) {
    return { ok: false, error: 'Pro různá data rozděl balení alespoň do dvou skupin.' }
  }

  if (groups.length > 50) {
    return { ok: false, error: 'Najednou můžeš rozdělit nejvýše 50 různých dat.' }
  }

  const batches: CanonicalExpiryBatch[] = []
  let groupedPackageCount = 0

  for (const group of groups) {
    if (
      !Number.isFinite(group.packageCount) ||
      group.packageCount <= 0 ||
      !hasAtMostThreeDecimals(group.packageCount)
    ) {
      return { ok: false, error: 'Každá skupina musí mít platný počet balení větší než nula.' }
    }

    if (!isValidDate(group.expiryDate)) {
      return { ok: false, error: 'U každé skupiny vyber platné datum.' }
    }

    const quantity = totalForPackages(group.packageCount, packageQuantity)
    if (quantity === null) {
      return { ok: false, error: 'Množství jedné ze skupin se nepodařilo spočítat.' }
    }

    groupedPackageCount = roundInventoryQuantity(groupedPackageCount + group.packageCount)
    batches.push({
      quantity,
      expiry_type: expiryType,
      expiry_date: group.expiryDate,
    })
  }

  if (groupedPackageCount !== roundInventoryQuantity(expectedPackageCount)) {
    const difference = roundInventoryQuantity(expectedPackageCount - groupedPackageCount)
    return difference > 0
      ? { ok: false, error: `Rozděl ještě ${difference} balení.` }
      : { ok: false, error: `Rozděleno je o ${Math.abs(difference)} balení víc, než přidáváš.` }
  }

  return { ok: true, batches }
}
