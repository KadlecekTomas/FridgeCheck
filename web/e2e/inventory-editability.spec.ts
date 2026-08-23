import { expect, test } from '@playwright/test'

function dateFromToday(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

test('user can correct product metadata, storage and expiry with an audit trail', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `edit-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'
  const originalDate = dateFromToday(1)
  const correctedDate = dateFromToday(5)

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByLabel('Název domácnosti').fill('Edit domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)

  await page.getByRole('link', { name: 'Více', exact: true }).click()
  await page.getByRole('link', { name: /Úložná místa/ }).click()
  await expect(page.getByRole('article').filter({ hasText: 'Lednice' })).toBeVisible()
  const addStorageButton = page.getByRole('button', { name: 'Přidat', exact: true })
  await page.getByLabel('Název').fill('Mrazák')
  await page.getByLabel('Typ').selectOption('freezer')
  await expect(addStorageButton).toBeEnabled()
  await addStorageButton.click()
  await expect(page.getByRole('article').filter({ hasText: 'Mrazák' })).toBeVisible()

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await page.getByLabel('Název').fill('Jogurt')
  await page.getByLabel('Kolik toho přidáváš?').fill('4')
  await page.getByLabel('Datum na obalu').selectOption('use_by')
  await page.getByLabel('Datum', { exact: true }).fill(originalDate)
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  let productCard = page.getByRole('article').filter({ hasText: 'Jogurt' })
  await expect(productCard).toContainText('Doma 4 ks')
  await expect(productCard).toContainText('Lednice')
  await expect(productCard).toContainText('zítra')

  await productCard.getByRole('button', { name: 'Upravit produkt' }).click()
  let productDialog = page.getByRole('dialog', { name: 'Upravit údaje produktu' })
  await productDialog.getByLabel('Název').fill('Bílý jogurt')
  await productDialog.getByLabel('Značka').fill('Test Farma')
  await productDialog.getByLabel('EAN').fill('8591234567890')
  await productDialog.getByLabel('Kategorie').fill('Jogurty')
  await productDialog.getByRole('button', { name: 'Uložit' }).click()
  await expect(productDialog).not.toBeVisible()

  productCard = page.getByRole('article').filter({ hasText: 'Bílý jogurt' })
  await expect(productCard).toContainText('Test Farma')
  await expect(productCard).toContainText('Doma 4 ks')

  await productCard.getByRole('button', { name: 'Upravit údaje balení Bílý jogurt' }).click()
  const batchDialog = page.getByRole('dialog', { name: 'Upravit balení' })
  await batchDialog.getByLabel('Kam to patří').selectOption({ label: 'Mrazák' })
  await batchDialog.getByLabel('Typ data').selectOption('best_before')
  await batchDialog.getByLabel('Datum').fill(correctedDate)
  await expect(batchDialog.getByRole('button', { name: 'Uložit' })).toBeEnabled()
  await batchDialog.getByRole('button', { name: 'Uložit' }).click()
  await expect(batchDialog).not.toBeVisible()

  productCard = page.getByRole('article').filter({ hasText: 'Bílý jogurt' })
  await expect(productCard).toContainText('4 ks · Mrazák')
  await expect(productCard).toContainText('za 5 dny')

  await page.reload()
  productCard = page.getByRole('article').filter({ hasText: 'Bílý jogurt' })
  await expect(productCard).toContainText('Test Farma')
  await expect(productCard).toContainText('4 ks · Mrazák')
  await expect(productCard).toContainText('za 5 dny')

  await productCard.getByRole('button', { name: 'Upravit produkt' }).click()
  productDialog = page.getByRole('dialog', { name: 'Upravit údaje produktu' })
  await expect(productDialog.getByLabel('Název')).toHaveValue('Bílý jogurt')
  await expect(productDialog.getByLabel('Značka')).toHaveValue('Test Farma')
  await expect(productDialog.getByLabel('EAN')).toHaveValue('8591234567890')
  await expect(productDialog.getByLabel('Kategorie')).toHaveValue('Jogurty')
  await productDialog.getByRole('button', { name: 'Zavřít' }).click()

  await page.getByRole('link', { name: 'Více', exact: true }).click()
  await page.getByRole('link', { name: /Historie změn/ }).click()
  await expect(page).toHaveURL(/\/history$/)

  const moveEvent = page.getByRole('article', { name: 'Přesun · Bílý jogurt' })
  await expect(moveEvent).toContainText('Lednice → Mrazák')

  const correctionEvent = page.getByRole('article', { name: 'Oprava stavu · Bílý jogurt' })
  await expect(correctionEvent).toContainText(
    `spotřebujte do ${originalDate} → min. trvanlivost ${correctedDate}`
  )
})
