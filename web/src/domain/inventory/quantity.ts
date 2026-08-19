export type InventoryUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs'

const SCALE = 1000
const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 3 })

export function roundInventoryQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * SCALE) / SCALE
}

export function hasAtMostThreeDecimals(value: number) {
  return Math.abs(roundInventoryQuantity(value) - value) <= Number.EPSILON * 16
}

export function totalForPackages(packageCount: number, packageQuantity: number) {
  if (!Number.isFinite(packageCount) || packageCount <= 0) return null
  if (!Number.isFinite(packageQuantity) || packageQuantity <= 0) return null

  const total = packageCount * packageQuantity
  return Number.isFinite(total) ? roundInventoryQuantity(total) : null
}

export function packageCountForTotal(totalQuantity: number, packageQuantity: number) {
  if (!Number.isFinite(totalQuantity) || totalQuantity < 0) return null
  if (!Number.isFinite(packageQuantity) || packageQuantity <= 0) return null

  return roundInventoryQuantity(totalQuantity / packageQuantity)
}

export function roundUpToPackage(totalNeeded: number, packageQuantity: number) {
  if (!Number.isFinite(totalNeeded) || totalNeeded <= 0) return 0
  if (!Number.isFinite(packageQuantity) || packageQuantity <= 0) return null

  return roundInventoryQuantity(Math.ceil(totalNeeded / packageQuantity) * packageQuantity)
}

export function formatQuantity(value: number, unit: string) {
  return `${numberFormatter.format(value)} ${unit === 'pcs' ? 'ks' : unit}`
}

export function formatPackageCount(value: number) {
  return `${numberFormatter.format(value)} balení`
}

export function formatStockQuantity(
  totalQuantity: number,
  unit: string,
  packageQuantity?: number | null,
  packageUnit?: string | null
) {
  if (
    packageQuantity !== null &&
    packageQuantity !== undefined &&
    packageUnit === unit &&
    packageQuantity > 0
  ) {
    const packageCount = packageCountForTotal(totalQuantity, packageQuantity)
    if (packageCount !== null) {
      return `${formatPackageCount(packageCount)} · ${formatQuantity(packageQuantity, packageUnit)} / balení`
    }
  }

  return formatQuantity(totalQuantity, unit)
}
