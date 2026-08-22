import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  Invoice,
  InvoiceStatus,
  InvoiceDetail,
  Patient,
  Payment,
  PaymentMethod,
  Service,
} from '@dentora/contracts'
import { PAYMENT_METHODS } from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { api, ApiError } from '../lib/api'
import { SearchInput } from '@/components/ui/search-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_KEY: Record<InvoiceStatus, MessageKey> = {
  UNPAID: 'invoices.status.unpaid',
  PARTIAL: 'invoices.status.partial',
  PAID: 'invoices.status.paid',
  VOID: 'invoices.status.void',
}

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  VOID: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

export function InvoicesView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<InvoiceDetail | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .invoices({ q: debouncedQ, status: statusFilter, limit: 100 })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch(() => toast(t('invoices.createError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, statusFilter, t, toast])

  async function refetch() {
    const r = await api.invoices({ q: debouncedQ, status: statusFilter, limit: 100 })
    setItems(r.items)
    setTotal(r.total)
  }

  async function openDetail(inv: Invoice) {
    try {
      setDetail(await api.invoice(inv.id))
    } catch {
      toast(t('invoices.createError'), 'error')
    }
  }

  async function voidDetail() {
    if (!detail) return
    try {
      await api.voidInvoice(detail.id)
      toast(t('invoices.voided'), 'success')
      setDetail(null)
      await refetch()
    } catch (err) {
      if (err instanceof ApiError && err.message === 'ALREADY_VOID') {
        toast(t('invoices.alreadyVoid'), 'error')
      } else {
        toast(t('invoices.voidError'), 'error')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('invoices.search')}
          placeholder={t('invoices.search')}
          value={q}
          onChange={setQ}
        />
        <Select
          value={statusFilter ?? ''}
          onValueChange={(v) => setStatusFilter(v ? (v as InvoiceStatus) : undefined)}
        >
          <SelectTrigger className="w-fit text-xs">
            <span className="text-muted-foreground">{t('common.filter.status')}&nbsp;·&nbsp;</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('invoices.all')}</SelectItem>
            {(['UNPAID', 'PARTIAL', 'PAID', 'VOID'] as InvoiceStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {t(STATUS_KEY[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {total} {t('patients.total')}
        </span>
        {canEdit && (
          <div className="ms-auto">
            <Button onClick={() => setCreating(true)} size="sm">
              {t('invoices.create')}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('invoices.number')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('invoices.patient')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('invoices.issuedAt')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('invoices.status')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('invoices.total')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  …
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  {t('invoices.empty')}
                </td>
              </tr>
            ) : (
              items.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => void openDetail(inv)}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <td className="px-4 py-3 font-mono text-neutral-900 dark:text-neutral-100">
                    #{String(inv.invoiceNumber).padStart(6, '0')}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {inv.patientName}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {new Date(inv.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[inv.status]}`}
                    >
                      {t(STATUS_KEY[inv.status])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end font-mono text-neutral-900 dark:text-neutral-100">
                    {inv.totalDZD.toLocaleString()} {t('catalog.currency')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <InvoiceForm
          onClose={() => setCreating(false)}
          onSaved={async (number) => {
            setCreating(false)
            toast(t('invoices.created', { number }), 'success')
            await refetch()
          }}
        />
      )}
      {detail && (
        <InvoiceDetailDialog
          invoice={detail}
          canEdit={canEdit}
          onClose={() => setDetail(null)}
          onVoid={voidDetail}
          onChanged={async () => {
            try {
              setDetail(await api.invoice(detail.id))
            } catch {
              /* keep current view */
            }
            await refetch()
          }}
        />
      )}
    </div>
  )
}

type DraftLine = {
  serviceId?: string
  serviceName: string
  priceDZD: number
  quantity: number
}

function InvoiceForm({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (number: number) => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [catalog, setCatalog] = useState<Service[]>([])
  const [patientId, setPatientId] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [saving, setSaving] = useState(false)
  const [pick, setPick] = useState(0)

  useEffect(() => {
    Promise.all([api.patients({ limit: 200 }), api.services({ limit: 200 })])
      .then(([pr, se]) => {
        setPatients(pr.patients)
        setCatalog(se.items)
      })
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [t, toast])

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.priceDZD * l.quantity, 0),
    [lines],
  )

  function addFromCatalog(serviceId: string) {
    const svc = catalog.find((s) => s.id === serviceId)
    if (!svc) return
    setLines((prev) => [
      ...prev,
      {
        serviceId: svc.id,
        serviceName: svc.name,
        priceDZD: svc.priceDZD,
        quantity: 1,
      },
    ])
  }

  function patchLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!patientId.trim() || lines.length === 0) {
      toast(t('invoices.form.pleaseAddLine'), 'error')
      return
    }
    setSaving(true)
    try {
      const created = await api.createInvoice({ patientId, lines })
      await onSaved(created.invoiceNumber)
    } catch {
      toast(t('invoices.createError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('invoices.create')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('invoices.form.patient')}</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder={t('invoices.form.patient')} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.lastName} {p.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t('invoices.form.lines')}</Label>
            <Select
              key={pick}
              onValueChange={(v) => {
                addFromCatalog(v)
                setPick((p) => p + 1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('invoices.form.service')} />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.priceDZD.toLocaleString()} {t('catalog.currency')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lines.map((line, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_100px_70px_auto] items-center gap-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
              >
                <Input
                  aria-label={t('invoices.form.serviceName')}
                  value={line.serviceName}
                  onChange={(e) => patchLine(i, { serviceName: e.target.value })}
                  maxLength={120}
                />
                <Input
                  aria-label={t('invoices.form.price')}
                  type="number"
                  min={0}
                  value={line.priceDZD}
                  onChange={(e) => patchLine(i, { priceDZD: Number(e.target.value) })}
                />
                <Input
                  aria-label={t('invoices.form.qty')}
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => patchLine(i, { quantity: Number(e.target.value) })}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </Button>
              </div>
            ))}
            <div className="text-end text-sm text-muted-foreground">
              {t('invoices.totals')}:{' '}
              <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                {subtotal.toLocaleString()} {t('catalog.currency')}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InvoiceDetailDialog({
  invoice,
  canEdit,
  onClose,
  onVoid,
  onChanged,
}: {
  invoice: InvoiceDetail
  canEdit: boolean
  onClose: () => void
  onVoid: () => void | Promise<void>
  onChanged: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [recording, setRecording] = useState(false)
  const [refunding, setRefunding] = useState<Payment | null>(null)

  const writable = canEdit && !invoice.voidedAt
  const receiptRefundedOf = (r: Payment) =>
    invoice.payments.filter((p) => p.refundsId === r.id).reduce((sum, p) => sum + p.amountDZD, 0)
  const isFullyRefunded = (r: Payment) =>
    r.kind === 'RECEIPT' && receiptRefundedOf(r) >= r.amountDZD

  const refundRemaining = (r: Payment) => Math.max(0, r.amountDZD - receiptRefundedOf(r))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t('invoices.detail')} — #{String(invoice.invoiceNumber).padStart(6, '0')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {invoice.patientName}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[invoice.status]}`}
            >
              {t(STATUS_KEY[invoice.status])}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t('catalog.name')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('invoices.form.price')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('invoices.form.qty')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('invoices.total')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">
                      {l.serviceName}
                    </td>
                    <td className="px-3 py-2 text-end text-neutral-600 dark:text-neutral-300">
                      {l.priceDZD.toLocaleString()} {t('catalog.currency')}
                    </td>
                    <td className="px-3 py-2 text-end text-neutral-600 dark:text-neutral-300">
                      ×{l.quantity}
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-neutral-900 dark:text-neutral-100">
                      {(l.priceDZD * l.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-1 text-end text-sm">
            <span className="text-muted-foreground">
              {t('invoices.totals')}:{' '}
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {invoice.totalDZD.toLocaleString()} {t('catalog.currency')}
              </span>
            </span>
            <span className="text-muted-foreground">
              {t('invoices.paid')}:{' '}
              <span className="font-mono font-medium text-emerald-700 dark:text-emerald-300">
                {invoice.paidDZD.toLocaleString()} {t('catalog.currency')}
              </span>
            </span>
            <span className="text-muted-foreground">
              {t('invoices.balance')}:{' '}
              <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                {invoice.balanceDZD.toLocaleString()} {t('catalog.currency')}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {t('payments.section')}
            </h2>
            {writable && invoice.balanceDZD > 0 && (
              <Button size="sm" onClick={() => setRecording(true)}>
                {t('payments.record')}
              </Button>
            )}
          </div>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('payments.none')}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">{t('payments.date')}</th>
                    <th className="px-3 py-2 text-start font-medium">{t('payments.method')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('payments.amount')}</th>
                    <th className="px-3 py-2 text-start font-medium">{t('payments.reference')}</th>
                    <th className="px-3 py-2 text-end font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                        {new Date(p.receivedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">
                        {p.kind === 'REFUND' ? (
                          <span className="text-red-600 dark:text-red-400">
                            {t('payments.refund')}
                          </span>
                        ) : (
                          t(METHOD_KEY[p.method])
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-end font-mono ${p.kind === 'REFUND' ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}
                      >
                        {p.kind === 'REFUND' ? '−' : ''}
                        {p.amountDZD.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                        {p.reference ?? ''}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {p.kind === 'RECEIPT' &&
                          writable &&
                          (isFullyRefunded(p) ? (
                            <span className="text-[11px] font-medium text-neutral-400">
                              {t('payments.refunded')}
                            </span>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setRefunding(p)}>
                              {t('payments.refund')}
                            </Button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {writable && (
            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                {t('appointments.cancel')}
              </Button>
              <Button variant="destructive" type="button" onClick={() => void onVoid()}>
                {t('invoices.void')}
              </Button>
            </DialogFooter>
          )}
        </div>

        {recording && (
          <PaymentForm
            invoice={invoice}
            onClose={() => setRecording(false)}
            onSaved={async () => {
              setRecording(false)
              toast(t('payments.recorded'), 'success')
              await onChanged()
            }}
          />
        )}
        {refunding && (
          <RefundForm
            payment={refunding}
            maxAmount={refundRemaining(refunding)}
            onClose={() => setRefunding(null)}
            onSaved={async () => {
              setRefunding(null)
              toast(t('payments.refundedToast'), 'success')
              await onChanged()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

const METHOD_KEY: Record<PaymentMethod, MessageKey> = {
  CASH: 'payments.method.cash',
  CHEQUE: 'payments.method.cheque',
  CARD: 'payments.method.card',
  TRANSFER: 'payments.method.transfer',
}

function PaymentForm({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: InvoiceDetail
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [amountDZD, setAmountDZD] = useState(invoice.balanceDZD)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!method || !Number.isInteger(amountDZD) || amountDZD <= 0) return
    setSaving(true)
    try {
      await api.createPayment({
        invoiceId: invoice.id,
        method,
        amountDZD,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      await onSaved()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'PAYMENT_EXCEEDS_BALANCE'
          ? t('payments.exceedsBalance')
          : t('payments.recordError'),
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('payments.record')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('payments.form.amount')}</Label>
            <Input
              type="number"
              min={1}
              max={invoice.balanceDZD}
              value={amountDZD}
              onChange={(e) => setAmountDZD(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {t('invoices.balance')}: {invoice.balanceDZD.toLocaleString()} {t('catalog.currency')}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('payments.form.method')}</Label>
            <Select value={method ?? ''} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder={t('payments.form.method')} />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(METHOD_KEY[m])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('payments.form.reference')}</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('payments.form.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !method || amountDZD <= 0}>
              {t('appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RefundForm({
  payment,
  maxAmount,
  onClose,
  onSaved,
}: {
  payment: Payment
  maxAmount: number
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [amountDZD, setAmountDZD] = useState(maxAmount)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!Number.isInteger(amountDZD) || amountDZD <= 0) return
    setSaving(true)
    try {
      await api.refundPayment(payment.id, {
        amountDZD,
        notes: notes.trim() || undefined,
      })
      await onSaved()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'REFUND_EXCEEDS_RECEIPT'
          ? t('payments.refundExceeds')
          : t('payments.refundError'),
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('payments.refund')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('payments.form.amount')}</Label>
            <Input
              type="number"
              min={1}
              max={maxAmount}
              value={amountDZD}
              onChange={(e) => setAmountDZD(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {t(METHOD_KEY[payment.method])} — {t('payments.refunded')}:{' '}
              {maxAmount.toLocaleString()} {t('catalog.currency')}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('payments.form.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={saving || amountDZD <= 0}>
              {t('appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
