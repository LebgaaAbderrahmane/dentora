import type { Locale } from './messages'

const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-FR',
  ar: 'ar-DZ',
  en: 'en-US',
}

function parse(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium' }).format(parse(value))
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parse(value))
}
