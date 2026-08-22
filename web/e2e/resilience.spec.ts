import { expect, test } from '@playwright/test'

test('recoverable failures never masquerade as empty household data', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `resilience-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.getByLabel('Název domácnosti').fill('Odolná domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await expect(page.getByRole('heading', { name: 'Přidat jídlo' })).toBeVisible()

  let failHouseholds = true
  await page.route('**/rest/v1/households*', async (route) => {
    if (!failHouseholds) {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'temporary household failure' }),
    })
  })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Domácnosti se nepodařilo načíst' })).toBeVisible()
  await expect(page.getByText('Tvoje data jsme nezměnili.')).toBeVisible()
  await expect(page.getByText('Založ první domácnost')).toHaveCount(0)
  await expect(page.getByText('Načtení selhalo')).toBeVisible()

  failHouseholds = false
  await page.getByRole('button', { name: 'Zkusit znovu' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await expect(page.getByRole('heading', { name: 'Přidat jídlo' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Kam to dáváš?' })).toHaveValue(/.+/)
  await page.unroute('**/rest/v1/households*')

  let failProducts = true
  await page.route('**/rest/v1/products*', async (route) => {
    if (!failProducts) {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'temporary products failure' }),
    })
  })

  await page.goto('/shopping')
  await expect(page.getByRole('heading', { name: 'Nákup se nepodařilo načíst' })).toBeVisible()
  await expect(page.getByText('Nic teď nedochází.')).toHaveCount(0)
  await expect(page.getByText('Nákupní seznam je prázdný')).toHaveCount(0)

  failProducts = false
  await page.getByRole('button', { name: 'Zkusit znovu' }).click()
  await expect(page.getByRole('heading', { name: 'Nákup' })).toBeVisible()
  await expect(page.getByText('Nákupní seznam je prázdný')).toBeVisible()
  await page.unroute('**/rest/v1/products*')

  await page.goto('/more')
  await expect(page.getByRole('heading', { name: 'Více' })).toBeVisible()

  let failLogout = true
  await page.route('**/auth/v1/logout*', async (route) => {
    if (!failLogout) {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'temporary logout failure' }),
    })
  })

  await page.getByRole('button', { name: 'Odhlásit se' }).click()
  await expect(page).toHaveURL(/\/more$/)
  await expect(page.locator('main').getByRole('alert')).toContainText('Odhlášení se nepodařilo')
  await expect(page.getByRole('button', { name: 'Odhlásit se' })).toBeEnabled()

  failLogout = false
  await page.getByRole('button', { name: 'Odhlásit se' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.unroute('**/auth/v1/logout*')
})
