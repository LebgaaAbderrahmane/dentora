// Pure report aggregation for Phase 6.1 (ADR 033) — occupancy, stock valuation
// and the flat CSV/PDF document model. No prisma import — CI-testable. All values
// whole dinars (ADR 017); day buckets are fixed 24h steps from `from`, so the API
// stays timezone-agnostic (Algeria: UTC+1, no DST). Everything is derived on read;
// nothing is stored.
import { PRODUCT_CATEGORIES } from '@dentora/contracts'
import type {
  AppointmentStatus,
  FinanceReport,
  OccupancyDay,
  OccupancyDentist,
  OccupancyReport,
  OccupancySummary,
  ProductCategory,
  ProductUnit,
  StockValuationRow,
  StockValuationReport,
  StockValuationSummary,
} from '@dentora/contracts'
import { DAY_MS, type FinanceDayRow } from './finance'

// ---- Occupancy (ADR 033) ----

// Statuses of appointments that held a booked slot in the window. CANCELLED slots
// are released and counted separately; NOSHOW slots were booked but abandoned.
const PLANNED_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'NOSHOW',
])

export interface AppointmentRow {
  status: AppointmentStatus
  startAt: Date | string | number
  dentistId: string | null
  dentistName: string | null
}

type UnitRate = number // 0..1, rounded to 4 decimals

export type StatusCounts = {
  planned: number
  kept: number
  noShow: number
  cancelled: number
}

export interface DentistStats extends StatusCounts {
  dentistId: string | null
  dentistName: string | null
  utilization: UnitRate
}

export function roundRate(value: number): UnitRate {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10_000) / 10_000
}

export function utilization(kept: number, planned: number): UnitRate {
  return roundRate(planned > 0 ? kept / planned : 0)
}

export function showRate(kept: number, noShow: number): UnitRate {
  const attended = kept + noShow
  return roundRate(attended > 0 ? kept / attended : 0)
}

function bucketIndex(timeMs: number, fromMs: number): number {
  return Math.floor((timeMs - fromMs) / DAY_MS)
}

// Fold raw appointment rows into the daily + per-dentist grid. Only rows whose
// startAt falls inside [fromMs, toMs) are bucketed; anything outside is ignored.
export function occupancyStats(
  rows: readonly AppointmentRow[],
  fromMs: number,
  toMs: number,
): { days: OccupancyDay[]; byDentist: DentistStats[]; summary: OccupancySummary } {
  const days: OccupancyDay[] = []
  for (let s = fromMs; s < toMs; s += DAY_MS) {
    days.push({
      start: new Date(s).toISOString(),
      planned: 0,
      kept: 0,
      noShow: 0,
      cancelled: 0,
      utilization: 0,
    })
  }
  const totals: StatusCounts = { planned: 0, kept: 0, noShow: 0, cancelled: 0 }
  const perDentist = new Map<string | null, DentistStats>()

  const statsFor = (id: string | null, name: string | null): DentistStats => {
    let s = perDentist.get(id)
    if (!s) {
      s = {
        dentistId: id,
        dentistName: name,
        planned: 0,
        kept: 0,
        noShow: 0,
        cancelled: 0,
        utilization: 0,
      }
      perDentist.set(id, s)
    }
    return s
  }

  for (const row of rows) {
    const tMs = new Date(row.startAt).getTime()
    const i = bucketIndex(tMs, fromMs)
    if (i < 0 || i >= days.length) continue

    const day = days[i]
    const dentist = statsFor(row.dentistId, row.dentistName)
    const planned = PLANNED_STATUSES.has(row.status)
    if (planned) {
      day.planned += 1
      totals.planned += 1
      dentist.planned += 1
    }
    if (row.status === 'COMPLETED') {
      day.kept += 1
      totals.kept += 1
      dentist.kept += 1
    } else if (row.status === 'NOSHOW') {
      day.noShow += 1
      totals.noShow += 1
      dentist.noShow += 1
    } else if (row.status === 'CANCELLED') {
      day.cancelled += 1
      totals.cancelled += 1
      dentist.cancelled += 1
    }
  }

  for (const d of days) d.utilization = utilization(d.kept, d.planned)

  const byDentist = [...perDentist.values()]
    .map((d) => ({ ...d, utilization: utilization(d.kept, d.planned) }))
    .sort((a, b) => (a.dentistName ?? '').localeCompare(b.dentistName ?? ''))

  const summary: OccupancySummary = {
    ...totals,
    showRate: showRate(totals.kept, totals.noShow),
    utilization: utilization(totals.kept, totals.planned),
  }

  return { days, byDentist, summary }
}

