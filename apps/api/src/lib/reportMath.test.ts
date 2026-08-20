import { describe, expect, it } from 'vitest'
import {
  buildOccupancyReport,
  documentToCsv,
  financeDoc,
  occupancyDoc,
  showRate,
  stockValuationDoc,
  utilization,
  valuationRows,
  valuationSummary,
  weightedAverageCost,
  type AppointmentRow,
  type ValuationRowInput,
} from './reportMath'
import { DAY_MS } from './finance'

const DAY0 = Date.parse('2026-08-17T00:00:00.000Z')

const appt = (
  status: AppointmentRow['status'],
  startAt: string,
  dentistId: string | null,
  dentistName: string | null,
): AppointmentRow => ({ status, startAt, dentistId, dentistName })

describe('occupancy metrics', () => {
  it('utilization and show rate stay in 0..1', () => {
    expect(utilization(0, 0)).toBe(0)
    expect(utilization(4, 5)).toBe(0.8)
    expect(showRate(4, 1)).toBe(0.8)
    expect(showRate(0, 0)).toBe(0)
  })

  it('aggregates a window into days, per-dentist and summary', () => {
    const rows: AppointmentRow[] = [
      appt('COMPLETED', '2026-08-17T09:00:00.000Z', 'd1', 'Dr A'),
      appt('COMPLETED', '2026-08-17T10:00:00.000Z', 'd1', 'Dr A'),
      appt('NOSHOW', '2026-08-17T14:00:00.000Z', 'd1', 'Dr A'),
      appt('CANCELLED', '2026-08-17T11:00:00.000Z', 'd2', 'Dr B'),
      appt('COMPLETED', '2026-08-18T09:00:00.000Z', 'd2', 'Dr B'),
    ]
    const report = buildOccupancyReport(rows, DAY0, DAY0 + 2 * DAY_MS)
    expect(report.days).toHaveLength(2)
    expect(report.days[0]).toMatchObject({ planned: 3, kept: 2, noShow: 1, cancelled: 1 })
    expect(report.days[1]).toMatchObject({ planned: 1, kept: 1, noShow: 0, cancelled: 0 })
    expect(report.summary).toMatchObject({ planned: 4, kept: 3, noShow: 1, cancelled: 1 })
    expect(report.summary.showRate).toBe(0.75)
    expect(report.summary.utilization).toBe(0.75)
    expect(report.byDentist).toHaveLength(2)
    const drA = report.byDentist.find((d) => d.dentistName === 'Dr A')
    expect(drA).toMatchObject({ planned: 3, kept: 2, noShow: 1, cancelled: 0 })
    expect(drA?.utilization).toBeCloseTo(0.6667)
  })

  it('a CANCELLED slot is neither planned nor kept', () => {
    const report = buildOccupancyReport(
      [appt('CANCELLED', '2026-08-17T09:00:00.000Z', null, null)],
      DAY0,
      DAY0 + DAY_MS,
    )
    expect(report.summary).toMatchObject({ planned: 0, kept: 0, cancelled: 1 })
  })

  it('ignores rows outside the window and produces zero days for an empty window', () => {
    const report = buildOccupancyReport(
      [appt('COMPLETED', '2026-08-20T09:00:00.000Z', null, null)],
      DAY0,
      DAY0 + DAY_MS,
    )
    expect(report.summary.planned).toBe(0)
    expect(report.days).toHaveLength(1)
  })
})

describe('stock valuation', () => {
  const product = (id: string, qty: number): ValuationRowInput => ({
    productId: id,
    name: `Produit ${id}`,
    code: `P-${id}`,
    category: 'DISPOSABLES',
    unit: 'UNIT',
    quantityOnHand: qty,
  })

  it('computes the weighted-average unit cost', () => {
    expect(weightedAverageCost([])).toBeNull()
    expect(
      weightedAverageCost([
        { quantity: 10, unitCostDZD: 100 },
        { quantity: 10, unitCostDZD: 200 },
      ]),
    ).toBe(150)
    expect(weightedAverageCost([{ quantity: 3, unitCostDZD: 100 }])).toBe(100)
  })

  it('values each product at quantity × WAC and flags missing costs', () => {
    const costs = new Map<string, readonly { quantity: number; unitCostDZD: number }[]>([
      ['a', [{ quantity: 10, unitCostDZD: 150 }]],
    ])
    const rows = valuationRows([product('a', 4), product('b', 7)], costs)
    const a = rows.find((r) => r.productId === 'a')
    const b = rows.find((r) => r.productId === 'b')
    expect(a).toMatchObject({ unitCostDZD: 150, valueDZD: 600, hasCost: true })
    expect(b).toMatchObject({ unitCostDZD: null, valueDZD: 0, hasCost: false })
  })

  it('summarizes totals, costed count and per-category values', () => {
    const costs = new Map<string, readonly { quantity: number; unitCostDZD: number }[]>([
      ['a', [{ quantity: 1, unitCostDZD: 400 }]],
    ])
    const rows = valuationRows([product('a', 5), product('b', 5)], costs)
    const summary = valuationSummary(rows)
    expect(summary.totalValueDZD).toBe(2000)
    expect(summary.products).toBe(2)
    expect(summary.costedProducts).toBe(1)
    expect(summary.byCategory.DISPOSABLES).toBe(2000)
  })
})

