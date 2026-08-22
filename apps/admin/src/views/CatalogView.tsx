import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Service, ServiceCategory, ServiceInput } from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { api } from '../lib/api'
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

const CATEGORY_KEY: Record<ServiceCategory, MessageKey> = {
  CONSULTATION: 'catalog.cat.consultation',
  SURGERY: 'catalog.cat.surgery',
  CARE: 'catalog.cat.care',
  HYGIENE: 'catalog.cat.hygiene',
  PROSTHETIC_ORTHO: 'catalog.cat.prostheticOrtho',
  IMAGING: 'catalog.cat.imaging',
}

const CATEGORIES = Object.keys(CATEGORY_KEY) as ServiceCategory[]

export function CatalogView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<Service[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState<ServiceCategory | undefined>(undefined)
  const [archived, setArchived] = useState<'exclude' | 'only' | undefined>(undefined)
  const [editing, setEditing] = useState<Service | 'new' | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .services({ q: debouncedQ, category, archived, limit: 100 })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch(() => toast(t('catalog.saveError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, category, archived, t, toast])

  async function refetch() {
    const r = await api.services({ q: debouncedQ, category, archived, limit: 100 })
    setItems(r.items)
    setTotal(r.total)
  }

  async function toggleArchived(s: Service) {
    try {
      if (s.archivedAt) {
        await api.restoreService(s.id)
        toast(t('catalog.restored'), 'success')
      } else {
        await api.archiveService(s.id)
        toast(t('catalog.archived'), 'success')
      }
      await refetch()
    } catch {
      toast(t(s.archivedAt ? 'catalog.restoredError' : 'catalog.archivedError'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('catalog.search')}
          placeholder={t('catalog.search')}
          value={q}
          onChange={setQ}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
            {t('common.filter.category')}
          </span>
          <Select
            value={category ?? ''}
            onValueChange={(v) => setCategory(v ? (v as ServiceCategory) : undefined)}
          >
            <SelectTrigger className="w-fit text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('catalog.all')}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(CATEGORY_KEY[c])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
            {t('common.filter.archived')}
          </span>
          <Select
            value={archived ?? ''}
            onValueChange={(v) => setArchived(v ? (v as 'exclude' | 'only') : undefined)}
          >
            <SelectTrigger className="w-fit text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('catalog.active')}</SelectItem>
              <SelectItem value="only">{t('catalog.archivedOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">
          {total} {t('patients.total')}
        </span>
        {canEdit && (
          <div className="ms-auto">
            <Button onClick={() => setEditing('new')} size="sm">
              {t('catalog.add')}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('catalog.name')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('catalog.category')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('catalog.price')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('catalog.duration')}</th>
              <th className="px-4 py-2 text-center font-medium">{t('catalog.coverage')}</th>
              {canEdit && (
                <th className="px-4 py-2 text-end font-medium">{t('patients.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-6 text-center text-neutral-500">
                  …
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-6 text-center text-neutral-500">
                  {t('catalog.empty')}
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {s.name}
                    {s.archivedAt && (
                      <span className="ms-2 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {t('catalog.archivedOnly')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {t(CATEGORY_KEY[s.category])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end font-mono text-neutral-900 dark:text-neutral-100">
                    {s.priceDZD.toLocaleString()} {t('catalog.currency')}
                  </td>
                  <td className="px-4 py-3 text-end text-neutral-600 dark:text-neutral-300">
                    {s.durationMinutes} {t('catalog.minutes')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.reimbursablePct > 0 ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {s.reimbursablePct}%
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t('catalog.notCovered')}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                          {t('catalog.edit')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void toggleArchived(s)}>
                          {s.archivedAt ? t('catalog.restore') : t('catalog.archive')}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ServiceForm
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await refetch()
          }}
        />
      )}
    </div>
  )
}

function ServiceForm({
  service,
  onClose,
  onSaved,
}: {
  service: Service | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [name, setName] = useState(service?.name ?? '')
  const [category, setCategory] = useState<ServiceCategory>(service?.category ?? 'CONSULTATION')
  const [price, setPrice] = useState(service ? String(service.priceDZD) : '')
  const [duration, setDuration] = useState(service ? String(service.durationMinutes) : '')
  const [coverage, setCoverage] = useState(service ? String(service.reimbursablePct) : '0')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const input: ServiceInput = {
      name: name.trim(),
      category,
      priceDZD: Number(price),
      durationMinutes: Number(duration),
      reimbursablePct: Number(coverage),
    }
    if (!input.name || Number.isNaN(input.priceDZD) || Number.isNaN(input.durationMinutes)) return
    setSaving(true)
    try {
      if (service) {
        await api.updateService(service.id, input)
        toast(t('catalog.saved'), 'success')
      } else {
        await api.createService(input)
        toast(t('catalog.added'), 'success')
      }
      await onSaved()
    } catch {
      toast(t(service ? 'catalog.saveError' : 'catalog.addError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? t('catalog.edit') : t('catalog.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('catalog.form.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('catalog.form.category')}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ServiceCategory)}>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('catalog.form.price')}</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('catalog.form.duration')}</Label>
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('catalog.form.coverage')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
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
