import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { dictionaries, type Locale } from './messages'
import { I18nContext } from './context'
import type { I18nContextValue } from './context'

const STORAGE_KEY = 'dentora-locale'

function readStoredLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'fr' || stored === 'ar' || stored === 'en') return stored
  return 'fr'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  useEffect(() => {
    const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value: I18nContextValue = {
    locale,
    setLocale: setLocaleState,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: (key) => dictionaries[locale][key] ?? key,
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
