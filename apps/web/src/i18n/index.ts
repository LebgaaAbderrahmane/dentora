import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { en } from '@/i18n/en'
import { fr } from '@/i18n/fr'
import { ar } from '@/i18n/ar'

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
] as const

export type LanguageCode = (typeof languages)[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    supportedLngs: ['en', 'fr', 'ar'],
    fallbackLng: 'fr',
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'dentora-lng',
    },
    interpolation: { escapeValue: false },
  })

export default i18n
