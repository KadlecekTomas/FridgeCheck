import { expect, test } from '@playwright/test'

test('user can record an approximate quantity and later make it exact without changing the amount', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `estimate-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByLabel('Název domácnosti').fill('Odhad domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)

  await page.getByLabel('Název').fill('Ovesné vločky')
  await page.getByLabel('Kolik toho přidáváš?').fill('750')
  await page.getByLabel('Jednotka').selectOption('g')
  const estimateCheckbox = page.getByRole('checkbox', { name: 'Množství je jen odhad' })
  await estimateCheckbox.check()
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  let productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma ≈750 g')
  await expect(productCard).toContainText('≈ znamená')

  await page.reload()
  productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma ≈750 g')

  await productCard.getByRole('button', { name: 'Srovnat stav Ovesné vločky' }).click()
  const correctionDialog = page.getByRole('dialog', { name: 'Srovnat skutečný stav' })
  await expect(correctionDialog).toContainText('Teď evidujeme ≈750 g')
  const correctionEstimate = correctionDialog.getByRole('checkbox', { name: 'Množství je jen odhad' })
  await expect(correctionEstimate).toBeChecked()
  await correctionEstimate.uncheck()
  await correctionDialog.getByRole('button', { name: 'Srovnat', exact: true }).click()
  await expect(correctionDialog).not.toBeVisible()

  productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma 750 g')
  await expect(productCard).not.toContainText('Doma ≈750 g')

  await page.getByRole('link', { name: 'Více', exact: true }).click()
  await page.getByRole('link', { name: /Historie změn/ }).click()
  await expect(page).toHaveURL(/\/history$/)

  const purchaseEvent = page.getByRole('article', { name: 'Nákup · Ovesné vločky' })
  await expect(purchaseEvent).toContainText('+≈750 g')

  const correctionEvent = page.getByRole('article', { name: 'Oprava stavu · Ovesné vločky' })
  await expect(correctionEvent).toContainText('přesnost: odhad → přesně')
  await expect(correctionEvent).not.toContainText('0 g')
})
