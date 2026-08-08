import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { Button } from '@/components/shared/Button'
import { services } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function Services() {
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
            <SectionLabel className="mb-3">Feature Treatment</SectionLabel>
            <h2 className="text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold leading-[1.2] tracking-[-0.025em] text-[hsl(var(--heading))]">
              Advanced Dental Care
              <br />
              for a Healthier Smile
            </h2>
          </motion.div>
          <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Button href="#services" variant="secondary" className="h-10 px-6">
              View All Services
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
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
                  src={service.image}
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
                <p className="text-[0.78rem] font-light leading-[1.65] text-[hsl(var(--muted-foreground))]">
                  {service.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[0.78rem] font-semibold text-[hsl(var(--primary))] transition-all group-hover:gap-2">
                  Learn more
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  )
}