import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/providers/theme'
import { I18nProvider } from '@/providers/i18n'
import { BookingProvider } from '@/providers/booking'
import { OfflineProvider } from '@/providers/offline'
import { registerServiceWorker } from '@/lib/registerSW'

// Error tracking (ADR 009): DSN baked at build time via VITE_SENTRY_DSN; the
// public site runs without Sentry when it is empty. Errors-only — no tracing.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  })
}

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BookingProvider>
          <OfflineProvider>
            <App />
          </OfflineProvider>
        </BookingProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
