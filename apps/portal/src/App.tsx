import { Card, useTheme } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { Locale } from '@dentora/i18n'

export default function App() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
          <Controls />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <span className="rounded-full border border-brand-500/30 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {t('portal.skeleton')}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">{t('portal.hello')}</h1>
        <Card className="w-full max-w-md">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('portal.comingSoon')}</p>
        </Card>
      </main>

      <footer className="border-t border-neutral-200 px-6 py-4 text-center text-xs text-neutral-400 dark:border-neutral-800">
        {t('app.name')} — {t('app.tagline')}
      </footer>
    </div>
  )
}

function Controls() {
  const { locale, setLocale, t } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-3">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        aria-label={t('locale.label')}
      >
        <option value="system">{t('theme.system')}</option>
        <option value="light">{t('theme.light')}</option>
        <option value="dark">{t('theme.dark')}</option>
      </select>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        aria-label={t('locale.label')}
      >
        <option value="fr">{t('locale.fr')}</option>
        <option value="ar">{t('locale.ar')}</option>
        <option value="en">{t('locale.en')}</option>
      </select>
    </div>
  )
}
