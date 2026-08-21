import { defineConfig, devices } from '@playwright/test'

const API_PORT = 4000
const WEB_PORT = 5173
const ADMIN_PORT = 5174
const PORTAL_PORT = 5175

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'web-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${WEB_PORT}` },
      testMatch: /e2e\/web\//,
    },
    {
      name: 'admin-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${ADMIN_PORT}` },
      testMatch: /e2e\/admin\//,
    },
    {
      name: 'portal-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORTAL_PORT}` },
      testMatch: /e2e\/portal\//,
    },
  ],
  // Dev servers (not preview) — the /api proxy is only active in dev mode.
  // Preview serves the built dist without the proxy, so API calls from tests fail.
  webServer: [
    {
      command: `pnpm --filter @dentora/api dev`,
      port: API_PORT,
      reuseExistingServer: true,
      timeout: 30_000,
      // The public booking endpoint rate-limits per IP (5/hour default) and
      // login throttles per IP+email (10/hour default); the suites exceed both
      // from 127.0.0.1, so raise the caps for the suite-started server.
      env: { PUBLIC_RATE_MAX: '1000', LOGIN_RATE_MAX: '1000' },
    },
    {
      command: `pnpm --filter @dentora/web dev --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: `pnpm --filter @dentora/admin dev --port ${ADMIN_PORT} --strictPort`,
      port: ADMIN_PORT,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: `pnpm --filter @dentora/portal dev --port ${PORTAL_PORT} --strictPort`,
      port: PORTAL_PORT,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
