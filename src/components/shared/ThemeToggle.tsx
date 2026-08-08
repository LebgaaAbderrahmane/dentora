import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycleTheme } = useTheme()
  const { t } = useTranslation()
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = t(`ui.theme.${theme}`)

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}