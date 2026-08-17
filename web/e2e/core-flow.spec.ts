import { expect, test } from '@playwright/test'

test('user can register, create household, add stock, set target and shop the deficit', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `e2e-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0'),
  ].join('-')

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
  await page.getByLabel('Množství').fill('10')
  await page.getByLabel('Typ data').selectOption('use_by')
  await page.getByLabel('Datum').fill(tomorrowDate)
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  const productCard = page.getByRole('article').filter({ hasText: 'Vejce' })
  await expect(productCard).toContainText('10 ks')
  await expect(productCard).toContainText('zítra')

  await productCard.getByRole('button', { name: 'Nastavit cíl' }).click()
  await productCard.getByLabel('Dochází pod').fill('12')
  await productCard.getByLabel('Chci mít doma').fill('20')
  await productCard.getByRole('button', { name: 'Uložit' }).click()
  await expect(productCard).toContainText('Minimum 12 ks · cíl 20 ks')

  await page.getByRole('link', { name: 'Nákup', exact: true }).click()
  await expect(page).toHaveURL(/\/shopping$/)
  await expect(page.getByText('Doma 10 ks / cíl 20 ks')).toBeVisible()
  await page.getByRole('button', { name: '10 ks' }).click()
  await expect(page.getByRole('button', { name: 'Přidáno' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Vejce 10 ks/ })).toBeVisible()

  await page.getByRole('link', { name: 'Domů', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Sněz nejdřív' })).toBeVisible()
  await expect(page.getByText('Vejce').first()).toBeVisible()
  await expect(page.getByText('zítra').first()).toBeVisible()
})
