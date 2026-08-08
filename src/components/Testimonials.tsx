import { motion } from 'motion/react'
import { Container } from '@/components/shared/Container'
import { SectionLabel } from '@/components/shared/SectionLabel'
import { testimonials } from '@/data/content'
import { fadeUp } from '@/lib/motion'

const Stars = () => (
  <p className="mb-4 text-sm tracking-[2px] text-[hsl(var(--warning))]">★★★★★</p>
)

export function Testimonials() {
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
          <SectionLabel>Patient Reviews</SectionLabel>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-extrabold tracking-[-0.025em] text-[hsl(var(--heading))]">
            Don't take our word for it.
          </h2>
          <p className="mt-2 text-[0.85rem] font-normal text-[hsl(var(--muted-foreground))]">
            <span className="text-[hsl(var(--warning))]">★★★★★</span> 4.9 average from 1,200+
            verified reviews
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.article
              key={t.name}
              variants={fadeUp}
              custom={i * 0.1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--soft))] p-7"
            >
              <Stars />
              <p className="text-[0.92rem] font-normal leading-[1.75] text-[hsl(var(--heading))]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <img
                  src={t.image}
                  alt={t.name}
                  loading="lazy"
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <p className="text-[0.82rem] font-semibold text-[hsl(var(--heading))]">
                    {t.name}
                  </p>
                  <p className="text-[0.68rem] font-light text-[hsl(var(--muted-foreground))]">
                    {t.source}
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