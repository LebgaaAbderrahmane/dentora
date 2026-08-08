import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-[hsl(var(--primary))] text-white hover:bg-[hsl(180,91%,34%)]',
  secondary: 'bg-[hsl(var(--surface-dark))] text-white hover:bg-[hsl(210,38%,13%)]',
  ghost: 'border border-white/25 text-white hover:bg-white/10',
}

interface ButtonProps {
  variant?: Variant
  className?: string
  children: ReactNode
  href?: string
  type?: 'button' | 'submit'
  onClick?: () => void
}

export function Button({
  variant = 'primary',
  className,
  children,
  href,
  type = 'button',
  onClick,
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap rounded-full text-[0.82rem] font-semibold transition-colors',
    variants[variant],
    className,
  )

  if (href) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  )
}