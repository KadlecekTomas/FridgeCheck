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

  it('prefers Czech product name and maps only the first human-readable brand/category', () => {
    assert.deepEqual(
      mapOpenFoodFactsResponse(
        {
          status: 1,
          product: {
            product_name_cs: 'Bílý jogurt',
            product_name: 'Plain yoghurt',
            brands: 'Test Brand, Secondary Brand',
            categories: 'Jogurty, Mléčné výrobky',
            image_front_url: 'https://images.openfoodfacts.org/images/products/123/front_cs.1.400.jpg',
          },
        },
        '8591234567890'
      ),
      {
        ean: '8591234567890',
        name: 'Bílý jogurt',
        brand: 'Test Brand',
        category: 'Jogurty',
        imageUrl: 'https://images.openfoodfacts.org/images/products/123/front_cs.1.400.jpg',
      }
    )
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
      }
    )
  })

  it('rejects not-found responses and untrusted image hosts', () => {
    assert.equal(mapOpenFoodFactsResponse({ status: 0 }, '12345678'), null)
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
      }
    )
  })
})
