import { test, expect } from '@playwright/test'

const ADMIN = { email: 'admin@dentora.dz', password: 'change-me-strong' }

async function login(
  page: import('@playwright/test').Page,
  email = ADMIN.email,
  password = ADMIN.password,
) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  // Wait for the dashboard heading (the nav button has the same text — use role)
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible({
    timeout: 10_000,
  })
}

test.describe('Admin login + dashboard', () => {
  test('logs in and shows dashboard KPIs', async ({ page }) => {
    await login(page)
    await expect(page.locator('main')).toBeVisible()
    // Sidebar shows the clinical section
    await expect(page.getByRole('button', { name: 'Patients' })).toBeVisible()
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Mot de passe').fill('wrong-password')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('Identifiants invalides')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Admin patient CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('creates a patient, archives and restores them', async ({ page }) => {
    // Unique surname per run so repeated runs never collide
    const lastName = `E2E${Date.now().toString(36)}`
    await page.getByRole('button', { name: 'Patients', exact: true }).click()
    const newBtn = page.getByRole('button', { name: 'Nouveau patient' })
    await expect(newBtn).toBeVisible({ timeout: 10_000 })

    // Create patient
    await newBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Labels are <label> siblings of <input> — use xpath following-sibling
    await dialog
      .locator('xpath=//label[contains(., "Prénom")]/following-sibling::input')
      .fill('Playwright')
    await dialog
      .locator('xpath=//label[contains(., "Nom")]/following-sibling::input')
      .fill(lastName)
    await dialog
      .locator('xpath=//label[contains(., "Téléphone")]/following-sibling::input')
      .fill('0555001122')
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // Row appears (cells render "lastName firstName")
    const row = page.getByRole('row', { name: new RegExp(lastName) })
    await expect(row).toBeVisible({ timeout: 10_000 })

    // Archive → row disappears from the default "Actifs" filter
    await row.getByRole('button', { name: 'Archiver' }).click()
    await expect(page.getByRole('row', { name: new RegExp(lastName) })).not.toBeVisible({
      timeout: 10_000,
    })

    // Switch filter to "Archivés" (the only combobox inside main) and restore
    const filter = page.locator('main').getByRole('combobox')
    await filter.click()
    await page.getByRole('option', { name: 'Archivés' }).click()
    const archivedRow = page.getByRole('row', { name: new RegExp(lastName) })
    await expect(archivedRow).toBeVisible({ timeout: 10_000 })
    await archivedRow.getByRole('button', { name: 'Restaurer' }).click()

    // Switch back to "Actifs" — row is visible again
    await filter.click()
    await page.getByRole('option', { name: 'Actifs' }).click()
    await expect(page.getByRole('row', { name: new RegExp(lastName) })).toBeVisible({
      timeout: 10_000,
    })

    // Leave the DB clean: archive the smoke patient again
    await page
      .getByRole('row', { name: new RegExp(lastName) })
      .getByRole('button', { name: 'Archiver' })
      .click()
    await expect(page.getByRole('row', { name: new RegExp(lastName) })).not.toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe('Admin RBAC', () => {
  test('dentist cannot see billing section', async ({ page }) => {
    await login(page, 'karim@dentora.dz', 'demo-pass-123')
    // Dentist sees clinical nav…
    await expect(page.getByRole('button', { name: 'Patients' })).toBeVisible()
    // …but not the invoices nav entry (ADMIN/receptionist/accountant only)
    await expect(page.getByRole('button', { name: 'Factures', exact: true })).not.toBeVisible()
  })
})
