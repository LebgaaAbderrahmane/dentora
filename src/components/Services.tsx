import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { Button } from '@/components/shared/Button'
import { serviceImages } from '@/data/content'
import { useBooking } from '@/providers/booking'
import { fadeUp } from '@/lib/motion'

export function Services() {
  const { t } = useTranslation()
  const { openBooking } = useBooking()
  const list = t('services.list', { returnObjects: true }) as {
    price: string
    title: string
    body: string
    alt: string
  }[]
  const [titleA, titleB] = t('services.title').split('\n')

  return (
    <section id="services" className="bg-[hsl(var(--soft))]">
      <Container className="py-24">
        <div className="mb-14 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <SectionLabel className="mb-3">{t('services.label')}</SectionLabel>
            <h2 className="text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold leading-[1.2] tracking-[-0.025em] text-[hsl(var(--heading))]">
              {titleA}
              <br />
              {titleB}
            </h2>
          </motion.div>
          <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Button onClick={() => openBooking()} variant="secondary" className="h-10 px-6">
              {t('services.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((service, i) => (
            <motion.article
              key={service.title}
              variants={fadeUp}
              custom={i * 0.08}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--content))] transition-all duration-[220ms] ease-out hover:-translate-y-[5px] hover:shadow-[0_20px_56px_rgba(0,0,0,0.09)]"
            >
              <div className="h-[148px] overflow-hidden">
                <img
                  src={serviceImages[i]}
                  alt={service.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.05]"
                />
              </div>
              <div className="p-5">
                <span className="mb-3 inline-flex rounded-full bg-[hsl(var(--primary-soft))] px-3 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[hsl(var(--primary))]">
                  {service.price}
                </span>
                <h3 className="mb-2 text-[0.95rem] font-bold text-[hsl(var(--heading))]">
                  {service.title}
                </h3>
                <p className="text-[0.88rem] font-normal leading-[1.65] text-[hsl(var(--muted-foreground))]">
                  {service.body}
                </p>
                <button
                  type="button"
                  onClick={() => openBooking(service.title)}
                  className="mt-4 inline-flex cursor-pointer items-center gap-1 text-[0.78rem] font-semibold text-[hsl(var(--primary))] transition-all group-hover:gap-2"
                >
                  {t('ui.learnMore')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  )
}