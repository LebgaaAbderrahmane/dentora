import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { ToothIcon } from '@/components/shared/ToothIcon'
import { Footer } from '@/components/Footer'

export type LegalKind = 'privacy' | 'terms'

interface LegalPageProps {
  kind: LegalKind
  onBack: () => void
  onOpenLegal: (page: LegalKind) => void
}

export function LegalPage({ kind, onBack, onOpenLegal }: LegalPageProps) {
  const { t } = useTranslation()
  const data = t(`legal.${kind}`, { returnObjects: true }) as {
    title: string
    intro?: string
    updated?: string
    sections: { heading: string; body: string }[]
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="border-b border-[hsl(var(--border))]">
        <Container className="flex items-center justify-between gap-4 py-[18px]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/25 bg-white/15">
              <ToothIcon className="h-4 w-4 text-white" />
            </span>
            <span className="text-[0.95rem] font-bold tracking-[-0.01em] text-white">
              {t('brand')}
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 text-[0.75rem] font-semibold text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('legal.back')}
          </button>
        </Container>
      </header>

      <Container className="max-w-3xl py-16">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold tracking-[-0.02em] text-[hsl(var(--heading))]"
        >
          {data.title}
        </motion.h1>
        {data.updated && (
          <p className="ltr-isolate mt-4 text-[0.75rem] font-normal text-[hsl(var(--muted-foreground))]">
            {t('legal.updatedOn')}
            {data.updated}
          </p>
        )}
        {data.intro && (
          <p className="mt-8 text-[0.95rem] font-normal leading-[1.8] text-[hsl(var(--muted-foreground))]">
            {data.intro}
          </p>
        )}
        <div className="mt-10 space-y-8">
          {data.sections.map((s) => (
            <div key={s.heading}>
              <h2 className="mb-2 text-[1.05rem] font-bold text-[hsl(var(--heading))]">
                {s.heading}
              </h2>
              <p className="text-[0.9rem] font-normal leading-[1.8] text-[hsl(var(--muted-foreground))]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </Container>

      <Footer onOpenLegal={onOpenLegal} />
    </div>
  )
}