import { expect, test } from '@playwright/test'

test('production exposes an installable HlídačJídla manifest and icons', async ({ page }) => {
  const manifestResponse = await page.request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBeTruthy()
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json')

  const manifest = (await manifestResponse.json()) as {
    name?: string
    short_name?: string
    start_url?: string
    scope?: string
    display?: string
    background_color?: string
    theme_color?: string
    icons?: Array<{ src?: string; sizes?: string; type?: string }>
  }

  expect(manifest).toMatchObject({
    name: 'HlídačJídla',
    short_name: 'HlídačJídla',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F5EF',
    theme_color: '#174D3A',
  })
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }),
    ])
  )

  for (const iconPath of [
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png',
  ]) {
    const iconResponse = await page.request.get(iconPath)
    expect(iconResponse.ok()).toBeTruthy()
    expect(iconResponse.headers()['content-type']).toContain('image/png')
  }

  await page.goto('/login')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#174D3A')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    /\/icons\/apple-touch-icon\.png/
  )
})
