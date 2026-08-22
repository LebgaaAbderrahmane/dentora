import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Supplier, SupplierInput } from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
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

export function SuppliersView({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [archived, setArchived] = useState<'exclude' | 'only' | undefined>(undefined)
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .suppliers({ q: debouncedQ, archived, limit: 100 })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch(() => toast(t('suppliers.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, archived, t, toast])

  async function refetch() {
    const r = await api.suppliers({ q: debouncedQ, archived, limit: 100 })
    setItems(r.items)
    setTotal(r.total)
  }

  async function toggleArchived(s: Supplier) {
    try {
      if (s.archivedAt) {
        await api.restoreSupplier(s.id)
        toast(t('suppliers.restored'), 'success')
      } else {
        await api.archiveSupplier(s.id)
        toast(t('suppliers.archived'), 'success')
      }
      await refetch()
    } catch {
      toast(t(s.archivedAt ? 'suppliers.restoredError' : 'suppliers.archivedError'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('suppliers.search')}
          placeholder={t('suppliers.search')}
          value={q}
          onChange={setQ}
        />
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
            <SelectItem value="">{t('suppliers.active')}</SelectItem>
            <SelectItem value="only">{t('suppliers.archivedOnly')}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {total} {t('patients.total')}
        </span>
        {canEdit && (
          <div className="ms-auto">
            <Button onClick={() => setEditing('new')} size="sm">
              {t('suppliers.add')}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('suppliers.name')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('suppliers.phone')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('suppliers.email')}</th>
              {canEdit && (
                <th className="px-4 py-2 text-end font-medium">{t('patients.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-4 py-6 text-center text-neutral-500">
                  …
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-4 py-6 text-center text-neutral-500">
                  {t('suppliers.empty')}
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                    s.archivedAt ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {s.name}
                    {s.archivedAt && (
                      <span className="ms-2 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {t('suppliers.archivedOnly')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {s.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {s.email || '—'}
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
        <SupplierForm
          supplier={editing === 'new' ? null : editing}
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

function SupplierForm({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [address, setAddress] = useState(supplier?.address ?? '')
  const [notes, setNotes] = useState(supplier?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const input: SupplierInput = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    if (!input.name) return
    setSaving(true)
    try {
      if (supplier) {
        await api.updateSupplier(supplier.id, input)
        toast(t('suppliers.saved'), 'success')
      } else {
        await api.createSupplier(input)
        toast(t('suppliers.added'), 'success')
      }
      await onSaved()
    } catch (err) {
      toast(
        err instanceof ApiError && err.message === 'NAME_TAKEN'
          ? t('suppliers.nameTaken')
          : t(supplier ? 'suppliers.saveError' : 'suppliers.addError'),
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
          <DialogTitle>{supplier ? t('suppliers.edit') : t('suppliers.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('suppliers.form.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('suppliers.form.phone')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('suppliers.form.email')}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('suppliers.form.address')}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('suppliers.form.notes')}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
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
