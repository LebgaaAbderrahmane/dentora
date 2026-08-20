import { useEffect, useMemo, useState } from 'react'
import type { FinanceReport, OccupancyReport, StockValuationReport } from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CATEGORY_KEY: Record<string, MessageKey> = {
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

const UNIT_KEY: Record<string, MessageKey> = {
  UNIT: 'products.unit.unit',
  BOX: 'products.unit.box',
  PACK: 'products.unit.pack',
  BOTTLE: 'products.unit.bottle',
  JAR: 'products.unit.jar',
  SYRINGE: 'products.unit.syringe',
  SET: 'products.unit.set',
  KIT: 'products.unit.kit',
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

type Tab = 'occupancy' | 'stock' | 'revenue'

function fmtRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function ReportsView({ canFinances }: { canFinances: boolean }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('occupancy')
  const [preset, setPreset] = useState<Preset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null)
  const [valuation, setValuation] = useState<StockValuationReport | null>(null)
  const [revenue, setRevenue] = useState<FinanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  const windowParams = useMemo(() => {
    if (customFrom || customTo) {
      return {
        from: customFrom
          ? localMidnight(new Date(`${customFrom}T00:00:00`)).toISOString()
          : undefined,
        to: customTo
          ? new Date(
              localMidnight(new Date(`${customTo}T00:00:00`)).getTime() + DAY_MS,
            ).toISOString()
          : undefined,
      }
    }
    const w = presetWindow(preset)
    return { from: w.from.toISOString(), to: w.to.toISOString() }
  }, [preset, customFrom, customTo])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load =
      tab === 'occupancy'
        ? api.occupancyReport(windowParams)
        : tab === 'stock'
          ? api.stockValuation()
          : api.revenueReport(windowParams)
    load
      .then((r) => {
        if (cancelled) return
        if (tab === 'occupancy') setOccupancy(r as OccupancyReport)
        else if (tab === 'stock') setValuation(r as StockValuationReport)
        else setRevenue(r as FinanceReport)
      })
      .catch(() => {
        if (!cancelled) toast(t('reports.loadError'), 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, windowParams, t, toast])

  const exportUrl = (slug: 'occupancy' | 'stock-valuation' | 'revenue', format: 'csv' | 'pdf') =>
    api.reportExportUrl(slug, format, windowParams)

  const tabs: { id: Tab; label: MessageKey }[] = [{ id: 'occupancy', label: 'reports.occupancy' }]
  if (canFinances) {
    tabs.push({ id: 'stock', label: 'reports.stockValuation' })
    tabs.push({ id: 'revenue', label: 'reports.revenue' })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tabItem) => (
          <Button
            key={tabItem.id}
            variant={tab === tabItem.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(tabItem.id)}
          >
            {t(tabItem.label)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tab !== 'stock' && (
          <>
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
                {t(`reports.preset.${p}`)}
              </Button>
            ))}
            <div className="ms-1 flex items-center gap-2">
              <Input
                aria-label={t('reports.from')}
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
                aria-label={t('reports.to')}
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value)
                  setPreset('today')
                }}
                className="w-[140px]"
              />
            </div>
          </>
        )}
        <div className="ms-auto flex items-center gap-2">
          <a
            href={exportUrl(
              tab === 'stock' ? 'stock-valuation' : tab === 'revenue' ? 'revenue' : 'occupancy',
              'csv',
            )}
            download
          >
            <Button variant="outline" size="sm">
              {t('reports.exportCsv')}
            </Button>
          </a>
          <a
            href={exportUrl(
              tab === 'stock' ? 'stock-valuation' : tab === 'revenue' ? 'revenue' : 'occupancy',
              'pdf',
            )}
            download
          >
            <Button variant="outline" size="sm">
              {t('reports.exportPdf')}
            </Button>
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">…</div>
      ) : tab === 'occupancy' && occupancy ? (
        <OccupancyView report={occupancy} />
      ) : tab === 'stock' && valuation ? (
        <ValuationView report={valuation} />
      ) : tab === 'revenue' && revenue ? (
        <RevenueView report={revenue} />
      ) : null}
    </div>
  )
}

