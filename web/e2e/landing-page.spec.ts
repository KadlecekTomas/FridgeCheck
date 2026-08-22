import { expect, test } from '@playwright/test'

const auditedViewports = [
  { name: '320', width: 320, height: 740, mode: 'mobile' as const },
  { name: '390', width: 390, height: 844, mode: 'mobile' as const },
  { name: '430', width: 430, height: 932, mode: 'mobile' as const },
  { name: '768', width: 768, height: 1024, mode: 'desktop' as const },
  { name: '1024', width: 1024, height: 900, mode: 'desktop' as const },
  { name: '1440', width: 1440, height: 1000, mode: 'desktop' as const },
]

test.describe('marketing landing page', () => {
  test('presents a working product demo on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/')

    const demo = page.getByTestId('interactive-product-demo')

    await expect(page.getByRole('heading', { level: 1, name: /Mějte doma pořádek v jídle/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Vyzkoušet HlídačJídla' }).first()).toBeVisible()
    await expect(demo).toBeVisible()
    await expect(demo.getByTestId('demo-overview')).toBeVisible()

    await demo.getByRole('button', { name: 'Zásoby' }).click()
    const inventory = demo.getByTestId('demo-inventory')
    await expect(inventory).toBeVisible()

    const eggs = inventory.getByText('Vejce', { exact: true }).locator('..').locator('..')
    await expect(eggs.getByText('6 ks', { exact: true })).toBeVisible()
    await eggs.getByRole('button', { name: 'Spotřebovat' }).click()
    await expect(eggs.getByText('5 ks', { exact: true })).toBeVisible()

    await demo.getByRole('button', { name: 'Nákup' }).click()
    const shopping = demo.getByTestId('demo-shopping')
    await expect(shopping).toBeVisible()
    const eggsShopping = shopping.getByText('Vejce', { exact: true }).locator('..').locator('..')
    await expect(eggsShopping.getByText(/Doma 5 ks/)).toBeVisible()
    await eggsShopping.getByRole('button', { name: /Koupeno \+5 ks/ }).click()
    await expect(shopping.getByText('Vejce', { exact: true })).toHaveCount(0)

    await demo.getByRole('button', { name: 'Přidat' }).click()
    const addPanel = demo.getByTestId('demo-add-panel')
    await expect(addPanel).toBeVisible()
    await addPanel.getByRole('button', { name: /Banány/ }).click()
    await expect(demo.getByTestId('demo-inventory').getByText('Banány', { exact: true })).toBeVisible()
    await expect(demo.getByTestId('demo-inventory').getByText('6 ks', { exact: true })).toBeVisible()

    await expect(page.getByText('Naskenuj. Ulož. Hotovo.')).toBeVisible()
    await expect(page.getByText('Nakupujte rozdíl. Ne pocit.')).toBeVisible()
    await expect(page.getByText('Jedno místo pro zásoby celé domácnosti.')).toBeVisible()

    const pageWidth = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth)
  })

  test('keeps the same demo usable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const demo = page.getByTestId('interactive-product-demo')

    await expect(page.getByRole('heading', { level: 1, name: /Mějte doma pořádek v jídle/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Vyzkoušet HlídačJídla' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Prohlédnout produkt' })).toBeVisible()
    await expect(demo).toBeVisible()
    await expect(demo.getByText('Interaktivní ukázka', { exact: true })).toBeVisible()
    await expect(demo.getByText('Co potřebuje pozornost?', { exact: true })).toBeVisible()

    await demo.getByRole('button', { name: 'Zásoby' }).click()
    await expect(demo.getByTestId('demo-inventory')).toBeVisible()
    await expect(demo.getByText('Vejce', { exact: true })).toBeVisible()

    await demo.getByRole('button', { name: 'Nákup' }).click()
    await expect(demo.getByTestId('demo-shopping')).toBeVisible()
    await expect(demo.getByText('Ovesné vločky', { exact: true })).toBeVisible()

    await demo.getByRole('button', { name: 'Historie' }).click()
    await expect(demo.getByTestId('demo-history')).toBeVisible()

    const pageWidth = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth)
  })

  for (const viewport of auditedViewports) {
    test(`renders cleanly at ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')

      const demo = page.getByTestId('interactive-product-demo')
      const mobileDemoNav = demo.getByRole('navigation', { name: 'Mobilní ukázka aplikace', exact: true })
      const desktopDemoNav = demo.getByRole('navigation', { name: 'Ukázka aplikace', exact: true })

      await expect(page.getByRole('heading', { level: 1, name: /Mějte doma pořádek v jídle/i })).toBeVisible()
      await expect(demo).toBeVisible()

      if (viewport.mode === 'mobile') {
        await expect(mobileDemoNav).toBeVisible()
        await expect(desktopDemoNav).toBeHidden()
      } else {
        await expect(desktopDemoNav).toBeVisible()
        await expect(mobileDemoNav).toBeHidden()
      }

      const pageWidth = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth)

      await page.screenshot({ path: `test-results/landing-page-${viewport.name}.png`, fullPage: true })
    })
  }
})
