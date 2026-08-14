import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
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
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-14 max-md:text-center"
        >
          <SectionLabel className="mb-3">{t('services.label')}</SectionLabel>
          <h2 className="text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold leading-[1.2] tracking-[-0.025em] text-[hsl(var(--heading))]">
            {titleA}
            <br />
            {titleB}
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((service, i) => (
            <motion.article
              key={service.title}
              variants={fadeUp}
              custom={i * 0.08}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              onClick={() => openBooking(service.title)}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--content))] transition-all duration-[220ms] ease-out hover:-translate-y-[5px] hover:shadow-[0_20px_56px_rgba(0,0,0,0.09)]"
            >
              <div className="h-[148px] shrink-0 overflow-hidden">
                <img
                  src={serviceImages[i]}
                  alt={service.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.05]"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="ltr-isolate mb-3 inline-flex w-fit rounded-full bg-[hsl(var(--primary-soft))] px-3 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[hsl(var(--primary))]">
                  {service.price}
                </span>
                <h3 className="mb-2 text-[0.95rem] font-bold text-[hsl(var(--heading))]">
                  {service.title}
                </h3>
                <p className="text-[0.88rem] font-normal leading-[1.65] text-[hsl(var(--muted-foreground))]">
                  {service.body}
                </p>
                <div className="mt-auto pt-5">
                  <button
                    type="button"
                    onClick={() => openBooking(service.title)}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary-soft))] px-6 py-2.5 text-[0.8rem] font-semibold text-[hsl(var(--primary))] transition-all duration-200 hover:bg-[hsl(var(--primary))] hover:text-white"
                  >
                    {t('ui.bookAppointment')}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  )
}
