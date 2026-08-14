import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from './cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-brand-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100',
          className,
        )}
        {...rest}
      />
    )
  },
)
