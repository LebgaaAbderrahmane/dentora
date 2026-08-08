import { useTranslation } from 'react-i18next'
import { languages } from '@/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const current = i18n.language.split('-')[0]

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-full border border-white/25 bg-white/10 p-0.5',
        className,
      )}
    >
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => i18n.changeLanguage(l.code)}
          aria-label={l.label}
          className={cn(
            'rounded-full px-2 py-1 text-[0.66rem] font-semibold uppercase tracking-wide transition-colors',
            current === l.code
              ? 'bg-white text-[hsl(var(--background))]'
              : 'text-white/60 hover:text-white',
          )}
        >
          {l.code}
        </button>
      ))}
    </div>
  )
}