import { useEffect, useState } from 'react'
import type { FinanceReport } from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const METHOD_KEY: Record<'CASH' | 'CHEQUE' | 'CARD' | 'TRANSFER', MessageKey> = {
  CASH: 'payments.method.cash',
  CHEQUE: 'payments.method.cheque',
  CARD: 'payments.method.card',
  TRANSFER: 'payments.method.transfer',
}

const CATEGORY_KEY: Record<string, MessageKey> = {
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

const DAY_MS = 86_400_000

function localMidnight(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

type Preset = 'today' | 'month' | 'lastMonth' | 'last30'

function presetWindow(preset: Preset): { from: Date; to: Date } {
  const now = new Date()
  const today = localMidnight(now)
  switch (preset) {
    case 'today':
      return { from: today, to: new Date(today.getTime() + DAY_MS) }
    case 'month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      }
    case 'lastMonth':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      }
    case 'last30':
      return {
        from: new Date(today.getTime() - 29 * DAY_MS),
        to: new Date(today.getTime() + DAY_MS),
      }
  }
}

export function FinanceView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<Preset>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const window = customFrom || customTo ? null : presetWindow(preset)
    const params =
      window !== null
        ? { from: window.from.toISOString(), to: window.to.toISOString() }
        : {
            from: customFrom
              ? localMidnight(new Date(`${customFrom}T00:00:00`)).toISOString()
              : undefined,
            to: customTo
              ? new Date(
                  localMidnight(new Date(`${customTo}T00:00:00`)).getTime() + DAY_MS,
                ).toISOString()
              : undefined,
          }
    api
      .financeReport(params)
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .catch(() => {
        if (!cancelled) toast(t('finance.loadError'), 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [preset, customFrom, customTo, t, toast])

  const maxMethod = report ? Math.max(...Object.values(report.revenue.byMethod), 1) : 1
  const maxCategory = report ? Math.max(...Object.values(report.expenses.byCategory), 1) : 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['today', 'month', 'lastMonth', 'last30'] as Preset[]).map((p) => (
          <Button
            key={p}
            variant={preset === p && !customFrom && !customTo ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setPreset(p)
              setCustomFrom('')
              setCustomTo('')
            }}
          >
            {t(`finance.preset.${p}`)}
          </Button>
        ))}
        <div className="ms-1 flex items-center gap-2">
          <Input
            aria-label={t('finance.from')}
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value)
              setPreset('today')
            }}
            className="w-[140px]"
          />
          <span className="text-xs text-neutral-400">→</span>
          <Input
            aria-label={t('finance.to')}
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value)
              setPreset('today')
            }}
            className="w-[140px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">…</div>
      ) : !report ? null : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {t('finance.revenue')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {report.revenue.netDZD.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-neutral-400">
                    {t('catalog.currency')}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('finance.receipts')} {report.revenue.receiptsDZD.toLocaleString()} ·{' '}
                  {t('finance.refunds')} {report.revenue.refundsDZD.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {t('finance.expenses')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {report.expenses.totalDZD.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-neutral-400">
                    {t('catalog.currency')}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {report.expenses.count} {t('finance.count')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {t('finance.net')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-semibold tracking-tight ${
                    report.netDZD >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {report.netDZD.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-neutral-400">
                    {t('catalog.currency')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t('finance.byMethod')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {(['CASH', 'CHEQUE', 'CARD', 'TRANSFER'] as const).map((m) => (
                  <div key={m} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {t(METHOD_KEY[m])}
                      </span>
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">
                        {report.revenue.byMethod[m].toLocaleString()} {t('catalog.currency')}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(report.revenue.byMethod[m] / maxMethod) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t('finance.byCategory')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {Object.entries(report.expenses.byCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {t(CATEGORY_KEY[cat])}
                      </span>
                      <span className="font-mono text-neutral-900 dark:text-neutral-100">
                        {amount.toLocaleString()} {t('catalog.currency')}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-neutral-500 dark:bg-neutral-400"
                        style={{ width: `${(amount / maxCategory) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">{t('finance.day')}</th>
                  <th className="px-4 py-2 text-end font-medium">{t('finance.receipts')}</th>
                  <th className="px-4 py-2 text-end font-medium">{t('finance.refunds')}</th>
                  <th className="px-4 py-2 text-end font-medium">{t('finance.revenue')}</th>
                  <th className="px-4 py-2 text-end font-medium">{t('finance.expenses')}</th>
                  <th className="px-4 py-2 text-end font-medium">{t('finance.net')}</th>
                </tr>
              </thead>
              <tbody>
                {report.days.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                      {t('finance.empty')}
                    </td>
                  </tr>
                ) : (
                  report.days.map((d) => (
                    <tr
                      key={d.start}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                        {new Date(d.start).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-end font-mono">
                        {d.receiptsDZD.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-end font-mono text-neutral-400">
                        {d.refundsDZD ? `−${d.refundsDZD.toLocaleString()}` : '0'}
                      </td>
                      <td className="px-4 py-3 text-end font-mono">
                        {d.revenueDZD.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-end font-mono">
                        {d.expensesDZD.toLocaleString()}
                      </td>
                      <td
                        className={`px-4 py-3 text-end font-mono ${
                          d.netDZD >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {d.netDZD.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
