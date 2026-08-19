import { expect, test } from '@playwright/test'

test('approximate stock stays visibly approximate until the user confirms an exact value', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `approx-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByLabel('Název domácnosti').fill('Odhad domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await page.getByLabel('Název').fill('Ovesné vločky')
  await page.getByLabel('Množství').fill('500')
  await page.getByLabel('Jednotka').selectOption('g')
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  let productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma 500 g · 1 aktivní balení')

  await productCard.getByRole('button', { name: 'Nastavit cíl' }).click()
  await productCard.getByLabel('Dochází pod').fill('300')
  await productCard.getByLabel('Chci mít doma').fill('500')
  await productCard.getByRole('button', { name: 'Uložit' }).click()
  await expect(productCard).toContainText('Minimum 300 g · cíl 500 g')

  await productCard.getByRole('button', { name: 'Srovnat stav Ovesné vločky' }).click()
  let correctionDialog = page.getByRole('dialog', { name: 'Srovnat skutečný stav' })
  await expect(correctionDialog).toContainText('Rychlý odhad bez vážení')
  await expect(correctionDialog).toContainText('původního množství tohoto balení (500 g)')
  await correctionDialog.getByRole('button', { name: /Půlka/ }).click()
  await expect(correctionDialog).not.toBeVisible()

  productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma ~250 g · 1 aktivní balení')
  await expect(productCard).toContainText('~250 g')
  await expect(productCard).toContainText('odhad')

  await page.getByRole('link', { name: 'Domů', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Doma ~250 g · cíl 500 g')).toBeVisible()
  await expect(page.getByText('koupit ~250 g')).toBeVisible()

  await page.getByRole('link', { name: 'Nákup', exact: true }).click()
  await expect(page).toHaveURL(/\/shopping$/)
  await expect(page.getByText('Doma ~250 g / cíl 500 g')).toBeVisible()
  await page.getByRole('button', { name: '~250 g' }).click()

  let shoppingItem = page.getByRole('group', { name: 'Nákupní položka Ovesné vločky' })
  await expect(shoppingItem).toContainText('~250 g')
  await shoppingItem.getByRole('button', { name: 'Upravit Ovesné vločky' }).click()

  const shoppingEditor = page.getByRole('dialog', { name: 'Upravit položku' })
  await expect(shoppingEditor).toContainText('vzniklo z odhadované zásoby')
  await shoppingEditor.getByLabel('Množství k nákupu').fill('200')
  await shoppingEditor.getByRole('button', { name: 'Uložit' }).click()
  await expect(shoppingEditor).not.toBeVisible()

  shoppingItem = page.getByRole('group', { name: 'Nákupní položka Ovesné vločky' })
  await expect(shoppingItem).toContainText('200 g')
  await expect(shoppingItem).not.toContainText('~200 g')

  await page.getByRole('link', { name: 'Zásoby', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory$/)
  productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma ~250 g · 1 aktivní balení')

  await productCard.getByRole('button', { name: 'Srovnat stav Ovesné vločky' }).click()
  correctionDialog = page.getByRole('dialog', { name: 'Srovnat skutečný stav' })
  await expect(correctionDialog).toContainText('V aplikaci je ~250 g')
  await correctionDialog.getByLabel('Přesné množství').fill('220')
  await correctionDialog.getByLabel('Proč stav opravuješ?').fill('převáženo přesně')
  await correctionDialog.getByRole('button', { name: 'Potvrdit přesně' }).click()
  await expect(correctionDialog).not.toBeVisible()

  productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma 220 g · 1 aktivní balení')
  await expect(productCard).not.toContainText('odhad')
  await expect(productCard).not.toContainText('~220 g')

  await page.reload()
  productCard = page.getByRole('article').filter({ hasText: 'Ovesné vločky' })
  await expect(productCard).toContainText('Doma 220 g · 1 aktivní balení')
  await expect(productCard).not.toContainText('odhad')
})
