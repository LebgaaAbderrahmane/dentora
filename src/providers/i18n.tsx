import { useEffect, useState, type ReactNode } from 'react'
import i18n from '@/i18n'

function applyLang(lng: string) {
  const lang = (lng || 'fr').split('-')[0].toLowerCase()
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [, forceRender] = useState(0)

  useEffect(() => {
    const onChanged = (lng: string) => {
      applyLang(lng)
      forceRender((v) => v + 1)
    }
    applyLang(i18n.language)
    i18n.on('languageChanged', onChanged)
    return () => {
      i18n.off('languageChanged', onChanged)
    }
  }, [])

  return <>{children}</>
}