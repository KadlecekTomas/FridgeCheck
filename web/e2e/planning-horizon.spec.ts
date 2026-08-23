import { expect, test } from '@playwright/test'

test('shopping plan persists daily consumption and changes recommendation with horizon', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `planning-${suffix}@example.com`
  const password = 'FridgeCheck-planning-123!'

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByLabel('Název domácnosti').fill('Plánovací domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)

  await page.getByLabel('Název').fill('Plánovací vejce')
  await page.getByLabel('Kolik toho přidáváš?').fill('12')
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  const productCard = page.getByRole('article').filter({ hasText: 'Plánovací vejce' })
  await productCard.getByRole('button', { name: 'Hlídání zásoby' }).click()
  await productCard.getByLabel('Upozorni, když mám méně než').fill('4')
  await productCard.getByLabel('Chci mít doma').fill('10')
  await productCard.getByRole('button', { name: 'Uložit' }).click()
  await expect(productCard).toContainText('Dochází pod 4 ks · chci mít 10 ks')

  await page.getByRole('link', { name: 'Nákup', exact: true }).click()
  await expect(page).toHaveURL(/\/shopping$/)
  await expect(page.getByRole('heading', { name: 'Plán nákupu' })).toBeVisible()

  const dailyConsumption = page.getByRole('spinbutton', { name: 'Denní spotřeba Plánovací vejce' })
  await expect(dailyConsumption).toHaveValue('0')
  await dailyConsumption.fill('2')
  await page.getByRole('form', { name: 'Denní spotřeba Plánovací vejce' }).getByRole('button', { name: 'Uložit' }).click()

  await expect(page.getByRole('button', { name: '7 dní' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Přidat Plánovací vejce: 12 ks' })).toBeEnabled()
  await expect(page.getByText('Bez nákupu by už během období chybělo 2 ks.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('spinbutton', { name: 'Denní spotřeba Plánovací vejce' })).toHaveValue('2')
  await expect(page.getByRole('button', { name: 'Přidat Plánovací vejce: 12 ks' })).toBeEnabled()

  await page.getByRole('button', { name: '3 dny' }).click()
  await expect(page.getByRole('button', { name: '3 dny' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Přidat Plánovací vejce: 4 ks' })).toBeEnabled()
  await expect(page.getByText('za 3 dny bez nákupu 6 ks')).toBeVisible()

  await page.getByRole('button', { name: 'Přidat Plánovací vejce: 4 ks' }).click()
  await expect(page.getByRole('button', { name: 'Plánovací vejce už je na seznamu' })).toBeDisabled()

  const shoppingItem = page.getByRole('group', { name: 'Nákupní položka Plánovací vejce' })
  await expect(shoppingItem).toContainText('4 ks')
})
