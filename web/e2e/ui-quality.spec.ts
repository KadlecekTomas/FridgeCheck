import { expect, test, type Page } from '@playwright/test'

const auditedViewports = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
] as const

const publicRoutes = [
  { path: '/', slug: 'home' },
  { path: '/login', slug: 'login' },
  { path: '/register', slug: 'register' },
  { path: '/forgot-password', slug: 'forgot-password' },
  { path: '/update-password', slug: 'update-password' },
] as const

const appRoutes = [
  { path: '/dashboard', slug: 'dashboard' },
  { path: '/inventory', slug: 'inventory' },
  { path: '/inventory/new', slug: 'inventory-new' },
  { path: '/shopping', slug: 'shopping' },
  { path: '/history', slug: 'history' },
  { path: '/more', slug: 'more' },
  { path: '/more/storage', slug: 'storage' },
] as const

async function waitForStableFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

async function assertVisualHealth(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const rootOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth
    const selectors = [
      'header a', 'header button', 'main h1', 'main h2', 'main h3', 'main button', 'main a',
      'main input', 'main select', 'main textarea', 'nav a', 'nav button', '[role="dialog"]', '[role="alert"]',
    ].join(',')
    const visibleElements = Array.from(document.querySelectorAll<HTMLElement>(selectors)).filter((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    })
    const outsideViewport = visibleElements.flatMap((element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      if (style.position === 'absolute' && element.getAttribute('aria-hidden') === 'true') return []
      if (rect.left >= -1 && rect.right <= viewportWidth + 1) return []
      return [{ tag: element.tagName.toLowerCase(), text: (element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right), viewportWidth }]
    })
    const clippedControls = visibleElements.flatMap((element) => {
      if (!['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) return []
      const style = getComputedStyle(element)
      if (style.overflowX === 'hidden' || style.textOverflow === 'ellipsis' || element.scrollWidth <= element.clientWidth + 1) return []
      return [{ tag: element.tagName.toLowerCase(), text: (element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 80), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }]
    })
    const czechDiacritics = /[áčďéěíňóřšťúůýž]/i
    const typographyCollisions = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3')).flatMap((heading) => {
      const text = heading.innerText.trim()
      if (!czechDiacritics.test(text)) return []
      const style = getComputedStyle(heading)
      const fontSize = Number.parseFloat(style.fontSize)
      const lineHeight = style.lineHeight === 'normal' ? fontSize * 1.2 : Number.parseFloat(style.lineHeight)
      const letterSpacing = style.letterSpacing === 'normal' ? 0 : Number.parseFloat(style.letterSpacing)
      const rect = heading.getBoundingClientRect()
      const isLarge = fontSize >= 32
      const isMultiline = rect.height > lineHeight * 1.35
      const lineHeightRatio = lineHeight / fontSize
      const trackingRatio = letterSpacing / fontSize
      if (!isLarge || !isMultiline || (lineHeightRatio >= 1.02 && trackingRatio >= -0.05)) return []
      return [{ text: text.slice(0, 100), fontSize: Math.round(fontSize * 100) / 100, lineHeightRatio: Math.round(lineHeightRatio * 1000) / 1000, trackingRatio: Math.round(trackingRatio * 1000) / 1000 }]
    })
    const undersizedPhoneButtons = viewportWidth <= 430
      ? Array.from(document.querySelectorAll<HTMLButtonElement>('main button, nav button')).flatMap((button) => {
          const style = getComputedStyle(button)
          const rect = button.getBoundingClientRect()
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return []
          if (button.closest('[data-testid="interactive-product-demo"]')) return []
          if (rect.height >= 32 && rect.width >= 32) return []
          return [{ text: (button.innerText || button.getAttribute('aria-label') || '').trim().slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height) }]
        })
      : []
    return { rootOverflow, outsideViewport, clippedControls, typographyCollisions, undersizedPhoneButtons }
  })

  expect(result.rootOverflow, `${label}: page horizontally overflows`).toBeLessThanOrEqual(1)
  expect(result.outsideViewport, `${label}: critical elements leave the viewport`).toEqual([])
  expect(result.clippedControls, `${label}: controls clip their content`).toEqual([])
  expect(result.typographyCollisions, `${label}: Czech display typography is too tight`).toEqual([])
  expect(result.undersizedPhoneButtons, `${label}: phone controls are too small`).toEqual([])
}

