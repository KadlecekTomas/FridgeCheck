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

test('user can register, consume stock by FEFO and shop the resulting deficit', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `e2e-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'
  const tomorrowDate = dateFromToday(1)
  const laterDate = dateFromToday(3)

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Založ první domácnost' })).toBeVisible()

  await page.getByLabel('Název domácnosti').fill('E2E domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()
  await expect(page.getByRole('heading', { name: 'Co dnes potřebuje pozornost' })).toBeVisible()
  await expect(page.getByText('Lednice')).toBeVisible()

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await page.getByLabel('Název').fill('Vejce')
  await page.getByLabel('Množství').fill('5')
  await page.getByLabel('Typ data').selectOption('use_by')
  await page.getByLabel('Datum').fill(tomorrowDate)
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  let productCard = page.getByRole('article').filter({ hasText: 'Vejce' })
  await expect(productCard).toContainText('Doma 5 ks')
  await expect(productCard).toContainText('zítra')

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await page.getByRole('button', { name: 'Další balení' }).click()
  await page.getByLabel('Produkt').selectOption({ label: 'Vejce' })
  await page.getByLabel('Množství').fill('7')
  await page.getByLabel('Typ data').selectOption('use_by')
  await page.getByLabel('Datum').fill(laterDate)
  await page.getByRole('button', { name: 'Přidat balení' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  productCard = page.getByRole('article').filter({ hasText: 'Vejce' })
  await expect(productCard).toContainText('Doma 12 ks · 2 aktivní balení')
  await expect(productCard).toContainText('zítra')
  await expect(productCard).toContainText('za 3 dny')

  await productCard.getByRole('button', { name: 'Nastavit cíl' }).click()
  await productCard.getByLabel('Dochází pod').fill('12')
  await productCard.getByLabel('Chci mít doma').fill('20')
  await productCard.getByRole('button', { name: 'Uložit' }).click()
  await expect(productCard).toContainText('Minimum 12 ks · cíl 20 ks')

  await productCard.getByRole('button', { name: 'Spotřebovat Vejce' }).click()
  const consumeDialog = page.getByRole('dialog', { name: 'Kolik jsi spotřeboval?' })
  await expect(consumeDialog).toContainText('Použitelně doma')
  await expect(consumeDialog).toContainText('12 ks')
  await consumeDialog.getByLabel('Množství ke spotřebě').fill('7')
  await consumeDialog.getByRole('button', { name: 'Potvrdit' }).click()

  await expect(consumeDialog).not.toBeVisible()
  await expect(productCard).toContainText('Doma 5 ks · 1 aktivní balení')
  await expect(productCard).not.toContainText('zítra')
  await expect(productCard).toContainText('za 3 dny')

  await page.getByRole('link', { name: 'Nákup', exact: true }).click()
  await expect(page).toHaveURL(/\/shopping$/)
  await expect(page.getByText('Doma 5 ks / cíl 20 ks')).toBeVisible()
  await page.getByRole('button', { name: '15 ks' }).click()
  await expect(page.getByRole('button', { name: 'Přidáno' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Vejce 15 ks/ })).toBeVisible()

  await page.getByRole('link', { name: 'Domů', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Sněz nejdřív' })).toBeVisible()
  await expect(page.getByText('Vejce').first()).toBeVisible()
  await expect(page.getByText('za 3 dny').first()).toBeVisible()
})
