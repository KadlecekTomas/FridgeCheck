export type OpenFoodFactsProduct = {
  ean: string
  name: string
  brand: string
  category: string
  imageUrl: string | null
  packageQuantity: number | null
  packageUnit: 'g' | 'ml' | null
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function firstListItem(value: unknown, maxLength: number) {
  const text = boundedString(value, 1000)
  if (!text) return ''
  return (text.split(',')[0]?.trim() ?? '').slice(0, maxLength)
}

function safeOpenFoodFactsImage(value: unknown) {
  const raw = boundedString(value, 2048)
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.hostname !== 'images.openfoodfacts.org') return null
    return url.toString()
  } catch {
    return null
  }
}

function normalizedPackageQuantity(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000_000) return null
  return Math.round((parsed + Number.EPSILON) * 1000) / 1000
}

function normalizedPackageUnit(value: unknown): 'g' | 'ml' | null {
  return value === 'g' || value === 'ml' ? value : null
}

export function normalizeBarcode(input: string) {
  const barcode = input.replace(/\s+/g, '')
  return /^\d{8,14}$/.test(barcode) ? barcode : null
}

export function mapOpenFoodFactsResponse(
  input: unknown,
  barcode: string
): OpenFoodFactsProduct | null {
  if (!isRecord(input) || input.status !== 1 || !isRecord(input.product)) return null

  const product = input.product
  const name =
    boundedString(product.product_name_cs, 200) ?? boundedString(product.product_name, 200) ?? ''
  const brand = firstListItem(product.brands, 200)
  const category = firstListItem(product.categories, 200)
  const imageUrl =
    safeOpenFoodFactsImage(product.image_front_url) ?? safeOpenFoodFactsImage(product.image_url)
  const packageQuantity = normalizedPackageQuantity(product.product_quantity)
  const packageUnit = normalizedPackageUnit(product.product_quantity_unit)
  const hasUsablePackage = packageQuantity !== null && packageUnit !== null

  return {
    ean: barcode,
    name,
    brand,
    category,
    imageUrl,
    packageQuantity: hasUsablePackage ? packageQuantity : null,
    packageUnit: hasUsablePackage ? packageUnit : null,
  }
}
