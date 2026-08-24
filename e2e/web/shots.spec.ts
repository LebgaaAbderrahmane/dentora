import { test, expect } from '@playwright/test'
import { shot } from '../lib/shot'

const CTA = /prendre rendez-vous|book appointment|book free consultation/i

// Unique per run so repeat runs never hit the duplicate-waitlist-entry 409.
const SUFFIX = Date.now().toString(36)
const PHONE = `+21355${Date.now().toString().slice(-8)}`

test.describe('Web screenshots @shot', () => {
  test.describe('desktop 1920x1080', () => {
    test.use({ viewport: { width: 1920, height: 1080 } })

    test('home hero + full page', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('section').first()).toBeVisible()
      await shot(page, 'web', 'home-hero-1920')
      // Marketing site is a static scroll — capture the whole page.
      await shot(page, 'web', 'home-full-1920', { fullPage: true })
    })

    test('home english', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('dentora-lng', 'en'))
      await page.goto('/')
      await expect(page.getByRole('button', { name: /book appointment/i }).first()).toBeVisible()
      await shot(page, 'web', 'home-en-full-1920', { fullPage: true })
    })

    test('home arabic (RTL)', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('dentora-lng', 'ar'))
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await shot(page, 'web', 'home-ar-full-1920', { fullPage: true })
    })

    test('booking modal open', async ({ page }) => {
      await page.goto('/')
      await page.locator('section').first().getByRole('button', { name: CTA }).click()
      await expect(page.getByPlaceholder('Amine H.')).toBeVisible({ timeout: 10_000 })
      await shot(page, 'web', 'booking-modal-1920')
    })

    test('booking success screen (UI submit)', async ({ page }) => {
      test.setTimeout(60_000)
      await page.goto('/')
      await page.locator('section').first().getByRole('button', { name: CTA }).click()
      await page.getByPlaceholder('Amine H.').fill('Shot Runner')
      await page.getByPlaceholder('+213 5 55 00 00 00').fill(PHONE)
      await page.getByPlaceholder('amine@example.com').fill(`shots.${SUFFIX}@dentora.test`)
      await page.locator('select').selectOption({ index: 1 })
      const date = new Date()
      date.setDate(date.getDate() + 7)
      await page.locator('input[type="date"]').fill(date.toISOString().split('T')[0])
      await page.getByRole('button', { name: /confirmer|confirm booking/i }).click()

      try {
        await expect(page.getByText(/merci|thank you/i)).toBeVisible({ timeout: 15_000 })
      } catch {
        // Public endpoint rate-caps are low when reusing an already-running dev
        // API (PUBLIC_RATE_MAX unset). Skip the shot instead of failing the run,
        // but record WHY so environmental failures stay diagnosable.
        const bodyText = (
          await page
            .locator('body')
            .innerText()
            .catch(() => '')
        ).slice(-300)
        test.info().annotations.push({
          type: 'warning',
          description: `success shot skipped — no confirmation text. Page tail: ${bodyText}`,
        })
        return
      }
      await shot(page, 'web', 'booking-success-1920')
    })

    test('legal privacy page', async ({ page }) => {
      await page.goto('/')
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      const privacyBtn = page.getByRole('button', { name: /privacy|confidentialité/i })
      await expect(privacyBtn).toBeVisible({ timeout: 10_000 })
      await privacyBtn.click()
      await expect(page.getByRole('button', { name: /back|retour/i })).toBeVisible({
        timeout: 10_000,
      })
      await shot(page, 'web', 'legal-privacy-1920')
    })
  })

  test.describe('mobile 390x844', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('home full page', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('section').first()).toBeVisible()
      await shot(page, 'web', 'home-full-390', { fullPage: true })
    })

    test('booking modal open', async ({ page }) => {
      await page.goto('/')
      await page.locator('section').first().getByRole('button', { name: CTA }).click()
      await expect(page.getByPlaceholder('Amine H.')).toBeVisible({ timeout: 10_000 })
      await shot(page, 'web', 'booking-modal-390')
    })
  })
})
