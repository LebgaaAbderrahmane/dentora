import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import type { Appointment } from '@dentora/contracts'
import { STATUS_KEY } from '../lib/portal'

export function AppointmentStatusBadge({ status }: { status: Appointment['status'] }) {
  const { t } = useI18n()
  const tone =
    status === 'CONFIRMED'
      ? 'border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
      : status === 'PENDING'
        ? 'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : status === 'CANCELLED'
          ? 'border-neutral-300 bg-neutral-100 text-neutral-500'
          : 'border-neutral-300 bg-neutral-100 text-neutral-600'
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {t(STATUS_KEY[status])}
    </span>
  )
}

export function InvoiceStatusBadge({ status }: { status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'VOID' }) {
  const { t } = useI18n()
  const tone =
    status === 'PAID'
      ? 'border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
      : status === 'PARTIAL'
        ? 'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : status === 'VOID'
          ? 'border-neutral-300 bg-neutral-100 text-neutral-500'
          : 'border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {t(`invoices.status.${status.toLowerCase()}` as MessageKey)}
    </span>
  )
}
