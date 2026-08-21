import { test, expect } from '@playwright/test'

test.describe('Legal pages (web)', () => {
  test('footer links toggle privacy page and back', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const privacyBtn = page.getByRole('button', { name: /privacy|confidentialité/i })
    await expect(privacyBtn).toBeVisible({ timeout: 10_000 })
    await privacyBtn.click()

    // Legal page renders — back button is visible
    const backBtn = page.getByRole('button', { name: /back|retour/i })
    await expect(backBtn).toBeVisible({ timeout: 10_000 })

    // Back button returns to main page — nav should be visible
    await backBtn.click()
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('footer links toggle terms page and back', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const termsBtn = page.getByRole('button', { name: /terms|conditions/i })
    await expect(termsBtn).toBeVisible({ timeout: 10_000 })
    await termsBtn.click()

    const backBtn = page.getByRole('button', { name: /back|retour/i })
    await expect(backBtn).toBeVisible({ timeout: 10_000 })

    await backBtn.click()
    await expect(page.getByRole('navigation')).toBeVisible()
  })
})
