import { NextResponse } from 'next/server'
import { mapOpenFoodFactsResponse, normalizeBarcode } from '@/domain/products/openFoodFacts'
import { getCurrentUserV2 } from '@/lib/auth/v2-server'

const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'product_name_cs',
  'brands',
  'categories',
  'image_front_url',
  'image_url',
].join(',')

const OPEN_FOOD_FACTS_USER_AGENT = 'HlidacJidla/0.1 (https://hlidacjidla.eu)'

export async function GET(request: Request) {
  const user = await getCurrentUserV2()
  if (!user) {
    return NextResponse.json(
      { found: false, error: 'authentication_required' },
      { status: 401 }
    )
  }

  const requestUrl = new URL(request.url)
  const barcode = normalizeBarcode(requestUrl.searchParams.get('ean') ?? '')

  if (!barcode) {
    return NextResponse.json(
      { found: false, error: 'invalid_barcode' },
      { status: 400 }
    )
  }

  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${barcode}`)
  url.searchParams.set('fields', OPEN_FOOD_FACTS_FIELDS)
  url.searchParams.set('lc', 'cs')

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': OPEN_FOOD_FACTS_USER_AGENT,
      },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { found: false, error: 'upstream_unavailable' },
        { status: 502 }
      )
    }

    const raw: unknown = await response.json()
    const product = mapOpenFoodFactsResponse(raw, barcode)

    if (!product) {
      return NextResponse.json({ found: false }, { status: 404 })
    }

    return NextResponse.json({ found: true, product })
  } catch {
    return NextResponse.json(
      { found: false, error: 'upstream_unavailable' },
      { status: 502 }
    )
  }
}
