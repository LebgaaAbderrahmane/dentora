import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--primary))]',
        className,
      )}
    >
      {children}
    </p>
  )
}
