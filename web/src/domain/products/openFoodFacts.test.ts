import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapOpenFoodFactsResponse, normalizeBarcode } from './openFoodFacts.ts'

describe('Open Food Facts product mapping', () => {
  it('normalizes supported numeric barcodes', () => {
    assert.equal(normalizeBarcode(' 859 123 456 7890 '), '8591234567890')
    assert.equal(normalizeBarcode('12345678'), '12345678')
  })

  it('rejects malformed or implausibly sized barcodes', () => {
    assert.equal(normalizeBarcode('1234567'), null)
    assert.equal(normalizeBarcode('123456789012345'), null)
    assert.equal(normalizeBarcode('85912A4567890'), null)
    assert.equal(normalizeBarcode(''), null)
  })

  it('prefers Czech product name and maps package size for low-friction entry', () => {
    assert.deepEqual(
      mapOpenFoodFactsResponse(
        {
          status: 1,
          product: {
            product_name_cs: 'Eidam 30 %',
            product_name: 'Edam cheese',
            brands: 'Test Brand, Secondary Brand',
            categories: 'Sýry, Mléčné výrobky',
            image_front_url: 'https://images.openfoodfacts.org/images/products/123/front_cs.1.400.jpg',
            product_quantity: '100',
            product_quantity_unit: 'g',
          },
        },
        '8591234567890'
      ),
      {
        ean: '8591234567890',
        name: 'Eidam 30 %',
        brand: 'Test Brand',
        category: 'Sýry',
        imageUrl: 'https://images.openfoodfacts.org/images/products/123/front_cs.1.400.jpg',
        packageQuantity: 100,
        packageUnit: 'g',
      }
    )
  })

  it('accepts numeric normalized package quantities and rounds to inventory precision', () => {
    const mapped = mapOpenFoodFactsResponse(
      {
        status: 1,
        product: {
          product_name: 'Drink',
          product_quantity: 330.3334,
          product_quantity_unit: 'ml',
        },
      },
      '12345678'
    )

    assert.ok(mapped)
    assert.equal(mapped.packageQuantity, 330.333)
    assert.equal(mapped.packageUnit, 'ml')
  })

  it('drops incomplete or unsafe package metadata as one pair', () => {
    const missingUnit = mapOpenFoodFactsResponse(
      { status: 1, product: { product_quantity: '100' } },
      '12345678'
    )
    const invalidQuantity = mapOpenFoodFactsResponse(
      { status: 1, product: { product_quantity: '0', product_quantity_unit: 'g' } },
      '12345678'
    )
    const hugeQuantity = mapOpenFoodFactsResponse(
      { status: 1, product: { product_quantity: '1000000001', product_quantity_unit: 'g' } },
      '12345678'
    )
    const invalidUnit = mapOpenFoodFactsResponse(
      { status: 1, product: { product_quantity: '100', product_quantity_unit: 'kg' } },
      '12345678'
    )
    const invalidType = mapOpenFoodFactsResponse(
      { status: 1, product: { product_quantity: {}, product_quantity_unit: 'g' } },
      '12345678'
    )

    for (const mapped of [missingUnit, invalidQuantity, hugeQuantity, invalidUnit, invalidType]) {
      assert.ok(mapped)
      assert.equal(mapped.packageQuantity, null)
      assert.equal(mapped.packageUnit, null)
    }
  })

  it('bounds untrusted text before it reaches the form/database contract', () => {
    const mapped = mapOpenFoodFactsResponse(
      {
        status: 1,
        product: {
          product_name: 'n'.repeat(260),
          brands: `${'b'.repeat(260)},ignored`,
          categories: `${'c'.repeat(260)},ignored`,
        },
      },
      '12345678'
    )

    assert.ok(mapped)
    assert.equal(mapped.name.length, 200)
    assert.equal(mapped.brand.length, 200)
    assert.equal(mapped.category.length, 200)
  })

  it('returns a found product even when optional metadata is missing', () => {
    assert.deepEqual(
      mapOpenFoodFactsResponse({ status: 1, product: {} }, '12345678'),
      {
        ean: '12345678',
        name: '',
        brand: '',
        category: '',
        imageUrl: null,
        packageQuantity: null,
        packageUnit: null,
      }
    )
  })

  it('rejects not-found responses and untrusted image hosts', () => {
    assert.equal(mapOpenFoodFactsResponse({ status: 0 }, '12345678'), null)
    assert.equal(mapOpenFoodFactsResponse(null, '12345678'), null)
    assert.equal(mapOpenFoodFactsResponse({ status: 1, product: [] }, '12345678'), null)
    assert.deepEqual(
      mapOpenFoodFactsResponse(
        {
          status: 1,
          product: {
            product_name: 'Safe name',
            image_url: 'https://example.invalid/tracker.jpg',
          },
        },
        '12345678'
      ),
      {
        ean: '12345678',
        name: 'Safe name',
        brand: '',
        category: '',
        imageUrl: null,
        packageQuantity: null,
        packageUnit: null,
      }
    )
  })

  it('drops malformed image URLs instead of leaking them into the product contract', () => {
    assert.deepEqual(
      mapOpenFoodFactsResponse(
        {
          status: 1,
          product: {
            product_name: 'Safe name',
            image_front_url: 'not a valid absolute URL',
          },
        },
        '12345678'
      ),
      {
        ean: '12345678',
        name: 'Safe name',
        brand: '',
        category: '',
        imageUrl: null,
        packageQuantity: null,
        packageUnit: null,
      }
    )
  })
})
