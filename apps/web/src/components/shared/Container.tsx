import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-[60px] max-md:px-6', className)}>
      {children}
    </div>
  )
}
