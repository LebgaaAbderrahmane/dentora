import { motion } from 'motion/react'
import { Phone } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { Button } from '@/components/shared/Button'
import { ctaImage, PHONE } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function PhotoCTA() {
  return (
    <section id="contact" className="relative flex h-[300px] items-center overflow-hidden">
      <img
        src={ctaImage}
        alt="Happy patient with a bright smile"
        loading="lazy"
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[rgba(6,12,20,0.90)] via-[rgba(6,12,20,0.65)] to-[rgba(6,12,20,0.15)]" />

      <Container className="relative z-10 flex w-full flex-wrap items-center justify-between gap-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-[clamp(1.8rem,3.5vw,3rem)] font-extrabold tracking-[-0.025em] text-white">
            Ready for your best smile?
          </h2>
          <p className="mt-2 text-[0.88rem] font-light text-white/60">
            Same-day appointments available. No waiting lists.
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-wrap gap-3"
        >
          <Button href="#book" className="h-12 px-9">
            Book Appointment
          </Button>
          <Button href={`tel:${PHONE.replace(/\D/g, '')}`} variant="ghost" className="h-12 px-8">
            <Phone className="h-4 w-4" />
            {PHONE}
          </Button>
        </motion.div>
      </Container>
    </section>
  )
}