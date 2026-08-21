import { test, expect } from '@playwright/test'

test.describe('Language switching (web)', () => {
  test('switches between fr, en, and ar', async ({ page }) => {
    // Clear language preference
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('dentora-lng'))
    await page.reload()

    // Open language switcher
    await page.getByRole('button', { name: 'Change language' }).click()

    // Switch to French
    await page.getByRole('button', { name: 'Français' }).click()
    // French CTA should appear
    await expect(page.getByRole('button', { name: /prendre rendez-vous/i }).first()).toBeVisible()

    // Switch to English
    await page.getByRole('button', { name: 'Change language' }).click()
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByRole('button', { name: /book appointment/i }).first()).toBeVisible()
  })

  test('Arabic renders RTL', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('dentora-lng'))
    await page.reload()

    await page.getByRole('button', { name: 'Change language' }).click()
    await page.getByRole('button', { name: 'العربية' }).click()

    // html dir attribute should be "rtl"
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})
