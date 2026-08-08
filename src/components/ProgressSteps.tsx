import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const steps = ['Smile Assessment', 'Care Planning', 'Treatment Process', 'Dental Maintenance']

export function ProgressSteps() {
  const [active, setActive] = useState(0)

  return (
    <section className="border-b border-[hsl(var(--border))] bg-white px-[60px] max-md:px-4">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 md:grid-cols-4">
        {steps.map((step, i) => (
          <button
            key={step}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              'relative cursor-pointer border-r border-[hsl(var(--border))] px-6 py-5 text-left transition-colors last:border-r-0',
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
                initial={{ scaleX: 0 }}
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