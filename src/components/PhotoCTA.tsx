import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Phone } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { Button } from '@/components/shared/Button'
import { ctaImage, PHONE, PHONE_TEL } from '@/data/content'
import { useBooking } from '@/providers/booking'
import { fadeUp } from '@/lib/motion'

export function PhotoCTA() {
  const { t } = useTranslation()
  const { openBooking } = useBooking()

  return (
    <section id="contact" className="relative flex h-[300px] items-center overflow-hidden">
      <img
        src={ctaImage}
        alt={t('photoCta.imageAlt')}
        loading="lazy"
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      <div className="photo-cta-overlay absolute inset-0 z-[1]" />

      <Container className="relative z-10 flex w-full flex-wrap items-center justify-between gap-8 max-md:flex-col max-md:text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-[clamp(1.8rem,3.5vw,3rem)] font-extrabold tracking-[-0.025em] text-white">
            {t('photoCta.title')}
          </h2>
          <p className="mt-2 text-[0.88rem] font-normal text-white/75">{t('photoCta.body')}</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-wrap gap-3 max-md:justify-center"
        >
          <Button onClick={() => openBooking()} className="h-12 px-9">
            {t('photoCta.cta')}
          </Button>
          <Button href={PHONE_TEL} variant="ghost" className="ltr-isolate h-12 px-8">
            <Phone className="h-4 w-4" />
            {PHONE}
          </Button>
        </motion.div>
      </Container>
    </section>
  )
}