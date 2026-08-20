import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/providers/theme'
import { I18nProvider } from '@/providers/i18n'
import { BookingProvider } from '@/providers/booking'
import { OfflineProvider } from '@/providers/offline'
import { registerServiceWorker } from '@/lib/registerSW'

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
