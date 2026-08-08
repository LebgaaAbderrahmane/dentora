import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const sectionIds = ['about', 'services', 'process', 'faq']

export function ProgressSteps() {
  const { t } = useTranslation()
  const steps = t('progress.steps', { returnObjects: true }) as string[]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const els = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          setActive(sectionIds.indexOf(visible.target.id))
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="overflow-x-auto border-b border-[hsl(var(--border))] bg-[hsl(var(--content))] px-[60px] max-md:px-4">
      <div className="mx-auto grid max-w-[1200px] min-w-[720px] grid-cols-4">
        {steps.map((step, i) => (
          <button
            key={step}
            type="button"
            onClick={() => scrollTo(sectionIds[i])}
            className={cn(
              'relative min-w-[180px] cursor-pointer border-e border-[hsl(var(--border))] px-6 py-5 text-start transition-colors last:border-e-0',
              active === i
                ? 'text-[hsl(var(--foreground))]'
                : 'text-[hsl(var(--muted-foreground))]',
            )}
          >
            <span
              className={cn(
                'text-[0.7rem] tracking-[0.06em]',
                active === i ? 'font-semibold' : 'font-normal',
              )}
            >
              {step}
            </span>
            {active === i && (
              <motion.span
                initial={false}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[hsl(var(--primary))]"
              />
            )}
          </button>
        ))}
      </div>
    </section>
  )
}