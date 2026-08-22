import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  type PurchaseOrder,
  type PurchaseOrderDetail,
  type PurchaseOrderStatus,
  type PurchaseOrderCreateLine,
  type Product,
  type Supplier,
} from '@dentora/contracts'
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

const STATUS_KEY: Record<PurchaseOrderStatus, MessageKey> = {
  DRAFT: 'purchaseOrders.status.DRAFT',
  ORDERED: 'purchaseOrders.status.ORDERED',
  PARTIALLY_RECEIVED: 'purchaseOrders.status.PARTIALLY_RECEIVED',
  RECEIVED: 'purchaseOrders.status.RECEIVED',
  CANCELLED: 'purchaseOrders.status.CANCELLED',
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const { t } = useI18n()
  const tone =
    status === 'RECEIVED'
      ? 'border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
      : status === 'PARTIALLY_RECEIVED'
        ? 'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : status === 'CANCELLED'
          ? 'border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
          : status === 'ORDERED'
            ? 'border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
            : 'border-neutral-300 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {t(STATUS_KEY[status])}
    </span>
  )
}

export function PurchaseOrdersView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<PurchaseOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>(undefined)
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .purchaseOrders({ q: debouncedQ, status, limit: 100 })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch(() => toast(t('purchaseOrders.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, status, t, toast])

  async function refetch() {
    const r = await api.purchaseOrders({ q: debouncedQ, status, limit: 100 })
    setItems(r.items)
    setTotal(r.total)
  }

  async function openDetail(order: PurchaseOrder) {
    try {
      setDetail(await api.purchaseOrder(order.id))
    } catch {
      toast(t('purchaseOrders.loadError'), 'error')
    }
  }

  async function refreshDetail(order: PurchaseOrderDetail) {
    try {
      setDetail(await api.purchaseOrder(order.id))
    } catch {
      setDetail(null)
    }
    await refetch()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('purchaseOrders.search')}
          placeholder={t('purchaseOrders.search')}
          value={q}
          onChange={setQ}
        />
        <Select
          value={status ?? ''}
          onValueChange={(v) => setStatus(v ? (v as PurchaseOrderStatus) : undefined)}
        >
          <SelectTrigger className="w-fit text-xs">
            <span className="text-muted-foreground">{t('common.filter.status')}&nbsp;·&nbsp;</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('purchaseOrders.allStatuses')}</SelectItem>
            {Object.keys(STATUS_KEY).map((s) => (
              <SelectItem key={s} value={s}>
                {t(STATUS_KEY[s as PurchaseOrderStatus])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {total} {t('purchaseOrders.lines')}
        </span>
        <div className="ms-auto">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            {t('purchaseOrders.new')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('purchaseOrders.reference')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('purchaseOrders.supplier')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('purchaseOrders.orderedAt')}</th>
              <th className="px-4 py-2 text-center font-medium">{t('purchaseOrders.status')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('purchaseOrders.total')}</th>
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
                  {t('purchaseOrders.empty')}
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => void openDetail(o)}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="px-4 py-3 font-mono text-neutral-900 dark:text-neutral-100">
                    {o.reference || o.id}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {o.supplierName ?? t('purchaseOrders.noSupplier')}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {new Date(o.orderedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-end font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {o.totalDZD.toLocaleString()} {t('catalog.currency')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateOrderDialog
          onClose={() => setCreateOpen(false)}
          onSaved={async () => await refetch()}
        />
      )}

      {detail && (
        <OrderDetailDialog
          order={detail}
          onClose={() => setDetail(null)}
          onChanged={() => void refreshDetail(detail)}
        />
      )}
    </div>
  )
}

function OrderDetailDialog({
  order,
  onClose,
  onChanged,
}: {
  order: PurchaseOrderDetail
  onClose: () => void
  onChanged: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const receivable = order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED'
  const editable = order.status === 'ORDERED'
  const hasRemaining = order.lines.some((l) => l.receivedQuantity < l.quantity)

  async function cancelOrder() {
    try {
      await api.cancelPurchaseOrder(order.id)
      toast(t('purchaseOrders.cancelled'), 'success')
      closeAll()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'HAS_RECEIVED'
          ? t('purchaseOrders.locked')
          : t('purchaseOrders.cancelError'),
        'error',
      )
    }
  }

  function closeAll() {
    setReceiveOpen(false)
    setEditOpen(false)
    onClose()
  }

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && closeAll()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>
                {order.reference || order.id}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  {t('purchaseOrders.reference')}
                </span>
              </DialogTitle>
              <StatusBadge status={order.status} />
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">{t('purchaseOrders.supplier')}</span>
              <span>{order.supplierName ?? t('purchaseOrders.noSupplier')}</span>
              <span className="text-muted-foreground">{t('purchaseOrders.orderedAt')}</span>
              <span>{new Date(order.orderedAt).toLocaleDateString()}</span>
              <span className="text-muted-foreground">{t('purchaseOrders.receivedAt')}</span>
              <span>
                {order.receivedAt ? new Date(order.receivedAt).toLocaleDateString() : '—'}
              </span>
              {order.notes && (
                <>
                  <span className="text-muted-foreground">{t('purchaseOrders.notes')}</span>
                  <span>{order.notes}</span>
                </>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">
                      {t('purchaseOrders.product')}
                    </th>
                    <th className="px-3 py-2 text-end font-medium">
                      {t('purchaseOrders.unitPrice')}
                    </th>
                    <th className="px-3 py-2 text-end font-medium">{t('purchaseOrders.qty')}</th>
                    <th className="px-3 py-2 text-end font-medium">
                      {t('purchaseOrders.received')}
                    </th>
                    <th className="px-3 py-2 text-end font-medium">{t('purchaseOrders.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">
                        {l.productName}
                      </td>
                      <td className="px-3 py-2 text-end font-mono text-neutral-500 dark:text-neutral-400">
                        {l.unitPriceDZD.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-end font-mono">{l.quantity}</td>
                      <td
                        className={`px-3 py-2 text-end font-mono ${
                          l.receivedQuantity >= l.quantity
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {l.receivedQuantity}
                      </td>
                      <td className="px-3 py-2 text-end font-mono">
                        {l.lineTotalDZD.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-2 text-end text-xs uppercase text-muted-foreground"
                    >
                      {t('purchaseOrders.total')}
                    </td>
                    <td className="px-3 py-2 text-end font-mono font-semibold">
                      {order.totalDZD.toLocaleString()} {t('catalog.currency')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <DialogFooter className="gap-2">
              {order.status !== 'CANCELLED' && order.status !== 'RECEIVED' && (
                <Button
                  variant="outline"
                  onClick={() => void cancelOrder()}
                  className="text-red-600 dark:text-red-400"
                >
                  {t('purchaseOrders.status.CANCELLED')}
                </Button>
              )}
              {editable && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  {t('purchaseOrders.edit')}
                </Button>
              )}
              {receivable && hasRemaining && (
                <Button onClick={() => setReceiveOpen(true)}>
                  {t('purchaseOrders.receiving')}
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                {t('common.close')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {editOpen && (
        <EditOrderDialog
          order={order}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false)
            await onChanged()
          }}
        />
      )}
      {receiveOpen && (
        <ReceiveOrderDialog
          order={order}
          onClose={() => setReceiveOpen(false)}
          onSaved={async () => {
            setReceiveOpen(false)
            await onChanged()
            toast(t('purchaseOrders.receivedToast'), 'success')
          }}
        />
      )}
    </>
  )
}

type DraftLine = PurchaseOrderCreateLine

function CreateOrderDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [orderedAt, setOrderedAt] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([{ productId: '', quantity: 1, unitPriceDZD: 0 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void api.suppliers({ limit: 200 }).then((r) => setSuppliers(r.items))
    void api.products({ limit: 200 }).then((r) => setProducts(r.items))
  }, [])

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPriceDZD * l.quantity, 0),
    [lines],
  )

  function patchLine(i: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (lines.some((l) => !l.productId || l.quantity < 1)) return
    setSaving(true)
    try {
      await api.createPurchaseOrder({
        supplierId: supplierId || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        orderedAt: orderedAt ? new Date(orderedAt).toISOString() : undefined,
        lines,
      })
      toast(t('purchaseOrders.added'), 'success')
      await onSaved()
      onClose()
    } catch (err) {
      toast(
        err instanceof ApiError &&
          (err.message === 'UNKNOWN_PRODUCT' || err.message === 'UNKNOWN_SUPPLIER')
          ? t('purchaseOrders.addError')
          : t('purchaseOrders.addError'),
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('purchaseOrders.new')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('purchaseOrders.supplier')}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('purchaseOrders.noSupplier')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('purchaseOrders.reference')}</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={60}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('purchaseOrders.orderedAt')}</Label>
            <Input type="date" value={orderedAt} onChange={(e) => setOrderedAt(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('purchaseOrders.notes')}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700"
            />
          </div>

          <div className="flex flex-col gap-2">
            {lines.map((l, i) => (
              <div
                key={i}
                className="grid grid-cols-2 items-end gap-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
              >
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>{t('purchaseOrders.product')}</Label>
                  <Select value={l.productId} onValueChange={(v) => patchLine(i, { productId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('purchaseOrders.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('purchaseOrders.qty')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) =>
                      patchLine(i, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('purchaseOrders.unitPrice')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={l.unitPriceDZD}
                    onChange={(e) =>
                      patchLine(i, { unitPriceDZD: Math.max(0, Number(e.target.value)) })
                    }
                  />
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={lines.length === 1}
                  >
                    {t('purchaseOrders.removeLine')}
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLines((prev) => [...prev, { productId: '', quantity: 1, unitPriceDZD: 0 }])
              }
            >
              {t('purchaseOrders.addLine')}
            </Button>
          </div>

          <div className="flex items-center justify-end gap-3 text-sm">
            <span className="text-muted-foreground">{t('purchaseOrders.total')}:</span>
            <span className="font-mono font-semibold">
              {subtotal.toLocaleString()} {t('catalog.currency')}
            </span>
          </div>

          <DialogFooter className="gap-2">
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

function EditOrderDialog({
  order,
  onClose,
  onSaved,
}: {
  order: PurchaseOrderDetail
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState(order.supplierId ?? '')
  const [reference, setReference] = useState(order.reference ?? '')
  const [notes, setNotes] = useState(order.notes ?? '')
  const [orderedAt, setOrderedAt] = useState(
    order.orderedAt ? new Date(order.orderedAt).toISOString().slice(0, 10) : '',
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void api.suppliers({ limit: 200 }).then((r) => setSuppliers(r.items))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updatePurchaseOrder(order.id, {
        supplierId: supplierId || null,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        orderedAt: orderedAt ? new Date(orderedAt + 'T00:00:00').toISOString() : undefined,
      })
      toast(t('purchaseOrders.saved'), 'success')
      await onSaved()
      onClose()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'ORDER_LOCKED'
          ? t('purchaseOrders.locked')
          : t('purchaseOrders.saveError'),
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('purchaseOrders.edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('purchaseOrders.supplier')}</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder={t('purchaseOrders.noSupplier')} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('purchaseOrders.reference')}</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('purchaseOrders.orderedAt')}</Label>
              <Input type="date" value={orderedAt} onChange={(e) => setOrderedAt(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('suppliers.form.notes')}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700"
            />
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

function ReceiveOrderDialog({
  order,
  onClose,
  onSaved,
}: {
  order: PurchaseOrderDetail
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.lines
        .filter((l) => l.receivedQuantity < l.quantity)
        .map((l) => [l.id, String(l.quantity - l.receivedQuantity)]),
    ),
  )
  const [lots, setLots] = useState<Record<string, { batch: string; expiry: string }>>(() =>
    Object.fromEntries(
      order.lines
        .filter((l) => l.receivedQuantity < l.quantity)
        .map((l) => [l.id, { batch: '', expiry: '' }]),
    ),
  )
  const [saving, setSaving] = useState(false)

  const pending = order.lines.filter((l) => l.receivedQuantity < l.quantity)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const lines = pending
      .map((l) => {
        const lot = lots[l.id] ?? { batch: '', expiry: '' }
        return {
          purchaseOrderLineId: l.id,
          quantity: Number(amounts[l.id]),
          batch: lot.batch.trim() || undefined,
          expiryDate: lot.expiry ? new Date(lot.expiry).toISOString() : undefined,
        }
      })
      .filter((l) => Number.isFinite(l.quantity) && l.quantity >= 1)
    if (lines.length === 0) return
    setSaving(true)
    try {
      await api.receivePurchaseOrder(order.id, { lines })
      await onSaved()
      onClose()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'RECEIPT_EXCEEDS_QUANTITY'
          ? t('purchaseOrders.receiveError')
          : t('purchaseOrders.receiveError'),
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('purchaseOrders.receiving')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          {pending.map((l) => {
            const remaining = l.quantity - l.receivedQuantity
            return (
              <div
                key={l.id}
                className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
              >
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {l.productName}
                  <span className="ms-2 text-xs text-muted-foreground">
                    {t('purchaseOrders.received')} {l.receivedQuantity}/{l.quantity}
                  </span>
                </span>
                <div className="grid grid-cols-3 items-end gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('purchaseOrders.receiveQty')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={remaining}
                      value={amounts[l.id]}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [l.id]: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('stock.batch')}</Label>
                    <Input
                      value={lots[l.id]?.batch ?? ''}
                      maxLength={60}
                      onChange={(e) =>
                        setLots((prev) => ({
                          ...prev,
                          [l.id]: { batch: e.target.value, expiry: prev[l.id]?.expiry ?? '' },
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('stock.expiry')}</Label>
                    <Input
                      type="date"
                      value={lots[l.id]?.expiry ?? ''}
                      onChange={(e) =>
                        setLots((prev) => ({
                          ...prev,
                          [l.id]: { expiry: e.target.value, batch: prev[l.id]?.batch ?? '' },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )
          })}
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
