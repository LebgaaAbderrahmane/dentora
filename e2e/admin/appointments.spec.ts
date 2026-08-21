import { test, expect } from '@playwright/test'

const ADMIN = { email: 'admin@dentora.dz', password: 'change-me-strong' }

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Mot de passe').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible({
    timeout: 10_000,
  })
}

test.describe('Admin appointments', () => {
  test('calendar renders and navigates', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Rendez-vous', exact: true }).click()

    // FullCalendar renders
    await expect(page.locator('.fc')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Aujourd’hui' })).toBeVisible()

    // Navigate forward then back
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Précédent' }).click()
  })
})

test.describe('Admin invoices', () => {
  test('invoice list renders with search and status filter', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: 'Factures', exact: true }).click()

    // Search input (aria-label from i18n) + status filter options
    await expect(page.getByPlaceholder('Rechercher un patient ou un n°…')).toBeVisible({
      timeout: 10_000,
    })
    const statusFilter = page.locator('main').getByRole('combobox')
    await statusFilter.click()
    await expect(page.getByRole('option', { name: 'Payée', exact: true })).toBeVisible()
    await page.getByRole('option', { name: 'Tous les statuts' }).click()
  })
})
