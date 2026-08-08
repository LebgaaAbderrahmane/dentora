import { motion } from 'motion/react'
import type { Variants } from 'motion/react'
import { ArrowRight, Phone } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { Button } from '@/components/shared/Button'
import { TagPill } from '@/components/shared/TagPill'
import { u } from '@/data/images'
import { cn } from '@/lib/utils'

const HERO_IMAGE = 'photo-1588776814546-1ffcf47267a5'

const heroLines: { words: string[]; teal: boolean }[] = [
  { words: ['Experience'], teal: false },
  { words: ['Comfortable'], teal: false },
  { words: ['Dental', 'Care.'], teal: true },
]

const serviceTags = [
  'Dental Checkup',
  'Teeth Cleaning',
  'Tooth Whitening',
  'Gum Treatment',
  'Implants',
  'Root Canal',
]

const block = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: 'easeOut', delay },
  },
})

const wordStagger: Variants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: 'easeOut', delay: i * 0.08 },
  }),
}

export function Hero() {
  let wordIndex = 0

  return (
    <section className="relative flex min-h-[90vh] items-end overflow-hidden max-md:min-h-[80vh]">
      <img
        src={u(HERO_IMAGE, 1920)}
        alt="Patient smiling in a bright dental chair"
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
        loading="eager"
      />

      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(to right, rgba(6,12,20,0.95) 0%, rgba(6,12,20,0.80) 38%, rgba(6,12,20,0.45) 65%, rgba(6,12,20,0.15) 100%), linear-gradient(to top, hsl(var(--background)) 0%, transparent 20%)',
        }}
      />

      <Container className="relative z-10 w-full pb-14 pt-28">
        <motion.div
          variants={block(0)}
          initial="hidden"
          animate="visible"
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/15 px-4 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
          <span className="text-[0.62rem] font-semibold tracking-[0.12em] text-[hsl(var(--primary))]">
            BEST DENTAL CARE · PORTLAND, OR
          </span>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          className="mb-6 max-w-[580px] text-[clamp(2.8rem,5.5vw,5.5rem)] font-extrabold leading-[1.0] tracking-[-0.03em] text-white"
        >
          {heroLines.map((line, li) => (
            <span key={li} className="block">
              {line.words.map((word) => {
                const i = wordIndex++
                return (
                  <motion.span
                    key={word}
                    custom={i}
                    variants={wordStagger}
                    className={cn(
                      'inline-block',
                      line.teal && 'text-[hsl(var(--primary))]',
                    )}
                  >
                    {word}
                    {'\u00A0'}
                  </motion.span>
                )
              })}
            </span>
          ))}
        </motion.h1>

        <motion.p
          variants={block(0.5)}
          initial="hidden"
          animate="visible"
          className="mb-10 max-w-[380px] text-[0.92rem] font-light leading-[1.75] text-white/55"
        >
          Your family's dental health, handled with care. Modern technology, gentle hands, and
          transparent pricing — always.
        </motion.p>

        <motion.div
          variants={block(0.65)}
          initial="hidden"
          animate="visible"
          className="mb-12 flex flex-wrap items-center gap-4"
        >
          <Button href="#book" className="h-12 px-8">
            Book Appointment
            <ArrowRight className="h-4 w-4" />
          </Button>
          <a
            href="tel:+18005592648"
            className="flex items-center gap-2 text-[0.82rem] font-normal text-white/50 transition-colors hover:text-white"
          >
            <Phone className="h-4 w-4" />
            Or Call: (800) 559-2648
          </a>
        </motion.div>

        <motion.div
          variants={block(0.8)}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2.5"
        >
          {serviceTags.map((tag, i) => (
            <TagPill key={tag} className={cn(i > 2 && 'hidden lg:inline-flex')}>
              {tag}
            </TagPill>
          ))}
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[0.72rem] font-[500] text-white/65 lg:hidden">
            +{serviceTags.length - 3} More
          </span>
        </motion.div>
      </Container>
    </section>
  )
}