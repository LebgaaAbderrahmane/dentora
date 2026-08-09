import { motion } from 'motion/react'
import type { Variants } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Phone } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { Button } from '@/components/shared/Button'
import { TagPill } from '@/components/shared/TagPill'
import { u } from '@/data/images'
import { PHONE, PHONE_TEL } from '@/data/content'
import { useBooking } from '@/providers/booking'
import { cn } from '@/lib/utils'

const HERO_IMAGE = 'photo-1588776814546-1ffcf47267a5'

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
  const { t } = useTranslation()
  const { openBooking } = useBooking()
  const lines = t('hero.lines', { returnObjects: true }) as string[]
  const tags = t('hero.tags', { returnObjects: true }) as string[]

  let wordIndex = 0

  return (
    <section id="top" className="relative flex h-svh items-end overflow-hidden">
      <img
        src={u(HERO_IMAGE, 1920)}
        alt={t('hero.imageAlt')}
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
        loading="eager"
      />

      <div className="hero-overlay absolute inset-0 z-0" />

      <Container className="relative z-10 w-full pb-14 pt-28 max-md:text-center">
        <motion.div
          variants={block(0)}
          initial="hidden"
          animate="visible"
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/15 px-4 py-1.5 max-md:mx-auto"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
          <span className="text-[0.62rem] font-semibold tracking-[0.12em] text-[hsl(var(--primary))]">
            {t('hero.badge')}
          </span>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          className="mb-6 max-w-[580px] text-[clamp(2.8rem,5.5vw,5.5rem)] font-extrabold leading-[1.0] tracking-[-0.03em] text-white max-md:mx-auto"
        >
          {lines.map((line, li) => (
            <span key={li} className="block">
              {line.split(' ').map((word) => {
                const i = wordIndex++
                return (
                  <motion.span
                    key={`${li}-${word}`}
                    custom={i}
                    variants={wordStagger}
                    className={cn(
                      'inline-block',
                      li === lines.length - 1 && 'text-[hsl(var(--primary))]',
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
          className="mb-10 max-w-[380px] text-[0.92rem] font-normal leading-[1.75] text-white/70 max-md:mx-auto"
        >
          {t('hero.subline')}
        </motion.p>

        <motion.div
          variants={block(0.65)}
          initial="hidden"
          animate="visible"
          className="mb-12 flex flex-wrap items-center gap-4 max-md:justify-center"
        >
          <Button onClick={() => openBooking()} className="h-12 px-8">
            {t('hero.cta')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <a
            href={PHONE_TEL}
            className="ltr-isolate flex items-center gap-2 text-[0.82rem] font-normal text-white/65 transition-colors hover:text-white"
          >
            <Phone className="h-4 w-4" />
            {t('hero.callPrefix')} {PHONE}
          </a>
        </motion.div>

        <motion.div
          variants={block(0.8)}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2.5 max-md:justify-center"
        >
          {tags.map((tag, i) => (
            <TagPill key={tag} className={cn(i > 2 && 'hidden lg:inline-flex')}>
              {tag}
            </TagPill>
          ))}
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[0.72rem] font-[500] text-white/65 lg:hidden">
            {t('hero.more', { count: tags.length - 3 })}
          </span>
        </motion.div>
      </Container>
    </section>
  )
}