import { useEffect, useState, type ReactNode } from 'react'
import i18n from '@/i18n'

const SEO: Record<string, { title: string; description: string }> = {
  fr: {
    title: 'DENTORA — Clinique Dentaire à Alger',
    description:
      'DENTORA — Clinique Dentaire à Alger. Soins dentaires modernes, mains douces, prix transparents. Rendez-vous le jour même.',
  },
  en: {
    title: 'DENTORA — Dental Clinic in Algiers',
    description:
      'DENTORA — Dental Clinic in Algiers. Modern dental care, gentle hands, transparent prices. Same-day appointments.',
  },
  ar: {
    title: 'دينتورا — عيادة طب الأسنان في الجزائر',
    description:
      'دينتورا — عيادة أسنان في الجزائر. رعاية أسنان حديثة، بث لطيفة، أسعار شفافة. مواعيد في نفس اليوم.',
  },
}

function applyLang(lng: string) {
  const lang = (lng || 'fr').split('-')[0].toLowerCase()
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'

  const seo = SEO[lang] ?? SEO.fr
  document.title = seo.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description)
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
