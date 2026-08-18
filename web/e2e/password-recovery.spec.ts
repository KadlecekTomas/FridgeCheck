import { expect, test, type APIRequestContext } from '@playwright/test'

const MAILPIT_URL = 'http://127.0.0.1:54324'

function extractRecoveryLink(message: string) {
  const match = message.match(/https?:\/\/[^\s<>"']*\/auth\/v1\/verify\?[^\s<>"']+/)
  if (!match) return null
  return match[0].replace(/&amp;/g, '&')
}

async function waitForRecoveryLink(request: APIRequestContext) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await request.get(`${MAILPIT_URL}/view/latest.txt`)
    if (response.ok()) {
      const link = extractRecoveryLink(await response.text())
      if (link?.includes('type=recovery')) return link
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Password recovery email did not arrive in local Mailpit')
}

test('user can recover a forgotten password through the real Supabase email flow', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `recovery-${suffix}@example.com`
  const oldPassword = 'FridgeCheck-old-123!'
  const newPassword = 'FridgeCheck-new-456!'

  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(oldPassword)
  await page.getByLabel('Heslo znovu').fill(oldPassword)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/more')
  await page.getByRole('button', { name: 'Odhlásit se' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByRole('link', { name: 'Zapomenuté heslo?' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('button', { name: 'Poslat odkaz pro obnovu' }).click()

  await expect(page.getByRole('status')).toContainText('Zkontroluj e-mail')
  await expect(page.getByRole('status')).toContainText('Pokud k adrese účet existuje')

  const recoveryLink = await waitForRecoveryLink(page.request)
  await page.goto(recoveryLink)
  await expect(page).toHaveURL(/\/update-password$/)
  await expect(page.getByRole('heading', { name: 'Nastavit nové heslo' })).toBeVisible()

  await page.getByLabel('Nové heslo', { exact: true }).fill(newPassword)
  await page.getByLabel('Nové heslo znovu').fill(newPassword)
  await page.getByRole('button', { name: 'Uložit nové heslo' }).click()

  await expect(page.getByRole('heading', { name: 'Heslo je změněné' })).toBeVisible()
  await page.getByRole('link', { name: 'Přejít na přihlášení' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(oldPassword)
  await page.getByRole('button', { name: 'Přihlásit se' }).click()
  await expect(page.getByText('Přihlášení se nepodařilo.', { exact: false })).toBeVisible()

  await page.getByLabel('Heslo', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Přihlásit se' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})
