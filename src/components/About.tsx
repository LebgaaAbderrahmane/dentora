import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { StatsRow } from '@/components/StatsCounter'
import { clinicImage, doctorImage } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function About() {
  const { t } = useTranslation()

  return (
    <section id="about" className="bg-[hsl(var(--content))]">
      <Container className="py-20">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <SectionLabel className="mb-6">{t('about.label')}</SectionLabel>
          <p className="mb-14 max-w-[760px] text-[clamp(1.6rem,3vw,2.8rem)] font-bold leading-[1.3] tracking-[-0.02em] text-[hsl(var(--heading))] max-md:mx-auto max-md:text-center">
            {t('about.statementA')}
            <span className="text-[hsl(var(--primary))]">{t('about.statementTeal')}</span>
            {t('about.statementB')}
          </p>
        </motion.div>

        <div className="mb-10 border-y border-[hsl(var(--border))] max-md:border-b max-md:py-0">
          <div className="flex items-center gap-8 max-md:flex-col max-md:items-stretch">
            <StatsRow />
            <motion.div
              variants={fadeUp}
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="ms-auto w-[210px] max-md:ms-0 max-md:mb-8 max-md:w-full"
            >
              <div className="h-[160px] w-[210px] overflow-hidden rounded-2xl max-md:w-full">
                <img
                  src={clinicImage}
                  alt={t('about.imageAlt')}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          variants={fadeUp}
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex items-center gap-4 max-md:flex-col max-md:text-center"
        >
          <img
            src={doctorImage}
            alt={t('about.doctor.name')}
            loading="lazy"
            className="h-12 w-12 rounded-full object-cover"
          />
          <div>
            <p className="text-[0.9rem] font-bold text-[hsl(var(--heading))]">
              {t('about.doctor.name')}
            </p>
            <p className="ltr-isolate mt-1 text-[0.72rem] font-normal text-[hsl(var(--muted-foreground))]">
              {t('about.doctor.role')} ·{' '}
              <span className="text-[hsl(var(--warning))]">{t('about.doctor.rating')}</span>{' '}
              {t('about.doctor.reviews')}
            </p>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}