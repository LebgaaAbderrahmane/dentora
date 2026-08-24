import type { Page } from '@playwright/test'
import path from 'node:path'

export type ShotApp = 'web' | 'portal' | 'admin'

// Saves screenshots/<app>/<name>.png relative to the repo root (Playwright is
// always invoked from there via the `shots` package script). Deterministic
// names mean reruns overwrite in place — the folder stays diff-friendly.
export async function shot(
  page: Page,
  app: ShotApp,
  name: string,
  opts: { fullPage?: boolean } = {},
): Promise<void> {
  // Web fonts loading late is the #1 cause of half-rendered captures.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  await page.screenshot({
    path: path.join(process.cwd(), 'screenshots', app, `${name}.png`),
    fullPage: opts.fullPage ?? false,
    animations: 'disabled',
    caret: 'hide',
  })
}