export function buildOccupancyReport(
  rows: readonly AppointmentRow[],
  fromMs: number,
  toMs: number,
): OccupancyReport {
  const { days, byDentist, summary } = occupancyStats(rows, fromMs, toMs)
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    days,
    byDentist,
    summary,
  }
}

// ---- Stock valuation (ADR 033) ----

export interface CostedMovement {
  quantity: number
  unitCostDZD: number
}

export interface ValuationRowInput {
  productId: string
  name: string
  code: string | null
  category: ProductCategory
  unit: ProductUnit
  quantityOnHand: number
}

// Weighted-average unit cost of the product's costed OPENING/IN movements, rounded
// to whole dinars (ADR 017). null when the product has no costed movement yet.
export function weightedAverageCost(movements: readonly CostedMovement[]): number | null {
  let quantity = 0
  let quantityCost = 0
  for (const m of movements) {
    if (m.quantity <= 0) continue
    quantity += m.quantity
    quantityCost += m.quantity * m.unitCostDZD
  }
  return quantity > 0 ? Math.round(quantityCost / quantity) : null
}

export function valuationRows(
  products: readonly ValuationRowInput[],
  costsByProduct: ReadonlyMap<string, readonly CostedMovement[]>,
): StockValuationRow[] {
  const rows = products.map((p) => {
    const unitCost = weightedAverageCost(costsByProduct.get(p.productId) ?? [])
    return {
      productId: p.productId,
      name: p.name,
      code: p.code,
      category: p.category,
      unit: p.unit,
      quantityOnHand: p.quantityOnHand,
      unitCostDZD: unitCost,
      valueDZD: unitCost === null ? 0 : Math.round(p.quantityOnHand * unitCost),
      hasCost: unitCost !== null,
    }
  })
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export function valuationSummary(rows: readonly StockValuationRow[]): StockValuationSummary {
  const byCategory = Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c, 0])) as Record<
    ProductCategory,
    number
  >
  let totalValueDZD = 0
  let costedProducts = 0
  for (const r of rows) {
    totalValueDZD += r.valueDZD
    byCategory[r.category] += r.valueDZD
    if (r.hasCost) costedProducts += 1
  }
  return { totalValueDZD, products: rows.length, costedProducts, byCategory }
}

// ---- Flat document model shared by the CSV and PDF exporters ----

export interface ReportTable {
  heading: string
  headers: string[]
  rows: string[][]
}

export interface ReportDocument {
  title: string
  subtitle: string
  tables: ReportTable[]
}

const FR = {
  subtitle: 'Période',
  date: 'Date',
  dentist: 'Chirurgien',
  planned: 'Planifiés',
  kept: 'Réalisés',
  noShow: 'Absences',
  cancelled: 'Annulés',
  utilization: 'Occupation',
  summary: 'Résumé',
  metric: 'Indicateur',
  value: 'Valeur',
  byDentist: 'Par chirurgien',
  showRate: 'Taux de réalisation',
  product: 'Produit',
  code: 'Code',
  category: 'Catégorie',
  unit: 'Unité',
  quantity: 'Quantité',
  unitCost: 'Coût unitaire (DA)',
  totalValue: 'Valeur (DA)',
  stockSummary: 'Valorisation du stock',
  totalStockValue: 'Valeur totale du stock',
  products: 'Produits',
  costedProducts: 'Produits valorisés',
  generatedAt: 'Généré le',
  day: 'Jour',
  receipts: 'Encaissements',
  refunds: 'Remboursements',
  revenue: 'Recettes',
  expenses: 'Dépenses',
  net: 'Résultat net',
  financeSummary: 'Synthèse financière',
  byCategory: 'Par catégorie de dépense',
  byMethod: 'Par moyen de paiement',
} as const

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

export function fmtRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

const occupancyDayRow = (d: OccupancyDay): string[] => [
  fmtDate(d.start),
  String(d.planned),
  String(d.kept),
  String(d.noShow),
  String(d.cancelled),
  fmtRate(d.utilization),
]

const dentistRow = (d: OccupancyDentist): string[] => [
  d.dentistName ?? '—',
  String(d.planned),
  String(d.kept),
  String(d.noShow),
  String(d.cancelled),
  fmtRate(d.utilization),
]

const summaryRow = (metric: string, value: string): string[] => [metric, value]

