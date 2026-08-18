import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type {
  Product,
  SterilizationLog,
  SterilizationMethod,
  SterilizationStatus,
} from '@dentora/contracts'
import { useI18n } from '@dentora/i18n'
import { useToast } from '@dentora/ui'
import type { MessageKey } from '@dentora/i18n'
import { api, ApiError } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const METHOD_KEY: Record<SterilizationMethod, MessageKey> = {
  AUTOCLAVE: 'sterilization.method.autoclave',
  CHEMICAL: 'sterilization.method.chemical',
  UV: 'sterilization.method.uv',
  OTHER: 'sterilization.method.other',
}

const STATUS_KEY: Record<SterilizationStatus, MessageKey> = {
  IN_PROGRESS: 'sterilization.status.inProgress',
  COMPLETED: 'sterilization.status.completed',
  FAILED: 'sterilization.status.failed',
  CANCELLED: 'sterilization.status.cancelled',
}

const STATUS_BADGE: Record<SterilizationStatus, string> = {
  IN_PROGRESS:
    'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  COMPLETED: 'border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  FAILED: 'border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  CANCELLED:
    'border-neutral-400/30 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
}

export function SterilizationsView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [logs, setLogs] = useState<SterilizationLog[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<SterilizationStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  async function load() {
    setLoading(true)
    try {
      const r = await api.sterilizations({
        ...(status !== 'all' ? { status } : {}),
        limit: 200,
      })
      setLogs(r.items)
      setTotal(r.total)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    api
      .products({ limit: 200 })
      .then((r) => setProducts(r.items))
      .catch(() => undefined)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function transition(id: string, nextStatus: SterilizationStatus) {
    try {
      await api.updateSterilization(id, { status: nextStatus })
      await load()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>{t('sterilization.title')}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as SterilizationStatus | 'all')}
            >
              <SelectTrigger className="w-fit text-xs">
                <SelectValue placeholder={t('sterilization.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sterilization.all')}</SelectItem>
                {(Object.keys(STATUS_KEY) as SterilizationStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(STATUS_KEY[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setCreating(true)}>
              {t('sterilization.new')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !logs.length && <p className="text-sm text-muted-foreground">…</p>}
          {!loading && logs.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('sterilization.empty')}</p>
          )}
          {logs.map((l) => (
            <LogRow key={l.id} log={l} onTransition={(s) => void transition(l.id, s)} />
          ))}
          {total > logs.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              {total} {t('audit.events')}
            </p>
          )}
        </CardContent>
      </Card>

      {creating && (
        <SterilizationDialog
          products={products}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function LogRow({
  log,
  onTransition,
}: {
  log: SterilizationLog
  onTransition: (status: SterilizationStatus) => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-2.5 text-sm last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{log.instrument}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[log.status]}`}
          >
            {t(STATUS_KEY[log.status])}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {t(METHOD_KEY[log.method])}
          {log.cycle ? ` · ${t('sterilization.cycle')} ${log.cycle}` : ''}
          {log.operatorName ? ` · ${log.operatorName}` : ''}
          {log.notes ? ` · ${log.notes}` : ''}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span>
          {t('sterilization.startedAt')} {new Date(log.startedAt).toLocaleString()}
        </span>
        {log.completedAt && (
          <span>
            {t('sterilization.completedAt')} {new Date(log.completedAt).toLocaleString()}
          </span>
        )}
        {log.status === 'IN_PROGRESS' && (
          <span className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTransition('COMPLETED')}
              aria-label={t('sterilization.complete')}
            >
              {t('sterilization.complete')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTransition('FAILED')}>
              {t('sterilization.fail')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onTransition('CANCELLED')}>
              {t('sterilization.cancelCycle')}
            </Button>
          </span>
        )}
      </div>
    </div>
  )
}

function SterilizationDialog({
  products,
  onClose,
  onSaved,
}: {
  products: Product[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [productId, setProductId] = useState('')
  const [instrument, setInstrument] = useState('')
  const [method, setMethod] = useState<SterilizationMethod>('AUTOCLAVE')
  const [cycle, setCycle] = useState('')
  const [notes, setNotes] = useState('')

  const activeProducts = useMemo(
    () =>
      products.filter((p) => !p.archivedAt && ['INSTRUMENTS', 'EQUIPMENT'].includes(p.category)),
    [products],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!instrument.trim()) return
    setSaving(true)
    try {
      await api.createSterilization({
        ...(productId ? { productId } : {}),
        instrument: instrument.trim(),
        method,
        ...(cycle ? { cycle: Number(cycle) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      toast(t('sterilization.saved'), 'success')
      onSaved()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('sterilization.new')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ster-product">{t('sterilization.product')}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="ster-product">
                <SelectValue placeholder={t('sterilization.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('sterilization.all')}</SelectItem>
                {activeProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ster-instrument">{t('sterilization.instrument')}</Label>
            <Input
              id="ster-instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              required
              placeholder={t('sterilization.instrument')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ster-method">{t('sterilization.method')}</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as SterilizationMethod)}>
                <SelectTrigger id="ster-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(METHOD_KEY) as SterilizationMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(METHOD_KEY[m])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ster-cycle">{t('sterilization.cycle')}</Label>
              <Input
                id="ster-cycle"
                type="number"
                min={1}
                max={9999}
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ster-notes">{t('sterilization.notes')}</Label>
            <Input
              id="ster-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('sterilization.notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('sterilization.saved')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
