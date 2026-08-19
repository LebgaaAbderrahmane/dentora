import { useEffect, useState } from 'react'
import { formatDate, useI18n } from '@dentora/i18n'
import type { Invoice, InvoiceDetail } from '@dentora/contracts'
import { Button, Card, Modal } from '@dentora/ui'
import { api } from '../lib/api'
import { InvoiceStatusBadge } from '../components/badges'

export default function InvoicesView() {
  const { t, locale } = useI18n()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [detail, setDetail] = useState<InvoiceDetail | null>(null)
  const [error, setError] = useState(false)

  function load() {
    api
      .invoices()
      .then((r) => setInvoices(r.items))
      .catch(() => setError(true))
  }

  useEffect(load, [])

  function open(id: string) {
    api
      .invoice(id)
      .then(setDetail)
      .catch(() => setError(true))
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {t('portal.invoices')}
      </h1>

      {error ? (
        <Card className="p-5 text-sm text-red-600 dark:text-red-400">{t('portal.error')}</Card>
      ) : invoices.length === 0 ? (
        <Card className="p-5 text-sm text-neutral-500 dark:text-neutral-400">
          {t('portal.noInvoices')}
        </Card>
      ) : (
        <Card className="p-2">
          <ul className="flex flex-col">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-3 py-3 last:border-b-0 dark:border-neutral-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {t('portal.invoiceNumber')} {inv.invoiceNumber}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formatDate(inv.issuedAt, locale)}
                  </p>
                </div>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {inv.totalDZD.toLocaleString()} {t('catalog.currency')}
                </span>
                <InvoiceStatusBadge status={inv.status} />
                <Button variant="secondary" size="sm" onClick={() => open(inv.id)}>
                  {t('portal.invoiceDetail')}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {detail && (
        <Modal
          title={`${t('portal.invoiceNumber')} ${detail.invoiceNumber}`}
          onClose={() => setDetail(null)}
          closeLabel={t('common.close')}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {formatDate(detail.issuedAt, locale)}
            </span>
            <InvoiceStatusBadge status={detail.status} />
          </div>

          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {t('portal.invoiceLines')}
          </h3>
          <ul className="mt-2 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {detail.lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-neutral-800 dark:text-neutral-200">
                  {line.serviceName} × {line.quantity}
                </span>
                <span className="text-neutral-800 dark:text-neutral-200">
                  {(line.priceDZD * line.quantity).toLocaleString()} {t('catalog.currency')}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm font-medium dark:border-neutral-800">
            <span className="text-neutral-500 dark:text-neutral-400">{t('portal.balance')}</span>
            <span className="text-neutral-900 dark:text-neutral-100">
              {detail.balanceDZD.toLocaleString()} {t('catalog.currency')}
            </span>
          </div>

          {detail.payments.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {t('portal.receivedPayments')}
              </h3>
              <ul className="mt-2 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {detail.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {formatDate(p.receivedAt, locale)}
                    </span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {p.amountDZD.toLocaleString()} {t('catalog.currency')}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-6 text-xs text-neutral-400">{t('portal.contactOffice')}</p>
        </Modal>
      )}
    </>
  )
}
