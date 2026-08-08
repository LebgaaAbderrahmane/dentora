import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Check, Phone } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { PHONE, PHONE_TEL } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function FinalCta() {
  const { t } = useTranslation()
  const trust = t('cta.trust', { returnObjects: true }) as string[]

  return (
    <section id="book" className="bg-[hsl(var(--primary))]">
      <Container className="max-w-2xl py-20 text-center">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-tight tracking-[-0.03em] text-white"
        >
          {t('cta.title')}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-5 text-[0.92rem] font-light leading-relaxed text-white/70"
        >
          {t('cta.body')}
        </motion.p>
        <motion.div
          variants={fadeUp}
          custom={2}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <a
            href="#contact"
            className="inline-flex h-12 items-center justify-center rounded-full bg-white px-10 font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-white/90"
          >
            {t('cta.cta')}
          </a>
          <a
            href={PHONE_TEL}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/35 px-8 font-normal text-white transition-colors hover:bg-white/10"
          >
            <Phone className="h-4 w-4" />
            {PHONE}
          </a>
        </motion.div>
        <div className="mt-8 flex flex-wrap justify-center gap-8">
          {trust.map((item) => (
            <p key={item} className="flex items-center gap-2 text-[0.8rem] font-light text-white/55">
              <Check className="h-3.5 w-3.5 text-white" />
              {item}
            </p>
          ))}
        </div>
      </Container>
    </section>
  )
}