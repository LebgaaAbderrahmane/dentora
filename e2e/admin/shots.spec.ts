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
  test.use({ viewport: { width: 1440, height: 900 }, navigationTimeout: 60_000 })

  test('login screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('Email')).toBeVisible()
    await shot(page, 'admin', 'login-1440')
  })

  // App chrome is sticky — fullPage stitches would duplicate it, so every
  // admin capture is a plain viewport.
  test('dashboard light + main views', async ({ page }) => {
    await login(page)
    await shot(page, 'admin', 'dashboard-light-1440')

    const views: Array<[RegExp, string]> = [
      [/^Rendez-vous$/, 'appointments-1440'],
      [/Liste d.attente/, 'waitlist-1440'],
      [/^Patients$/, 'patients-1440'],
      [/^Catalogue$/, 'catalog-1440'],
      [/^Factures$/, 'invoices-1440'],
    ]
    for (const [name, file] of views) {
      await page.getByRole('button', { name }).first().click()
      await expect(page.locator('main')).toBeVisible()
      await page.waitForTimeout(600) // let the view's data fetch settle
      await shot(page, 'admin', file)
    }
  })

  test('dashboard dark mode', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dentora-theme', 'dark'))
    await login(page)
    await shot(page, 'admin', 'dashboard-dark-1440')
  })
})
