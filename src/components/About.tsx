import { motion } from 'motion/react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { StatsRow } from '@/components/StatsCounter'
import { clinicImage, doctor } from '@/data/content'
import { fadeUp } from '@/lib/motion'

export function About() {
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
          <SectionLabel className="mb-6">About Us</SectionLabel>
          <p className="mb-14 max-w-[760px] text-[clamp(1.6rem,3vw,2.8rem)] font-bold leading-[1.3] tracking-[-0.02em] text-[hsl(var(--heading))]">
            We deliver{' '}
            <span className="text-[hsl(var(--primary))]">personalized dental treatments</span> with
            modern technology and gentle care ensuring healthy confident smiles for every patient.
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
              className="ml-auto w-[210px] max-md:ml-0 max-md:mb-8"
            >
              <div className="h-[160px] w-[210px] overflow-hidden rounded-2xl">
                <img
                  src={clinicImage}
                  alt="Modern dental clinic interior with a dental chair"
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
          className="flex items-center gap-4"
        >
          <img
            src={doctor.image}
            alt={doctor.name}
            loading="lazy"
            className="h-12 w-12 rounded-full object-cover"
          />
          <div>
            <p className="text-[0.9rem] font-bold text-[hsl(var(--heading))]">
              {doctor.name}
            </p>
            <p className="mt-1 text-[0.72rem] font-normal text-[hsl(var(--muted-foreground))]">
              {doctor.role} · <span className="text-[hsl(var(--warning))]">★ 4.9</span>{' '}
              (40+ reviews)
            </p>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}