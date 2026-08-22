import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Expense, ExpenseCategory } from '@dentora/contracts'
import { EXPENSE_CATEGORIES } from '@dentora/contracts'
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

const CATEGORY_KEY: Record<ExpenseCategory, MessageKey> = {
  SALARY: 'expenses.cat.salary',
  RENT: 'expenses.cat.rent',
  SUPPLIES: 'expenses.cat.supplies',
  EQUIPMENT: 'expenses.cat.equipment',
  UTILITIES: 'expenses.cat.utilities',
  MAINTENANCE: 'expenses.cat.maintenance',
  MARKETING: 'expenses.cat.marketing',
  TAXES: 'expenses.cat.taxes',
  OTHER: 'expenses.cat.other',
}

export function ExpensesView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [items, setItems] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | undefined>(undefined)
  const [voided, setVoided] = useState<'exclude' | 'only' | undefined>(undefined)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .expenses({
        q: debouncedQ,
        category,
        voided,
        from: from || undefined,
        to: to || undefined,
        limit: 100,
      })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch(() => toast(t('expenses.loadError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, category, voided, from, to, t, toast])

  async function refetch() {
    const r = await api.expenses({
      q: debouncedQ,
      category,
      voided,
      from: from || undefined,
      to: to || undefined,
      limit: 100,
    })
    setItems(r.items)
    setTotal(r.total)
  }

  async function voidExpense(exp: Expense) {
    try {
      await api.voidExpense(exp.id)
      toast(t('expenses.voided'), 'success')
      await refetch()
    } catch {
      toast(t('expenses.voidError'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          aria-label={t('expenses.search')}
          placeholder={t('expenses.search')}
          value={q}
          onChange={setQ}
        />
        <Select
          value={category ?? ''}
          onValueChange={(v) => setCategory(v ? (v as ExpenseCategory) : undefined)}
        >
          <SelectTrigger className="w-fit text-xs">
            <span className="text-muted-foreground">
              {t('common.filter.category')}&nbsp;·&nbsp;
            </span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('expenses.allCategories')}</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(CATEGORY_KEY[c])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={voided ?? ''}
          onValueChange={(v) => setVoided(v ? (v as 'exclude' | 'only') : undefined)}
        >
          <SelectTrigger className="w-fit text-xs">
            <span className="text-muted-foreground">{t('common.filter.voided')}&nbsp;·&nbsp;</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('expenses.active')}</SelectItem>
            <SelectItem value="only">{t('expenses.voidedOnly')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            aria-label={t('expenses.from')}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[140px]"
          />
          <span className="text-xs text-neutral-400">→</span>
          <Input
            aria-label={t('expenses.to')}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {total} {t('patients.total')}
        </span>
        <div className="ms-auto">
          <Button onClick={() => setCreating(true)} size="sm">
            {t('expenses.add')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('expenses.date')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('expenses.category')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('expenses.description')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('expenses.amount')}</th>
              <th className="px-4 py-2 text-end font-medium" />
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
                  {t('expenses.empty')}
                </td>
              </tr>
            ) : (
              items.map((exp) => (
                <tr
                  key={exp.id}
                  className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                    exp.voidedAt ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {new Date(exp.incurredAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {t(CATEGORY_KEY[exp.category])}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {exp.description}
                  </td>
                  <td className="px-4 py-3 text-end font-mono text-neutral-900 dark:text-neutral-100">
                    {exp.amountDZD.toLocaleString()} {t('catalog.currency')}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(exp)}>
                        {t('catalog.edit')}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => void voidExpense(exp)}>
                        {t('expenses.void')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <ExpenseForm
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            toast(t('expenses.saved'), 'success')
            await refetch()
          }}
        />
      )}
      {editing && (
        <ExpenseForm
          expense={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            toast(t('expenses.saved'), 'success')
            await refetch()
          }}
        />
      )}
    </div>
  )
}

function todayInput() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function ExpenseForm({
  expense,
  onClose,
  onSaved,
}: {
  expense?: Expense
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [category, setCategory] = useState<ExpenseCategory | null>(expense?.category ?? null)
  const [amountDZD, setAmountDZD] = useState<string>(expense ? String(expense.amountDZD) : '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [incurredAt, setIncurredAt] = useState(
    expense ? expense.incurredAt.slice(0, 10) : todayInput(),
  )
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amount = Number(amountDZD)
    if (!category || !Number.isInteger(amount) || amount <= 0 || !description.trim()) return
    setSaving(true)
    try {
      const date = new Date(`${incurredAt}T12:00:00`).toISOString()
      if (expense) {
        await api.updateExpense(expense.id, {
          category,
          amountDZD: amount,
          description: description.trim(),
          incurredAt: date,
        })
      } else {
        await api.createExpense({
          category,
          amountDZD: amount,
          description: description.trim(),
          incurredAt: date,
        })
      }
      await onSaved()
    } catch (err) {
      toast(err instanceof ApiError ? t('expenses.saveError') : t('expenses.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? t('expenses.edit') : t('expenses.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('expenses.form.category')}</Label>
            <Select value={category ?? ''} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger>
                <SelectValue placeholder={t('expenses.form.category')} />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(CATEGORY_KEY[c])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('expenses.form.amount')}</Label>
            <Input
              type="number"
              min={1}
              value={amountDZD}
              onChange={(e) => setAmountDZD(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('expenses.form.description')}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('expenses.form.date')}</Label>
            <Input type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('appointments.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={saving || !category || amountDZD === '' || Number(amountDZD) <= 0}
            >
              {t('appointments.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
