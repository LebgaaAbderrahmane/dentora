import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { testimonialImages } from '@/data/content'
import { fadeUp } from '@/lib/motion'

const Stars = () => (
  <p className="mb-4 text-sm tracking-[2px] text-[hsl(var(--warning))]">★★★★★</p>
)

export function Testimonials() {
  const { t } = useTranslation()
  const list = t('testimonials.list', { returnObjects: true }) as {
    quote: string
    name: string
    source: string
  }[]

  return (
    <section id="testimonials" className="bg-[hsl(var(--content))]">
      <Container className="py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <SectionLabel>{t('testimonials.label')}</SectionLabel>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold tracking-[-0.025em] text-[hsl(var(--heading))]">
            {t('testimonials.title')}
          </h2>
          <p className="ltr-isolate mt-2 text-[0.85rem] font-normal text-[hsl(var(--muted-foreground))]">
            {t('testimonials.subline')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((item, i) => (
            <motion.article
              key={item.name}
              variants={fadeUp}
              custom={i * 0.1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--soft))] p-7"
            >
              <Stars />
              <p className="text-[0.92rem] font-normal leading-[1.75] text-[hsl(var(--heading))]">
                &ldquo;{item.quote}&rdquo;
              </p>              <div className="mt-6 flex items-center gap-3">
                <img
                  src={testimonialImages[i]}
                  alt={item.name}
                  loading="lazy"
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-[0.82rem] font-semibold text-[hsl(var(--heading))]">
                    {item.name}
                  </p>
                  <p className="text-[0.75rem] font-normal text-[hsl(var(--muted-foreground))]">
                    {item.source}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  )
}