import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { Product, ProductUnit, TreatmentConsumption } from '@dentora/contracts'
import { useI18n, formatDateTime } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import type { MessageKey } from '@dentora/i18n'
import { api, ApiError } from '../lib/api'
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

const UNIT_KEY: Record<ProductUnit, MessageKey> = {
  UNIT: 'products.unit.unit',
  BOX: 'products.unit.box',
  PACK: 'products.unit.pack',
  BOTTLE: 'products.unit.bottle',
  JAR: 'products.unit.jar',
  SYRINGE: 'products.unit.syringe',
  SET: 'products.unit.set',
  KIT: 'products.unit.kit',
}

export function ConsumptionModal({
  appointmentId,
  patientName,
  onClose,
  onSaved,
}: {
  appointmentId: string
  patientName: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [consumptions, setConsumptions] = useState<TreatmentConsumption[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [batch, setBatch] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const activeProducts = useMemo(() => products.filter((p) => !p.archivedAt), [products])
  const selected = activeProducts.find((p) => p.id === productId)

  useEffect(() => {
    Promise.all([api.products({ limit: 200 }), api.consumptions({ appointmentId, limit: 100 })])
      .then(([r, c]) => {
        setProducts(r.items)
        setConsumptions(c.items)
      })
      .catch((e) => {
        toast(e instanceof ApiError ? e.message : String(e), 'error')
      })
  }, [appointmentId, toast])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!productId || !quantity) return
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) return
    setSaving(true)
    try {
      await api.createConsumption(appointmentId, {
        productId,
        quantity: qty,
        ...(batch.trim() ? { batch: batch.trim() } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      })
      toast(t('consumption.saved'), 'success')
      setProductId('')
      setQuantity('')
      setBatch('')
      setReason('')
      onSaved()
      const c = await api.consumptions({ appointmentId, limit: 100 })
      setConsumptions(c.items)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('consumption.record')} — {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
          {consumptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('consumption.appointmentEmpty')}</p>
          ) : (
            consumptions.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium text-foreground">{c.productName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatDateTime(c.consumedAt, locale)}
                    {c.createdByName ? ` · ${t('consumption.by')} ${c.createdByName}` : ''}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {c.quantity} {t(UNIT_KEY[c.unit])}
                  {c.batch ? ` · #${c.batch}` : ''}
                </span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cons-product">{t('consumption.product')}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="cons-product">
                <SelectValue placeholder={t('consumption.product')} />
              </SelectTrigger>
              <SelectContent>
                {activeProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {t('consumption.stock')}: {p.quantityOnHand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-xs text-muted-foreground">
                {t('consumption.stock')}: {selected.quantityOnHand} {t(UNIT_KEY[selected.unit])}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cons-qty">{t('consumption.quantity')}</Label>
              <Input
                id="cons-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cons-batch">{t('consumption.batch')}</Label>
              <Input
                id="cons-batch"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder={t('consumption.batch')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cons-reason">{t('consumption.reason')}</Label>
            <Input
              id="cons-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('consumption.reason')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button type="submit" disabled={saving || !selected}>
              {t('consumption.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
