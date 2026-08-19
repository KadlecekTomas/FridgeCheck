import { expect, test } from '@playwright/test'

test('barcode entry stays usable for known, unknown, packaged and unavailable products', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `ean-e2e-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'
  const packagedEan = '8591234567890'
  const unknownEan = '12345678'
  const unavailableEan = '1234567890123'

  const anonymousLookup = await page.request.get(`/api/products/ean?ean=${packagedEan}`)
  expect(anonymousLookup.status()).toBe(401)

  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'mediaDevices', {
      configurable: true,
      get() {
        return {
          enumerateDevices: async () => [],
          getUserMedia: async () => {
            throw new DOMException('Camera permission denied in E2E', 'NotAllowedError')
          },
        }
      },
    })
  })

  let packagedExternalLookups = 0
  let unknownExternalLookups = 0
  let unavailableExternalLookups = 0
  await page.route('**/api/products/ean?ean=*', async (route) => {
    const url = new URL(route.request().url())
    const ean = url.searchParams.get('ean')

    if (ean === packagedEan) {
      packagedExternalLookups += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          found: true,
          product: {
            ean: packagedEan,
            name: 'Eidam EAN',
            brand: 'Test Dairy',
            category: 'Sýry',
            imageUrl: null,
            packageQuantity: 100,
            packageUnit: 'g',
          },
        }),
      })
      return
    }

    if (ean === unknownEan) {
      unknownExternalLookups += 1
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ found: false }) })
      return
    }

    if (ean === unavailableEan) {
      unavailableExternalLookups += 1
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ found: false, error: 'upstream_unavailable' }),
      })
      return
    }

    await route.abort()
  })

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByLabel('Název domácnosti').fill('EAN domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()
  await expect(page.getByRole('heading', { name: 'Co dnes potřebuje pozornost' })).toBeVisible()

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await expect(page.getByLabel('Čárový kód')).toBeFocused()

  await page.getByRole('button', { name: 'Skenovat kamerou' }).click()
  const scannerDialog = page.getByRole('dialog', { name: 'Namiř kameru na čárový kód' })
  await expect(scannerDialog).toBeVisible()
  await expect(scannerDialog.getByRole('status')).toContainText('Povol HlídačiJídla přístup ke kameře')
  await scannerDialog.getByRole('button', { name: 'Zavřít a zadat EAN ručně' }).click()
  await expect(scannerDialog).toBeHidden()

  await page.getByLabel('Čárový kód').fill(packagedEan)
  await page.getByRole('button', { name: 'Najít podle kódu' }).click()

  await expect(page.getByRole('status')).toContainText('Jedno balení má 100 g')
  await expect(page.getByLabel('Název')).toHaveValue('Eidam EAN')
  await expect(page.getByText('Test Dairy')).toBeVisible()
  await expect(page.getByLabel('Kolik balení máš?')).toHaveValue('1')
  await page.getByLabel('Kolik balení máš?').fill('24')
  await expect(page.getByText(/24 balení × 100 g = 2.?400 g celkem/)).toBeVisible()
  await page.getByRole('button', { name: 'Přidat balení' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  let productCard = page.getByRole('article').filter({ hasText: 'Eidam EAN' })
  await expect(productCard).toContainText('Doma 24 balení · 100 g / balení')
  expect(packagedExternalLookups).toBe(1)

  await productCard.getByRole('button', { name: 'Spotřebovat Eidam EAN' }).click()
  const consumeDialog = page.getByRole('dialog', { name: 'Kolik balení jsi spotřeboval?' })
  await consumeDialog.getByLabel('Počet balení').fill('1')
  await consumeDialog.getByRole('button', { name: 'Potvrdit' }).click()
  await expect(consumeDialog).toBeHidden()
  productCard = page.getByRole('article').filter({ hasText: 'Eidam EAN' })
  await expect(productCard).toContainText('Doma 23 balení · 100 g / balení')

  await page.getByRole('link', { name: 'Přidat jídlo' }).click()
  await page.getByLabel('Čárový kód').fill(packagedEan)
  await page.getByRole('button', { name: 'Najít podle kódu' }).click()
  await expect(page.getByRole('status')).toContainText('Tenhle kód už známe jako Eidam EAN')
  await expect(page.getByLabel('Co přidáváš?')).toHaveValue(/.+/)
  await page.getByLabel('Kolik balení máš?').fill('2')
  await page.getByRole('button', { name: 'Přidat balení' }).click()
  await expect(page).toHaveURL(/\/inventory$/)
  productCard = page.getByRole('article').filter({ hasText: 'Eidam EAN' })
  await expect(productCard).toContainText('Doma 25 balení · 100 g / balení')
  expect(packagedExternalLookups).toBe(1)

  await productCard.getByRole('button', { name: 'Hlídání zásoby' }).click()
  await productCard.getByLabel('Upozorni, když mám méně než').fill('26')
  await productCard.getByLabel('Chci mít doma').fill('30')
  await productCard.getByRole('button', { name: 'Uložit' }).click()
  await expect(productCard).toContainText('Dochází pod 26 balení · 100 g / balení · chci mít 30 balení · 100 g / balení')

  await page.getByRole('link', { name: 'Nákup', exact: true }).click()
  await expect(page).toHaveURL(/\/shopping$/)
  await expect(page.getByText(/Doma 25 balení · 100 g \/ balení · chci 30 balení · 100 g \/ balení/)).toBeVisible()
  await page.getByRole('button', { name: /Přidat Eidam EAN: 5 balení · 100 g \/ balení/ }).click()

  let packagedShoppingItem = page.getByRole('group', { name: 'Nákupní položka Eidam EAN' })
  await expect(packagedShoppingItem).toContainText('5 balení · 100 g / balení')
  await packagedShoppingItem.getByRole('button', { name: 'Upravit Eidam EAN' }).click()
  const packagedShoppingEditor = page.getByRole('dialog', { name: 'Upravit položku' })
  await expect(packagedShoppingEditor.getByLabel('Počet balení k nákupu')).toBeFocused()
  await packagedShoppingEditor.getByLabel('Počet balení k nákupu').fill('6')
  await packagedShoppingEditor.getByRole('button', { name: 'Uložit' }).click()
  await expect(packagedShoppingEditor).toBeHidden()
  packagedShoppingItem = page.getByRole('group', { name: 'Nákupní položka Eidam EAN' })
  await expect(packagedShoppingItem).toContainText('6 balení · 100 g / balení')

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await page.getByLabel('Čárový kód').fill(unknownEan)
  await page.getByRole('button', { name: 'Najít podle kódu' }).click()
  await expect(page.getByRole('status')).toContainText('Tenhle kód zatím neznáme')
  await page.getByLabel('Název').fill('Moje neznámá tyčinka')
  await page.getByLabel('Kolik toho přidáváš?').fill('3')
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()
  await expect(page).toHaveURL(/\/inventory$/)
  await expect(page.getByRole('article').filter({ hasText: 'Moje neznámá tyčinka' })).toContainText('Doma 3 ks')
  expect(unknownExternalLookups).toBe(1)

  await page.getByRole('link', { name: 'Přidat jídlo' }).click()
  await page.getByLabel('Čárový kód').fill(unknownEan)
  await page.getByRole('button', { name: 'Najít podle kódu' }).click()
  await expect(page.getByRole('status')).toContainText('Tenhle kód už známe jako Moje neznámá tyčinka')
  expect(unknownExternalLookups).toBe(1)

  await page.getByRole('button', { name: 'Nové jídlo' }).click()
  await page.getByLabel('Čárový kód').fill(unavailableEan)
  await page.getByRole('button', { name: 'Najít podle kódu' }).click()
  await expect(page.getByRole('status')).toContainText('Online databáze teď neodpovídá')
  await page.getByLabel('Název').fill('Offline produkt')
  await page.getByLabel('Kolik toho přidáváš?').fill('1')
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()
  await expect(page).toHaveURL(/\/inventory$/)
  await expect(page.getByRole('article').filter({ hasText: 'Offline produkt' })).toContainText('Doma 1 ks')
  expect(unavailableExternalLookups).toBe(1)
})
