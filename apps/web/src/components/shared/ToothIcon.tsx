import { cn } from '@/lib/utils'

export function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
      aria-hidden="true"
    >
      <path d="M12 2.5C7.2 2.5 4.5 5.6 4.5 9.3c0 3.4 1 6 1.5 8.4.3 1.5.8 3.3 2.3 3.3 1.6 0 1.8-1.5 2.6-3 .5-.9 1-2.2 1.1-2.2s.6 1.3 1.1 2.2c.8 1.5 1 3 2.6 3 1.5 0 2-1.8 2.3-3.3.5-2.4 1.5-5 1.5-8.4 0-4-2.7-7.1-7.5-7.1z" />
    </svg>
  )
}
