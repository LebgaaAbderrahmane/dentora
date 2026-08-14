import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/providers/theme'
import { I18nProvider } from '@/providers/i18n'
import { BookingProvider } from '@/providers/booking'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BookingProvider>
          <App />
        </BookingProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)