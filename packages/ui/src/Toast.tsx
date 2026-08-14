import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from './cn'
import { ToastContext } from './toast-context'
import type { Toast, ToastKind } from './types'

const kindClasses: Record<ToastKind, string> = {
  success: 'border-brand-500/40 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300',
  error: 'border-red-500/40 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300',
  info: 'border-neutral-300 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, kind }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-inline-end-4 bottom-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur',
              kindClasses[t.kind],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
