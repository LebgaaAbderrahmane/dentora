import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CircleCheck } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { teamImage } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function WhyChooseUs() {
  const { t } = useTranslation()
  const items = t('why.items', { returnObjects: true }) as string[]

  return (
    <section className="bg-[hsl(var(--content))]">
      <Container className="grid grid-cols-2 gap-20 py-24 max-md:grid-cols-1 max-md:gap-12">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-md:text-center"
        >
          <SectionLabel className="mb-4">{t('why.label')}</SectionLabel>
          <h2 className="mb-4 text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold leading-[1.2] tracking-[-0.02em] text-[hsl(var(--heading))]">
            {t('why.title')}
          </h2>
          <p className="mx-auto mb-10 max-w-md text-[0.9rem] font-normal leading-[1.8] text-[hsl(var(--muted-foreground))]">
            {t('why.body')}
          </p>

          <ul className="mb-10 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-start max-md:mx-auto">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CircleCheck className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                <span className="text-[0.82rem] font-normal text-[hsl(var(--heading))]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="overflow-hidden rounded-3xl"
        >
          <img
            src={teamImage}
            alt={t('why.imageAlt')}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </motion.div>
      </Container>
    </section>
  )
}