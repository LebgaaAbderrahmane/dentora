import { test, expect } from '@playwright/test'
import { shot } from '../lib/shot'

const PATIENT = { email: 'm.bouzid@mail.dz', password: 'demo-pass-123' }

// The activation view needs a live token: create a fresh web booking over the
// API (portal's dev server proxies /api to the backend, same as web does).
async function bookWithToken(request: import('@playwright/test').APIRequestContext) {
  const suffix = Date.now().toString(36)
  const res = await request.post('/api/public/bookings', {
    data: {
      firstName: 'Shot',
      lastName: `Runner${suffix}`,
      phone: `+21356${Date.now().toString().slice(-8)}`,
      email: `shots.${suffix}@dentora.test`,
    },
  })
  if (!res.ok()) {
    throw new Error(
      `booking for activation token failed (${res.status()}) — if reusing a dev ` +
        `API without raised caps, restart it with PUBLIC_RATE_MAX/LOGIN_RATE_MAX high`,
    )
  }
  const body = (await res.json()) as { activationToken?: string }
  if (!body.activationToken) throw new Error('no activationToken in booking response')
  return body.activationToken
}

test.describe('Portal screenshots @shot', () => {
  test.describe('desktop 1440x900', () => {
    test.use({ viewport: { width: 1440, height: 900 }, navigationTimeout: 60_000 })

    test('login screen', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible({
        timeout: 10_000,
      })
      await shot(page, 'portal', 'login-1440')
    })

    test('activation view (from fresh booking token)', async ({ request, page }) => {
      const token = await bookWithToken(request)
      await page.goto(`/?token=${encodeURIComponent(token)}`)
      await expect(page.getByLabel(/mot de passe|password/i).first()).toBeVisible({
        timeout: 10_000,
      })
      await shot(page, 'portal', 'activation-1440')
    })

    test('home + book views (demo patient)', async ({ page }) => {
      await page.goto('/')
      await page.getByLabel('Email').fill(PATIENT.email)
      await page.getByLabel('Mot de passe').fill(PATIENT.password)
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await expect(page.getByText('Bonjour')).toBeVisible({ timeout: 10_000 })
      await shot(page, 'portal', 'home-1440')

      await page.getByRole('button', { name: /prendre rendez-vous/i }).click()
      await expect(page.getByText(/rendez-vous|créneau/i).first()).toBeVisible()
      await shot(page, 'portal', 'book-1440')
    })
  })

  test.describe('mobile 390x844', () => {
    test.use({ viewport: { width: 390, height: 844 }, navigationTimeout: 60_000 })

    test('home view', async ({ page }) => {
      await page.goto('/')
      await page.getByLabel('Email').fill(PATIENT.email)
      await page.getByLabel('Mot de passe').fill(PATIENT.password)
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await expect(page.getByText('Bonjour')).toBeVisible({ timeout: 10_000 })
      await shot(page, 'portal', 'home-390')
    })
  })
})
