import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
}

export function Card({ title, className, children, ...rest }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
        className,
      )}
      {...rest}
    >
      {title != null && (
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</h2>
      )}
      {children}
    </section>
  )
}
