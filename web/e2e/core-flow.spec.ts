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

test('user can manage storage, consume by FEFO, correct stock, discard and inspect history', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `e2e-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'
  const yesterdayDate = dateFromToday(-1)
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

  await page.getByRole('link', { name: 'Více', exact: true }).click()
  await expect(page).toHaveURL(/\/more$/)
  await page.getByRole('link', { name: /Úložná místa/ }).click()
  await expect(page).toHaveURL(/\/more\/storage$/)
  await expect(page.getByRole('heading', { name: 'Úložná místa' })).toBeVisible()

  await page.getByLabel('Název').fill('Spíž')
  await page.getByLabel('Typ').selectOption('pantry')
  await page.getByRole('button', { name: 'Přidat', exact: true }).click()

  let storageCard = page.getByRole('article').filter({ hasText: 'Spíž' })
  await expect(storageCard).toContainText('Zatím nepoužité')
  await storageCard.getByRole('button', { name: 'Přejmenovat Spíž' }).click()
  await storageCard.getByLabel('Nový název Spíž').fill('Suchá spíž')
  await storageCard.getByRole('button', { name: 'Uložit' }).click()
  storageCard = page.getByRole('article').filter({ hasText: 'Suchá spíž' })
  await expect(storageCard).toBeVisible()

  await page.getByRole('link', { name: 'Domů', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await page.getByLabel('Název').fill('Vejce')
  await page.getByLabel('Kolik toho přidáváš?').fill('5')
  await page.getByLabel('Datum na obalu').selectOption('use_by')
  await page.getByLabel('Datum').fill(tomorrowDate)
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  let productCard = page.getByRole('article').filter({ hasText: 'Vejce' })
  await expect(productCard).toContainText('Doma 5 ks')
  await expect(productCard).toContainText('zítra')

  await page.getByRole('link', { name: 'Přidat jídlo' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await page.getByRole('button', { name: 'Už ho znám' }).click()
  await page.getByLabel('Co přidáváš?').selectOption({ label: 'Vejce' })
  await page.getByLabel('Kolik toho přidáváš?').fill('7')
  await page.getByLabel('Datum na obalu').selectOption('use_by')
  await page.getByLabel('Datum').fill(laterDate)
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  productCard = page.getByRole('article').filter({ hasText: 'Vejce' })
  await expect(productCard).toContainText('Doma 12 ks')
  await expect(productCard).toContainText('zítra')
  await expect(productCard).toContainText('za 3 dny')

  await productCard.getByRole('button', { name: 'Hlídání zásoby' }).click()
  await productCard.getByLabel('Upozorni, když mám méně než').fill('12')
  await productCard.getByLabel('Chci mít doma').fill('20')
  await productCard.getByRole('button', { name: 'Uložit' }).click()
  await expect(productCard).toContainText('Dochází pod 12 ks · chci mít 20 ks')

  await page.getByRole('link', { name: 'Domů', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Sněz nejdřív' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Spotřebovat Vejce' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Spotřebovat Vejce' }).click()

  const consumeDialog = page.getByRole('dialog', { name: 'Kolik jsi spotřeboval?' })
  await expect(consumeDialog).toContainText('Doma')
  await expect(consumeDialog).toContainText('12 ks')
  await consumeDialog.getByLabel('Množství ke spotřebě', { exact: true }).fill('7')
  await consumeDialog.getByRole('button', { name: 'Potvrdit' }).click()
  await expect(consumeDialog).not.toBeVisible()

  await page.getByRole('link', { name: 'Zásoby', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory$/)
  productCard = page.getByRole('article').filter({ hasText: 'Vejce' })
  await expect(productCard).toContainText('Doma 5 ks')
  await expect(productCard).not.toContainText('zítra')
  await expect(productCard).toContainText('za 3 dny')

  await productCard.getByRole('button', { name: 'Srovnat stav Vejce' }).click()
  const correctionDialog = page.getByRole('dialog', { name: 'Srovnat skutečný stav' })
  await expect(correctionDialog).toContainText('Teď evidujeme 5 ks')
  await correctionDialog.getByLabel('Skutečné množství').fill('6')
  await correctionDialog.getByLabel('Proč stav opravuješ?').fill('přepočítáno doma')
  await correctionDialog.getByRole('button', { name: 'Srovnat', exact: true }).click()
  await expect(correctionDialog).not.toBeVisible()
  await expect(productCard).toContainText('Doma 6 ks')

  await page.getByRole('link', { name: 'Nákup', exact: true }).click()
  await expect(page).toHaveURL(/\/shopping$/)
  await expect(page.getByText('Doma 6 ks · chci 20 ks')).toBeVisible()
  await page.getByRole('button', { name: 'Přidat Vejce: 14 ks' }).click()
  await expect(page.getByRole('button', { name: 'Vejce už je na seznamu' })).toBeDisabled()

  let shoppingItem = page.getByRole('group', { name: 'Nákupní položka Vejce' })
  await expect(shoppingItem).toContainText('14 ks')
  await shoppingItem.getByRole('button', { name: 'Upravit Vejce' }).click()

  let shoppingEditor = page.getByRole('dialog', { name: 'Upravit položku' })
  await expect(shoppingEditor).toContainText('Stav doma ani tvoje nastavení tím nezměníš.')
  await expect(shoppingEditor.getByLabel('Název')).toHaveCount(0)
  await expect(shoppingEditor.getByText('Vejce', { exact: true })).toBeVisible()
  await expect(shoppingEditor.getByLabel('Množství k nákupu')).toBeFocused()
  await shoppingEditor.getByLabel('Množství k nákupu').fill('10')
  await shoppingEditor.getByRole('button', { name: 'Uložit' }).click()
  await expect(shoppingEditor).not.toBeVisible()

  shoppingItem = page.getByRole('group', { name: 'Nákupní položka Vejce' })
  await expect(shoppingItem).toContainText('10 ks')
  await expect(page.getByText('Doma 6 ks · chci 20 ks')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Vejce už je na seznamu' })).toBeDisabled()

  await page.getByLabel('Přidat vlastní položku').fill('Pečivo')
  await page.getByRole('button', { name: 'Přidat', exact: true }).click()
  let manualItem = page.getByRole('group', { name: 'Nákupní položka Pečivo' })
  await expect(manualItem).toBeVisible()
  await manualItem.getByRole('button', { name: 'Upravit Pečivo' }).click()

  shoppingEditor = page.getByRole('dialog', { name: 'Upravit položku' })
  await shoppingEditor.getByLabel('Název').fill('Celozrnné pečivo')
  await shoppingEditor.getByRole('button', { name: 'Uložit' }).click()
  await expect(shoppingEditor).not.toBeVisible()

  manualItem = page.getByRole('group', { name: 'Nákupní položka Celozrnné pečivo' })
  await expect(manualItem).toBeVisible()
  await manualItem.getByRole('button', { name: 'Smazat Celozrnné pečivo' }).click()
  await expect(page.getByRole('group', { name: 'Nákupní položka Celozrnné pečivo' })).toHaveCount(0)

  await shoppingItem.getByRole('button', { name: 'Smazat Vejce' }).click()
  await expect(page.getByRole('group', { name: 'Nákupní položka Vejce' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Přidat Vejce: 14 ks' })).toBeEnabled()

  await page.getByRole('link', { name: 'Přidat', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await page.getByLabel('Název').fill('Skyr')
  await page.getByLabel('Kolik toho přidáváš?').fill('2')
  await page.getByLabel('Kam to dáváš?').selectOption({ label: 'Suchá spíž' })
  await page.getByLabel('Datum na obalu').selectOption('use_by')
  await page.getByLabel('Datum').fill(yesterdayDate)
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()

  await expect(page).toHaveURL(/\/inventory$/)
  const skyrCard = page.getByRole('article').filter({ hasText: 'Skyr' })
  await expect(skyrCard).toContainText('Suchá spíž')
  await expect(skyrCard).toContainText('Doma 0 ks')

  await page.getByRole('link', { name: 'Domů', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Skyr')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Spotřebovat Skyr' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Vyhodit Skyr' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Vyhodit Skyr' }).click()

  const discardDialog = page.getByRole('dialog', { name: 'Kolik vyhazuješ?' })
  await discardDialog.getByRole('button', { name: /Všechno · 2 ks/ }).click()
  await discardDialog.getByLabel('Důvod').fill('po expiraci')
  await discardDialog.getByRole('button', { name: 'Vyhodit', exact: true }).click()
  await expect(discardDialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Vyhodit Skyr' })).toHaveCount(0)

  await expect(page.getByText('Vejce').first()).toBeVisible()
  await expect(page.getByText('za 3 dny').first()).toBeVisible()

  await page.getByRole('link', { name: 'Více', exact: true }).click()
  await expect(page).toHaveURL(/\/more$/)
  await page.getByRole('link', { name: /Historie změn/ }).click()
  await expect(page).toHaveURL(/\/history$/)
  await expect(page.getByRole('heading', { name: 'Historie změn' })).toBeVisible()

  const correctionEvent = page.getByRole('article', { name: 'Oprava stavu · Vejce' })
  await expect(correctionEvent).toContainText('+1 ks')
  await expect(correctionEvent).toContainText('přepočítáno doma')

  const discardEvent = page.getByRole('article', { name: 'Vyhození · Skyr' })
  await expect(discardEvent).toContainText('−2 ks')
  await expect(discardEvent).toContainText('po expiraci')

  await expect(page.getByRole('article', { name: 'Spotřeba · Vejce' }).first()).toBeVisible()

  await page.getByRole('link', { name: 'Více', exact: true }).click()
  await page.getByRole('link', { name: /Úložná místa/ }).click()
  await expect(page).toHaveURL(/\/more\/storage$/)
  storageCard = page.getByRole('article').filter({ hasText: 'Suchá spíž' })
  await expect(storageCard).toContainText('Místo už je v historii zásob')
  await expect(storageCard.getByRole('button', { name: 'Smazat Suchá spíž' })).toBeDisabled()
  await expect(storageCard).toContainText('Můžeš ho přejmenovat, ale ne smazat')
})