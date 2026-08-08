import { motion } from 'motion/react'
import { ArrowRight, CircleCheck } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { Button } from '@/components/shared/Button'
import { whyChecklist, teamImage } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function WhyChooseUs() {
  return (
    <section className="bg-white">
      <Container className="grid grid-cols-2 gap-20 py-24 max-md:grid-cols-1 max-md:gap-12">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <SectionLabel className="mb-4">Why Choose Us</SectionLabel>
          <h2 className="mb-4 text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold leading-[1.2] tracking-[-0.02em] text-[hsl(var(--surface-dark))]">
            Are you looking for a dentist to give you that special smile?
          </h2>
          <p className="mb-10 max-w-md text-[0.85rem] font-light leading-[1.8] text-[hsl(var(--muted-foreground))]">
            Dentora Clinic provides the highest quality dental care in Los Angeles with a group of
            experienced dentists and specialists.
          </p>

          <ul className="mb-10 grid grid-cols-2 gap-x-6 gap-y-3">
            {whyChecklist.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CircleCheck className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                <span className="text-[0.82rem] font-normal text-[hsl(var(--surface-dark))]">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <Button href="#testimonials" variant="secondary" className="h-11 px-7">
            Meet Our Team
            <ArrowRight className="h-4 w-4" />
          </Button>
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
            alt="The Dentona dental team standing together in matching scrubs"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </motion.div>
      </Container>
    </section>
  )
}