async function captureAudit(page: Page, slug: string, width: number) {
  await waitForStableFonts(page)
  await assertVisualHealth(page, `${slug}@${width}`)
  await page.screenshot({ path: `test-results/ui-audit-${slug}-${width}.png`, fullPage: true })
}

async function registerAndSeedHousehold(page: Page) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `ui-audit-${suffix}@example.com`
  const password = 'FridgeCheck-e2e-123!'
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo', { exact: true }).fill(password)
  await page.getByLabel('Heslo znovu').fill(password)
  await page.getByRole('button', { name: 'Vytvořit účet' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByLabel('Název domácnosti').fill('Audit domácnost')
  await page.getByRole('button', { name: 'Vytvořit domácnost' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const expiry = [tomorrow.getFullYear(), String(tomorrow.getMonth() + 1).padStart(2, '0'), String(tomorrow.getDate()).padStart(2, '0')].join('-')
  await page.getByLabel('Název').fill('Vejce')
  await page.getByLabel('Kolik toho přidáváš?').fill('6')
  await page.getByLabel('Datum na obalu').selectOption('use_by')
  await page.getByLabel('Datum', { exact: true }).fill(expiry)
  await page.getByRole('button', { name: 'Přidat do zásob' }).click()
  await expect(page).toHaveURL(/\/inventory$/)
  const eggs = page.getByRole('article').filter({ hasText: 'Vejce' })
  await eggs.getByRole('button', { name: 'Hlídání zásoby' }).click()
  await eggs.getByLabel('Upozorni, když mám méně než').fill('7')
  await eggs.getByLabel('Chci mít doma').fill('12')
  await eggs.getByRole('button', { name: 'Uložit' }).click()
  await expect(eggs).toContainText('chci mít 12 ks')
}

test.describe('full UI quality audit', () => {
  test('public surfaces stay readable across the supported viewport matrix', async ({ page }) => {
    for (const viewport of auditedViewports) {
      await page.setViewportSize(viewport)
      for (const route of publicRoutes) {
        await page.goto(route.path)
        await captureAudit(page, `public-${route.slug}`, viewport.width)
      }
    }
  })

  test('authenticated product surfaces stay readable across the supported viewport matrix', async ({ page }) => {
    await registerAndSeedHousehold(page)
    for (const viewport of auditedViewports) {
      await page.setViewportSize(viewport)
      for (const route of appRoutes) {
        await page.goto(route.path)
        await expect(page.locator('main')).toBeVisible()
        await captureAudit(page, `app-${route.slug}`, viewport.width)
      }
    }
  })

  test('critical dialogs remain usable on phone and desktop', async ({ page }) => {
    await registerAndSeedHousehold(page)
    for (const viewport of [auditedViewports[1], auditedViewports[5]]) {
      await page.setViewportSize(viewport)
      await page.goto('/inventory')
      const eggs = page.getByRole('article').filter({ hasText: 'Vejce' })
      await eggs.getByRole('button', { name: 'Spotřebovat Vejce' }).click()
      const consumeDialog = page.getByRole('dialog', { name: 'Kolik jsi spotřeboval?' })
      await expect(consumeDialog).toBeVisible()
      await captureAudit(page, 'dialog-consume', viewport.width)
      await consumeDialog.getByRole('button', { name: 'Zrušit' }).click()
      await eggs.getByRole('button', { name: 'Srovnat stav Vejce' }).first().click()
      const correctionDialog = page.getByRole('dialog', { name: 'Srovnat skutečný stav' })
      await expect(correctionDialog).toBeVisible()
      await captureAudit(page, 'dialog-correction', viewport.width)
      await correctionDialog.getByRole('button', { name: 'Zrušit' }).click()
      await page.goto('/shopping')

      const addEggs = page.getByRole('button', { name: 'Přidat Vejce: 6 ks' })
      await expect(addEggs).toBeEnabled()
      await addEggs.click()

      const shoppingItem = page.getByRole('group', { name: 'Nákupní položka Vejce' })
      await shoppingItem.getByRole('button', { name: 'Upravit Vejce' }).click()
      const shoppingDialog = page.getByRole('dialog', { name: 'Upravit položku' })
      await expect(shoppingDialog).toBeVisible()
      await captureAudit(page, 'dialog-shopping-edit', viewport.width)
      await shoppingDialog.getByRole('button', { name: 'Zrušit' }).click()

      await shoppingItem.getByRole('button', { name: 'Smazat Vejce' }).click()
      await expect(page.getByRole('group', { name: 'Nákupní položka Vejce' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Přidat Vejce: 6 ks' })).toBeEnabled()
    }
  })
})
