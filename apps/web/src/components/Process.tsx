import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { processImages } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function Process() {
  const { t } = useTranslation()
  const list = t('process.list', { returnObjects: true }) as {
    title: string
    body: string
    alt: string
  }[]

  return (
    <section id="process" className="bg-[hsl(var(--surface-dark))]">
      <Container className="py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-[560px] text-center"
        >
          <SectionLabel>{t('process.label')}</SectionLabel>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold tracking-[-0.025em] text-white">
            {t('process.title')}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {list.map((step, i) => (
            <motion.article
              key={step.title}
              variants={fadeUp}
              custom={i * 0.1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6"
            >
              <span className="mb-5 block text-[3rem] font-extrabold leading-[1] tracking-[-0.04em] text-white/[0.07]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="mb-5 h-[130px] overflow-hidden rounded-xl">
                <img
                  src={processImages[i]}
                  alt={step.alt}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[0.65rem] font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-[0.88rem] font-bold text-white">{step.title}</h3>
              </div>
              <p className="text-[0.85rem] font-normal leading-relaxed text-white/65">
                {step.body}
              </p>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  )
}
