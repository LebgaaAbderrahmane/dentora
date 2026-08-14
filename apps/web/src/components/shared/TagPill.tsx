import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function TagPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[0.72rem] font-[500] text-white/65',
        className,
      )}
    >
      {children}
    </span>
  )
}
