import { test, expect } from '@playwright/test'
import { shot } from '../lib/shot'

const ADMIN = { email: 'admin@dentora.dz', password: 'change-me-strong' }

async function login(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Mot de passe').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible({
    timeout: 10_000,
  })
}

test.describe('Admin screenshots @shot', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test('login screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('Email')).toBeVisible()
    await shot(page, 'admin', 'login-1920')
  })

  // App chrome is sticky — fullPage stitches would duplicate it, so every
  // admin capture is a plain 1920x1080 viewport.
  test('dashboard light + main views', async ({ page }) => {
    await login(page)
    await shot(page, 'admin', 'dashboard-light-1920')

    const views: Array<[RegExp, string]> = [
      [/^Rendez-vous$/, 'appointments-1920'],
      [/Liste d.attente/, 'waitlist-1920'],
      [/^Patients$/, 'patients-1920'],
      [/^Catalogue$/, 'catalog-1920'],
      [/^Factures$/, 'invoices-1920'],
    ]
    for (const [name, file] of views) {
      await page.getByRole('button', { name }).first().click()
      await expect(page.locator('main')).toBeVisible()
      await page.waitForTimeout(600) // let the view's data fetch settle
      await shot(page, 'admin', file)
    }
  })

  test('dashboard dark mode', async ({ page }) => {
    // ThemeProvider reads dentora-theme before first paint (falls back to
    // prefers-color-scheme) — set it via init script for a deterministic dark run.
    await page.addInitScript(() => localStorage.setItem('dentora-theme', 'dark'))
    await login(page)
    await shot(page, 'admin', 'dashboard-dark-1920')
  })
})
