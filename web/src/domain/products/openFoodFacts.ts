export type OpenFoodFactsProduct = {
  ean: string
  name: string
  brand: string
  category: string
  imageUrl: string | null
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function firstListItem(value: unknown) {
  const text = nonEmptyString(value)
  if (!text) return ''
  return text.split(',')[0]?.trim() ?? ''
}

function safeOpenFoodFactsImage(value: unknown) {
  const raw = nonEmptyString(value)
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.hostname !== 'images.openfoodfacts.org') return null
    return url.toString()
  } catch {
    return null
  }
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
  const name = nonEmptyString(product.product_name_cs) ?? nonEmptyString(product.product_name) ?? ''
  const brand = firstListItem(product.brands)
  const category = firstListItem(product.categories)
  const imageUrl =
    safeOpenFoodFactsImage(product.image_front_url) ?? safeOpenFoodFactsImage(product.image_url)

  return {
    ean: barcode,
    name,
    brand,
    category,
    imageUrl,
  }
}
