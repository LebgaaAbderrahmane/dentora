import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { stats, type StatDef } from '@/data/content'
import { useCountUp, useInViewOnce } from '@/lib/hooks'

function Stat({ stat, start }: { stat: StatDef; start: boolean }) {
  const { t } = useTranslation()
  const value = useCountUp(stat.value, start)

  const display = stat.short
    ? `${Math.max(1, Math.round(value / 1000))}k${stat.suffix ?? ''}`
    : stat.prefix
      ? `${stat.prefix}${stat.suffix ?? ''}`
      : `${value.toFixed(stat.decimals ?? 0)}${stat.suffix ?? ''}`

  return (
    <div>
      <p className="flex items-end gap-1 text-[2.8rem] font-extrabold leading-[1] tracking-[-0.03em] text-[hsl(var(--heading))]">
        <span>{display}</span>
        {stat.star && (
          <Star className="mb-1.5 h-6 w-6 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
        )}
      </p>
      <p className="mt-1 text-[0.7rem] font-normal text-[hsl(var(--muted-foreground))]">
        {t(stat.label)}
      </p>
    </div>
  )
}

export function StatsRow() {
  const { t } = useTranslation()
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3)

  return (
    <div
      ref={ref}
      className="flex items-center gap-10 py-8 max-md:flex-col max-md:items-start"
    >
      <p className="max-w-[130px] shrink-0 text-[0.68rem] font-light leading-[1.6] text-[hsl(var(--muted-foreground))]">
        {t('about.statsHint')}
      </p>
      <div className="grid flex-1 grid-cols-2 gap-8 md:flex md:gap-12">
        {stats.map((stat) => (
          <Stat key={stat.label} stat={stat} start={inView} />
        ))}
      </div>
    </div>
  )
}