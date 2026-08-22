import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  Product,
  ProductCategory,
  ProductInput,
  ProductUnit,
  StockAdjustInput,
  StockEntry,
  StockLedgerType,
  StockOutInput,
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

const CATEGORY_KEY: Record<ProductCategory, MessageKey> = {
  ANESTHETICS: 'products.cat.anesthetics',
  DISPOSABLES: 'products.cat.disposables',
  MATERIALS: 'products.cat.materials',
  INSTRUMENTS: 'products.cat.instruments',
  EQUIPMENT: 'products.cat.equipment',
  MEDICATIONS: 'products.cat.medications',
  LABORATORY: 'products.cat.laboratory',
  STATIONERY: 'products.cat.stationery',
  OTHER: 'products.cat.other',
}

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

const CATEGORIES = Object.keys(CATEGORY_KEY) as ProductCategory[]
const UNITS = Object.keys(UNIT_KEY) as ProductUnit[]

const STOCK_TYPE_KEY: Record<StockLedgerType, MessageKey> = {
  OPENING: 'stock.types.opening',
  IN: 'stock.types.in',
  OUT: 'stock.types.out',
  ADJUST: 'stock.types.adjust',
}

export function ProductsView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState<ProductCategory | undefined>(undefined)
  const [archived, setArchived] = useState<'exclude' | 'only' | undefined>(undefined)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [stockFor, setStockFor] = useState<Product | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .products({ q: debouncedQ, category, archived, limit: 100 })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch(() => toast(t('products.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, category, archived, t, toast])

  async function refetch() {
    const r = await api.products({ q: debouncedQ, category, archived, limit: 100 })
    setItems(r.items)
    setTotal(r.total)
  }

  async function toggleArchived(p: Product) {
    try {
      if (p.archivedAt) {
        await api.restoreProduct(p.id)
        toast(t('products.restored'), 'success')
      } else {
        await api.archiveProduct(p.id)
        toast(t('products.archived'), 'success')
      }
      await refetch()
    } catch {
      toast(t(p.archivedAt ? 'products.restoredError' : 'products.archivedError'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('products.search')}
          placeholder={t('products.search')}
          value={q}
          onChange={setQ}
        />
        <Select
          value={category ?? ''}
          onValueChange={(v) => setCategory(v ? (v as ProductCategory) : undefined)}
        >
          <SelectTrigger className="w-fit text-xs">
            <span className="text-muted-foreground">
              {t('common.filter.category')}&nbsp;·&nbsp;
            </span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('products.all')}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(CATEGORY_KEY[c])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={archived ?? ''}
          onValueChange={(v) => setArchived(v ? (v as 'exclude' | 'only') : undefined)}
        >
          <SelectTrigger className="w-fit text-xs">
            <span className="text-muted-foreground">
              {t('common.filter.archived')}&nbsp;·&nbsp;
            </span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('products.active')}</SelectItem>
            <SelectItem value="only">{t('products.archivedOnly')}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {total} {t('patients.total')}
        </span>
        {canEdit && (
          <div className="ms-auto">
            <Button onClick={() => setEditing('new')} size="sm">
              {t('products.add')}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('products.name')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('products.category')}</th>
              <th className="px-4 py-2 text-center font-medium">{t('products.stock')}</th>
              <th className="px-4 py-2 text-center font-medium">{t('products.reorder')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('patients.actions')}</th>
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
                  {t('products.empty')}
                </td>
              </tr>
            ) : (
              items.map((p) => {
                const low = !p.archivedAt && p.quantityOnHand <= p.reorderLevel
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                      p.archivedAt ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      {p.name}
                      {p.code && (
                        <span className="ms-2 font-mono text-xs text-neutral-400">{p.code}</span>
                      )}
                      {p.archivedAt && (
                        <span className="ms-2 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {t('products.archivedOnly')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {t(CATEGORY_KEY[p.category])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">
                        {p.quantityOnHand}
                      </span>{' '}
                      <span className="text-xs text-neutral-400">{t(UNIT_KEY[p.unit])}</span>
                      {low && (
                        <span className="ms-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {t('products.low')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-neutral-500 dark:text-neutral-400">
                      {p.reorderLevel}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={Boolean(p.archivedAt)}
                          onClick={() => setStockFor(p)}
                        >
                          {t('stock.title')}
                        </Button>
                        {canEdit && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                              {t('catalog.edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void toggleArchived(p)}
                            >
                              {p.archivedAt ? t('catalog.restore') : t('catalog.archive')}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await refetch()
          }}
        />
      )}

      {stockFor && (
        <StockDrawer
          product={stockFor}
          canEdit={canEdit}
          onClose={() => setStockFor(null)}
          onMoved={() => refetch()}
        />
      )}
    </div>
  )
}

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [name, setName] = useState(product?.name ?? '')
  const [code, setCode] = useState(product?.code ?? '')
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? 'DISPOSABLES')
  const [unit, setUnit] = useState<ProductUnit>(product?.unit ?? 'UNIT')
  const [reorderLevel, setReorderLevel] = useState(product ? String(product.reorderLevel) : '0')
  const [quantity, setQuantity] = useState(product ? String(product.quantityOnHand) : '0')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const input: ProductInput = {
      name: name.trim(),
      code: code.trim() || undefined,
      category,
      unit,
      reorderLevel: Number(reorderLevel),
      quantityOnHand: Number(quantity),
    }
    if (!input.name) return
    setSaving(true)
    try {
      if (product) {
        await api.updateProduct(product.id, input)
        toast(t('products.saved'), 'success')
      } else {
        await api.createProduct(input)
        toast(t('products.added'), 'success')
      }
      await onSaved()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'CODE_TAKEN'
          ? t('products.codeTaken')
          : t(product ? 'products.saveError' : 'products.addError'),
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
          <DialogTitle>{product ? t('products.edit') : t('products.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('products.form.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('products.form.code')}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('products.form.unit')}</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as ProductUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(UNIT_KEY[u])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('products.form.category')}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(CATEGORY_KEY[c])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('products.form.reorder')}</Label>
              <Input
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('products.form.quantity')}</Label>
              <Input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
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

function StockDrawer({
  product,
  canEdit,
  onClose,
  onMoved,
}: {
  product: Product
  canEdit: boolean
  onClose: () => void
  onMoved: () => void
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [entries, setEntries] = useState<StockEntry[]>([])
  const [onHand, setOnHand] = useState(product.quantityOnHand)
  const [mode, setMode] = useState<null | 'out' | 'adjust'>(null)

  async function load() {
    try {
      const r = await api.stock({ productId: product.id, limit: 100 })
      setEntries(r.items)
      setOnHand(() => {
        return r.items.reduce(
          (sum, e) =>
            sum + (e.type === 'OUT' ? -e.quantity : e.type === 'ADJUST' ? e.quantity : e.quantity),
          product.quantityOnHand,
        )
      })
    } catch {
      toast(t('stock.loadError'), 'error')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  async function handleMoved() {
    await load()
    setMode(null)
    toast(t('stock.moved'), 'success')
    onMoved()
  }

  function handleMoveError(err: unknown) {
    toast(
      err instanceof ApiError && err.message === 'INSUFFICIENT_STOCK'
        ? t('stock.insufficient')
        : t('stock.moveError'),
      'error',
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {product.name}
            <span className="ms-2 font-mono text-xs text-muted-foreground">
              {t('products.stock')}: {onHand} {t(UNIT_KEY[product.unit])}
            </span>
          </DialogTitle>
        </DialogHeader>

        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setMode('out')}>
              {t('stock.out.title')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('adjust')}>
              {t('stock.adjust.title')}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t('stock.date')}</th>
                <th className="px-4 py-2 text-center font-medium">{t('stock.type')}</th>
                <th className="px-4 py-2 text-center font-medium">{t('stock.quantity')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('stock.batch')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('stock.expiry')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('stock.reason')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('stock.source')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                    {t('stock.empty')}
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const sign =
                    e.type === 'OUT' ? -1 : e.type === 'ADJUST' && e.quantity < 0 ? -1 : 1
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleDateString()}{' '}
                        {new Date(e.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                          {t(STOCK_TYPE_KEY[e.type])}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-center font-mono ${
                          sign < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {sign < 0 ? `−${e.quantity}` : `+${e.quantity}`}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {e.batch ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {e.expiryDate ? new Date(e.expiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {e.reason ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {e.type === 'OPENING'
                          ? t('stock.source.opening')
                          : e.type === 'IN'
                            ? t('stock.source.receipt')
                            : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {mode === 'out' && (
          <StockOutModal
            product={product}
            onClose={() => setMode(null)}
            onSaved={handleMoved}
            onError={handleMoveError}
          />
        )}
        {mode === 'adjust' && (
          <StockAdjustModal
            product={product}
            onClose={() => setMode(null)}
            onSaved={handleMoved}
            onError={handleMoveError}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function StockOutModal({
  product,
  onClose,
  onSaved,
  onError,
}: {
  product: Product
  onClose: () => void
  onSaved: () => void | Promise<void>
  onError: (err: unknown) => void
}) {
  const { t } = useI18n()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const input: StockOutInput = { quantity: Number(quantity), reason: reason.trim() }
    if (!input.reason || !(input.quantity > 0)) return
    setSaving(true)
    try {
      await api.stockOut(product.id, input)
      await onSaved()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('stock.out.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{product.name}</Label>
            <span className="text-xs text-muted-foreground">
              {t('products.stock')}: {product.quantityOnHand} {t(UNIT_KEY[product.unit])}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('stock.out.quantity')}</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('stock.out.reason')}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
            />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('stock.out.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StockAdjustModal({
  product,
  onClose,
  onSaved,
  onError,
}: {
  product: Product
  onClose: () => void
  onSaved: () => void | Promise<void>
  onError: (err: unknown) => void
}) {
  const { t } = useI18n()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [batch, setBatch] = useState('')
  const [expiry, setExpiry] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const input: StockAdjustInput = {
      quantity: Number(quantity),
      reason: reason.trim(),
      batch: batch.trim() || undefined,
      expiryDate: expiry ? new Date(expiry).toISOString() : undefined,
    }
    if (!input.reason || input.quantity === 0 || Number.isNaN(input.quantity)) return
    setSaving(true)
    try {
      await api.stockAdjust(product.id, input)
      await onSaved()
    } catch (err) {
      onError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('stock.adjust.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{product.name}</Label>
            <span className="text-xs text-muted-foreground">
              {t('products.stock')}: {product.quantityOnHand} {t(UNIT_KEY[product.unit])}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('stock.adjust.quantity')}</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('stock.adjust.reason')}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('stock.adjust.batch')}</Label>
              <Input value={batch} onChange={(e) => setBatch(e.target.value)} maxLength={60} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('stock.adjust.expiry')}</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('stock.adjust.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
