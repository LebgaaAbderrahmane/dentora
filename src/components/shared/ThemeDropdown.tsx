import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, SunMoon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '@/providers/theme'
import { cn } from '@/lib/utils'

const options: { value: Theme; icon: 'sun' | 'moon' | 'monitor' }[] = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
  { value: 'system', icon: 'monitor' },
]

export function ThemeDropdown({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={t('ui.theme.label')}
        title={t('ui.theme.label')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
      >
        <SunMoon className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute end-0 top-11 z-50 min-w-[184px] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--content))] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
          >
            {options.map(({ value }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTheme(value as Theme)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[0.8rem] transition-colors',
                    active
                      ? 'bg-[hsl(var(--primary-soft))] font-semibold text-[hsl(var(--primary))]'
                      : 'font-normal text-[hsl(var(--heading))] hover:bg-[hsl(var(--soft))]',
                  )}
                >
                  <span>{t(`ui.theme.${value}`)}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}