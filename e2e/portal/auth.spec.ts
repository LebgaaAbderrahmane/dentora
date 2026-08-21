import { test, expect } from '@playwright/test'

const PATIENT = { email: 'm.bouzid@mail.dz', password: 'demo-pass-123' }

async function loginAsPatient(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Email').fill(PATIENT.email)
  await page.getByLabel('Mot de passe').fill(PATIENT.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText('Bonjour')).toBeVisible({ timeout: 10_000 })
}

test.describe('Portal login', () => {
  test('logs in and shows home greeting', async ({ page }) => {
    await loginAsPatient(page)
    await expect(page.getByText('Bonjour')).toBeVisible()
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(PATIENT.email)
    await page.getByLabel('Mot de passe').fill('wrong')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('Identifiants invalides')).toBeVisible({ timeout: 10_000 })
  })

  test('non-patient role is rejected', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill('admin@dentora.dz')
    await page.getByLabel('Mot de passe').fill('demo-pass-123')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    // Should show error or stay on login
    await expect(page.getByText('Identifiants invalides').or(page.getByText('Erreur'))).toBeVisible(
      {
        timeout: 10_000,
      },
    )
  })
})

test.describe('Portal appointments', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test('shows appointments list', async ({ page }) => {
    await page.getByText('Mes rendez-vous').first().click()
    await expect(page.getByText('Mes rendez-vous').first()).toBeVisible({ timeout: 10_000 })
    // Should render upcoming/past sections or empty state
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})

test.describe('Portal booking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test('booking form renders with date and time', async ({ page }) => {
    await page.getByText('Prendre rendez-vous').first().click()
    await expect(page.getByText('Envoyer la demande')).toBeVisible({ timeout: 10_000 })
    // Date and time inputs should be present
    await expect(page.locator('input[type="date"]')).toBeVisible()
    await expect(page.locator('input[type="time"]')).toBeVisible()
  })
})

test.describe('Portal invoices', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test('invoices list renders', async ({ page }) => {
    await page.getByText('Mes factures').first().click()
    await expect(page.getByText('Mes factures').first()).toBeVisible({ timeout: 10_000 })
    // Should show invoice list or empty state
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
