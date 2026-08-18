import { expect, test } from '@playwright/test'

test('EAN proxy requires auth and camera/manual prefill works without live Open Food Facts', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `ean-e2e-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'
  const ean = '8591234567890'

  const anonymousLookup = await page.request.get(`/api/products/ean?ean=${ean}`)
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

  await page.route(`**/api/products/ean?ean=${ean}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        found: true,
        product: {
          ean,
          name: 'Skyr EAN',
          brand: 'Test Dairy',
          category: 'Jogurty',
          imageUrl: null,
        },
      }),
    })
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
  await expect(page.getByLabel('EAN / čárový kód')).toBeFocused()

  await page.getByRole('button', { name: 'Skenovat kamerou' }).click()
  const scannerDialog = page.getByRole('dialog', { name: 'Namiř kameru na čárový kód' })
  await expect(scannerDialog).toBeVisible()
  await expect(scannerDialog.getByRole('status')).toContainText('Povol HlídačiJídla přístup ke kameře')
  await scannerDialog.getByRole('button', { name: 'Zavřít a zadat EAN ručně' }).click()
  await expect(scannerDialog).toBeHidden()

  await page.getByRole('button', { name: 'Skenovat kamerou' }).click()
  await expect(scannerDialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(scannerDialog).toBeHidden()

  await page.getByLabel('EAN / čárový kód').fill(ean)
  await page.getByRole('button', { name: 'Načíst údaje' }).click()

  await expect(page.getByText('Údaje jsou předvyplněné')).toBeVisible()
  await expect(page.getByLabel('Název')).toHaveValue('Skyr EAN')
  await expect(page.getByLabel('Značka')).toHaveValue('Test Dairy')
  await expect(page.getByLabel('Kategorie')).toHaveValue('Jogurty')

  await page.getByLabel('Množství').fill('2')
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  const productCard = page.getByRole('article').filter({ hasText: 'Skyr EAN' })
  await expect(productCard).toContainText('Test Dairy')
  await expect(productCard).toContainText('Doma 2 ks')
})
