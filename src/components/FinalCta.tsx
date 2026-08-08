import { motion } from 'motion/react'
import { Check, Phone } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { PHONE } from '@/data/content'
import { fadeUp } from '@/lib/motion'

const trust = ['No waiting list', 'Transparent pricing', 'All ages welcome']

export function FinalCta() {
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
          Your healthiest smile starts today.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-5 text-[0.92rem] font-light leading-relaxed text-white/70"
        >
          Request a free consultation in under 2 minutes. Same-day appointments available.
          Transparent pricing, no surprises.
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
            Book Free Consultation
          </a>
          <a
            href={`tel:${PHONE.replace(/\D/g, '')}`}
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