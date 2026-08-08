import { useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { faqs } from '@/data/content'
import { fadeUp } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="bg-[hsl(var(--surface-light))]">
      <Container className="max-w-3xl py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <SectionLabel>Faq</SectionLabel>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold tracking-[-0.025em] text-[hsl(var(--surface-dark))]">
            Common questions, clear answers.
          </h2>
        </motion.div>

        {faqs.map((item, i) => {
          const isOpen = open === i
          return (
            <motion.div
              key={item.q}
              variants={fadeUp}
              custom={i * 0.05}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="border-b border-[hsl(var(--border))] py-5"
            >
              <Collapsible open={isOpen} onOpenChange={() => setOpen(isOpen ? null : i)}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
                  >
                    <span className="text-[0.92rem] font-semibold text-[hsl(var(--surface-dark))]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 text-[hsl(var(--primary))] transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent forceMount>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <p className="pb-2 pt-3 text-[0.82rem] font-light leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {item.a}
                    </p>
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          )
        })}
      </Container>
    </section>
  )
}