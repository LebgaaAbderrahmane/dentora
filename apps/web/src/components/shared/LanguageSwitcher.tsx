import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { languages } from '@/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = i18n.language.split('-')[0]

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
        aria-label="Change language"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ltr-isolate flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-3 text-[0.7rem] font-semibold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/20 hover:text-white"
      >
        {current}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
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
            {languages.map((l) => {
              const active = current === l.code
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    i18n.changeLanguage(l.code)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[0.8rem] transition-colors',
                    active
                      ? 'bg-[hsl(var(--primary-soft))] font-semibold text-[hsl(var(--primary))]'
                      : 'font-normal text-[hsl(var(--heading))] hover:bg-[hsl(var(--soft))]',
                  )}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span>{l.label}</span>
                  <span className="ms-auto ltr-isolate text-[0.65rem] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                    {l.code}
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
