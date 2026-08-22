import { test, expect } from '@playwright/test'

const CTA = /prendre rendez-vous|book appointment|book free consultation/i

// Unique per run: the create test needs a phone the server has never seen (a
// leftover would 409). Rows accumulate until the next `db:seed:demo` reset.
const PHONE = `+21355${Date.now().toString().slice(-8)}`

test.describe('Booking modal (web)', () => {
  test('opens from hero CTA, fills form, submits successfully', async ({ page }) => {
    await page.goto('/')
    // Hero CTA
    await page.locator('section').first().getByRole('button', { name: CTA }).click()

    // Modal overlay — the form has a unique placeholder "Amine H."
    const nameInput = page.getByPlaceholder('Amine H.')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })

    await nameInput.fill('E2E Playwright')
    await page.getByPlaceholder('+213 5 55 00 00 00').fill(PHONE)
    await page.locator('select').selectOption({ index: 1 })
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 7)
    await page.locator('input[type="date"]').fill(tomorrow.toISOString().split('T')[0])

    // Submit
    await page.getByRole('button', { name: /confirmer|confirm booking/i }).click()

    // Success view
    await expect(page.getByText(/thank you|merci/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('WhatsApp')).toBeVisible()
  })

  test('duplicate phone shows "already" view', async ({ page }) => {
    await page.goto('/')
    await page.locator('section').first().getByRole('button', { name: CTA }).click()

    const nameInput = page.getByPlaceholder('Amine H.')
    await expect(nameInput).toBeVisible({ timeout: 10_000 })

    await nameInput.fill('E2E Dup')
    await page.getByPlaceholder('+213 5 55 00 00 00').fill(PHONE)
    await page.locator('select').selectOption({ index: 1 })
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 7)
    await page.locator('input[type="date"]').fill(tomorrow.toISOString().split('T')[0])

    await page.getByRole('button', { name: /confirmer|confirm booking/i }).click()

    // "Already" view — duplicate 409
    await expect(page.getByText(/already been in touch|déjà contacté/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('close button dismisses modal', async ({ page }) => {
    await page.goto('/')
    await page.locator('section').first().getByRole('button', { name: CTA }).click()

    await expect(page.getByPlaceholder('Amine H.')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /fermer|close/i }).click()
    await expect(page.getByPlaceholder('Amine H.')).not.toBeVisible({ timeout: 5_000 })
  })
})