export function occupancyDoc(report: OccupancyReport): ReportDocument {
  const period = `${fmtDate(report.from)} → ${fmtDate(report.to)}`
  const tables: ReportTable[] = []
  const dayHeaders = [FR.date, FR.planned, FR.kept, FR.noShow, FR.cancelled, FR.utilization]
  const dentistHeaders = [FR.dentist, FR.planned, FR.kept, FR.noShow, FR.cancelled, FR.utilization]
  if (report.days.length > 0) {
    tables.push({ heading: '—', headers: dayHeaders, rows: report.days.map(occupancyDayRow) })
  }
  if (report.byDentist.length > 0) {
    tables.push({
      heading: FR.byDentist,
      headers: dentistHeaders,
      rows: report.byDentist.map(dentistRow),
    })
  }
  tables.push({
    heading: FR.summary,
    headers: [FR.metric, FR.value],
    rows: [
      summaryRow(FR.planned, String(report.summary.planned)),
      summaryRow(FR.kept, String(report.summary.kept)),
      summaryRow(FR.noShow, String(report.summary.noShow)),
      summaryRow(FR.cancelled, String(report.summary.cancelled)),
      summaryRow(FR.showRate, fmtRate(report.summary.showRate)),
      summaryRow(FR.utilization, fmtRate(report.summary.utilization)),
    ],
  })
  return { title: "Rapport d'occupation", subtitle: `${FR.subtitle}: ${period}`, tables }
}

export function stockValuationDoc(report: StockValuationReport): ReportDocument {
  const tables: ReportTable[] = [
    {
      heading: '—',
      headers: [FR.product, FR.code, FR.category, FR.unit, FR.quantity, FR.unitCost, FR.totalValue],
      rows: report.rows.map((r) => [
        r.name,
        r.code ?? '—',
        r.category,
        r.unit,
        String(r.quantityOnHand),
        r.hasCost ? String(r.unitCostDZD) : '—',
        String(r.valueDZD),
      ]),
    },
    {
      heading: FR.summary,
      headers: [FR.metric, FR.value],
      rows: [
        summaryRow(FR.totalStockValue, String(report.summary.totalValueDZD)),
        summaryRow(FR.products, String(report.summary.products)),
        summaryRow(FR.costedProducts, String(report.summary.costedProducts)),
      ],
    },
  ]
  return {
    title: FR.stockSummary,
    subtitle: `${FR.generatedAt}: ${fmtDate(report.generatedAt)}`,
    tables,
  }
}

const fmtMoney = (n: number): string => String(n)

const financeDayRow = (d: FinanceDayRow): string[] => [
  fmtDate(d.start),
  fmtMoney(d.receiptsDZD),
  fmtMoney(d.refundsDZD),
  fmtMoney(d.revenueDZD),
  fmtMoney(d.expensesDZD),
  fmtMoney(d.netDZD),
]

export function financeDoc(report: FinanceReport): ReportDocument {
  const period = `${fmtDate(report.from)} → ${fmtDate(report.to)}`
  const tables: ReportTable[] = [
    {
      heading: '—',
      headers: [FR.day, FR.receipts, FR.refunds, FR.revenue, FR.expenses, FR.net],
      rows: report.days.map(financeDayRow),
    },
    {
      heading: FR.financeSummary,
      headers: [FR.metric, FR.value],
      rows: [
        summaryRow(FR.receipts, fmtMoney(report.revenue.receiptsDZD)),
        summaryRow(FR.refunds, fmtMoney(report.revenue.refundsDZD)),
        summaryRow(FR.revenue, fmtMoney(report.revenue.netDZD)),
        summaryRow(FR.expenses, fmtMoney(report.expenses.totalDZD)),
        summaryRow(FR.net, fmtMoney(report.netDZD)),
      ],
    },
  ]
  return { title: FR.financeSummary, subtitle: `${FR.subtitle}: ${period}`, tables }
}

// RFC 4180-style CSV line: cells containing a comma, quote, CR or LF are
// double-quoted with inner quotes doubled. `documentToCsv` emits one block per
// document table joined by a blank line, prefixed with a UTF-8 BOM so Excel
// renders diacritics correctly (the clinic's working language is French).
function csvLine(cells: readonly (string | number | null)[]): string {
  const esc = (cell: string | number | null): string => {
    const s = String(cell ?? '')
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return cells.map(esc).join(',')
}

export function documentToCsv(doc: ReportDocument): string {
  const blocks = doc.tables.map((t) => [csvLine(t.headers), ...t.rows.map((row) => csvLine(row))])
  return '\uFEFF' + blocks.map((block) => block.join('\r\n')).join('\r\n\r\n') + '\r\n'
}
