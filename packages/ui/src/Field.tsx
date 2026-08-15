import type { ReactNode } from 'react'
import { cn } from './cn'

export interface FieldProps {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, required, children, className }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}