describe('document builders', () => {
  const occupancy = buildOccupancyReport(
    [
      appt('COMPLETED', '2026-08-17T09:00:00.000Z', 'd1', 'Dr A'),
      appt('NOSHOW', '2026-08-17T14:00:00.000Z', 'd1', 'Dr A'),
    ],
    DAY0,
    DAY0 + DAY_MS,
  )

  it('occupancyDoc carries day, dentist and summary tables', () => {
    const doc = occupancyDoc(occupancy)
    expect(doc.title).toBe("Rapport d'occupation")
    expect(doc.tables.length).toBeGreaterThanOrEqual(2)
    const days = doc.tables[0]
    expect(days.headers).toEqual([
      'Date',
      'Planifiés',
      'Réalisés',
      'Absences',
      'Annulés',
      'Occupation',
    ])
    expect(days.rows[0][1]).toBe('2')
    expect(days.rows[0][2]).toBe('1')
  })

  it('stockValuationDoc lists every product row', () => {
    const costs = new Map<string, readonly { quantity: number; unitCostDZD: number }[]>([
      ['a', [{ quantity: 1, unitCostDZD: 100 }]],
    ])
    const report = {
      generatedAt: '2026-08-17T00:00:00.000Z',
      summary: valuationSummary(valuationRows([productForDoc('a', 3)], costs)),
      rows: valuationRows([productForDoc('a', 3)], costs),
    }
    const doc = stockValuationDoc(report)
    expect(doc.tables[0].rows[0][6]).toBe('300')
  })

  it('financeDoc maps the finance report to a flat table', () => {
    const doc = financeDoc({
      from: '2026-08-17T00:00:00.000Z',
      to: '2026-08-18T00:00:00.000Z',
      revenue: {
        receiptsDZD: 1000,
        refundsDZD: 200,
        netDZD: 800,
        byMethod: { CASH: 800, CHEQUE: 0, CARD: 0, TRANSFER: 0 },
      },
      expenses: {
        totalDZD: 300,
        count: 1,
        byCategory: {
          SALARY: 300,
          RENT: 0,
          SUPPLIES: 0,
          EQUIPMENT: 0,
          UTILITIES: 0,
          MAINTENANCE: 0,
          MARKETING: 0,
          TAXES: 0,
          OTHER: 0,
        },
      },
      netDZD: 500,
      days: [],
    })
    expect(doc.tables[0].headers[3]).toBe('Recettes')
  })
})

function productForDoc(id: string, qty: number): ValuationRowInput {
  return {
    productId: id,
    name: 'Produit a',
    code: null,
    category: 'DISPOSABLES',
    unit: 'UNIT',
    quantityOnHand: qty,
  }
}

describe('documentToCsv', () => {
  it('emits a UTF-8 BOM and CRLF lines, quoting tricky cells', () => {
    const csv = documentToCsv({
      title: 'Test',
      subtitle: 'x',
      tables: [
        {
          heading: '—',
          headers: ['Name', 'Value'],
          rows: [
            ['Dr, A', '1200'],
            ['À bientôt', '0'],
          ],
        },
      ],
    })
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Dr, A"')
    expect(csv).toContain('\r\n')
  })

  it('joins multiple tables with a blank line and quotes embedded double quotes', () => {
    const csv = documentToCsv({
      title: 'Test',
      subtitle: 'x',
      tables: [
        { heading: '—', headers: ['A'], rows: [['hello']] },
        { heading: '—', headers: ['B'], rows: [['say "hi"']] },
      ],
    })
    expect(csv.split('\r\n\r\n')).toHaveLength(2)
    expect(csv).toContain('"say ""hi"""')
  })
})
