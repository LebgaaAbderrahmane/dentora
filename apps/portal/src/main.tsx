import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { I18nProvider } from '@dentora/i18n'
import { ThemeProvider, ToastProvider } from '@dentora/ui'
import App from './App'
import './index.css'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
          <p className="text-sm">Une erreur est survenue — rechargez la page.</p>
        </main>
      }
    >
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