function OccupancyView({ report }: { report: OccupancyReport }) {
  const { t } = useI18n()
  const s = report.summary
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('reports.planned')} value={String(s.planned)} />
        <StatCard label={t('reports.kept')} value={String(s.kept)} />
        <StatCard label={t('reports.noShow')} value={String(s.noShow)} />
        <StatCard label={t('reports.cancelled')} value={String(s.cancelled)} />
        <StatCard label={t('reports.utilization')} value={fmtRate(s.utilization)} />
        <StatCard label={t('reports.showRate')} value={fmtRate(s.showRate)} />
      </div>

      <ReportTable
        headers={[
          t('reports.date'),
          t('reports.planned'),
          t('reports.kept'),
          t('reports.noShow'),
          t('reports.cancelled'),
          t('reports.utilization'),
        ]}
        rows={report.days.map((d) => [
          new Date(d.start).toLocaleDateString(),
          String(d.planned),
          String(d.kept),
          String(d.noShow),
          String(d.cancelled),
          fmtRate(d.utilization),
        ])}
        emptyLabel={t('reports.empty')}
      />

      {report.byDentist.length > 0 && (
        <ReportTable
          headers={[
            t('reports.dentist'),
            t('reports.planned'),
            t('reports.kept'),
            t('reports.noShow'),
            t('reports.cancelled'),
            t('reports.utilization'),
          ]}
          rows={report.byDentist.map((d) => [
            d.dentistName ?? '—',
            String(d.planned),
            String(d.kept),
            String(d.noShow),
            String(d.cancelled),
            fmtRate(d.utilization),
          ])}
          emptyLabel={t('reports.empty')}
        />
      )}
    </div>
  )
}

function ValuationView({ report }: { report: StockValuationReport }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t('reports.totalValue')}
          value={`${report.summary.totalValueDZD.toLocaleString()} ${t('catalog.currency')}`}
        />
        <StatCard label={t('reports.productsCount')} value={String(report.summary.products)} />
        <StatCard
          label={t('reports.costedProducts')}
          value={String(report.summary.costedProducts)}
        />
      </div>

      <ReportTable
        headers={[
          t('reports.product'),
          t('reports.category'),
          t('reports.unit'),
          t('reports.quantity'),
          t('reports.unitCost'),
          t('reports.value'),
        ]}
        rows={report.rows.map((r) => [
          r.name,
          t(CATEGORY_KEY[r.category]),
          t(UNIT_KEY[r.unit]),
          String(r.quantityOnHand),
          r.hasCost ? String(r.unitCostDZD) : t('reports.noCost'),
          `${r.valueDZD.toLocaleString()} ${t('catalog.currency')}`,
        ])}
        emptyLabel={t('reports.empty')}
      />
    </div>
  )
}

function RevenueView({ report }: { report: FinanceReport }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t('finance.revenue')}
          value={`${report.revenue.netDZD.toLocaleString()} ${t('catalog.currency')}`}
        />
        <StatCard
          label={t('finance.expenses')}
          value={`${report.expenses.totalDZD.toLocaleString()} ${t('catalog.currency')}`}
        />
        <StatCard
          label={t('finance.net')}
          value={`${report.netDZD.toLocaleString()} ${t('catalog.currency')}`}
          tone={report.netDZD >= 0 ? 'pos' : 'neg'}
        />
      </div>

      <ReportTable
        headers={[
          t('finance.day'),
          t('finance.receipts'),
          t('finance.refunds'),
          t('finance.revenue'),
          t('finance.expenses'),
          t('finance.net'),
        ]}
        rows={report.days.map((d) => [
          new Date(d.start).toLocaleDateString(),
          d.receiptsDZD.toLocaleString(),
          d.refundsDZD.toLocaleString(),
          d.revenueDZD.toLocaleString(),
          d.expensesDZD.toLocaleString(),
          d.netDZD.toLocaleString(),
        ])}
        emptyLabel={t('reports.empty')}
      />
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  const color =
    tone === 'pos'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'neg'
        ? 'text-red-600 dark:text-red-400'
        : 'text-neutral-900 dark:text-neutral-100'
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function ReportTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[]
  rows: string[][]
  emptyLabel: string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-neutral-500">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3 ${
                      j > 0 ? 'text-end font-mono' : 'text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
