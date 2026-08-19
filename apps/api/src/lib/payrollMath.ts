export type PayrollDateError = 'PERIOD_END_BEFORE_START' | 'NEGATIVE_NET'

export type DateInput = Date | string | null | undefined

function toMillis(value: Exclude<DateInput, null | undefined>): number {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}

// Payroll window guard: refuse payslips whose period is inverted.
export function payrollDateError(start: DateInput, end: DateInput): PayrollDateError | null {
  if (start == null || end == null) return null
  if (toMillis(end) < toMillis(start)) return 'PERIOD_END_BEFORE_START'
  return null
}

// A payslip is only valid when deductions do not exceed base + bonus, so net
// can never go negative. Net itself is derived on read from the components.
export function payCheckError(
  baseDZD: number,
  bonusDZD: number,
  deductionsDZD: number,
): PayrollDateError | null {
  if (deductionsDZD > baseDZD + bonusDZD) return 'NEGATIVE_NET'
  return null
}

// net = base + bonus − deductions (whole DZD, ADR 017 — no cents).
export function payslipNetDZD(baseDZD: number, bonusDZD: number, deductionsDZD: number): number {
  return baseDZD + bonusDZD - deductionsDZD
}

// Whole minutes actually clocked by staff from closed attendance records within
// a payslip period. Open records (check-in without check-out) are excluded
// because their worked time is not settled. Mirrors internCompletedMinutes.
export function payslipWorkedMinutes(
  logs: Array<{ checkIn: Date | null; checkOut: Date | null }>,
): number {
  let total = 0
  for (const log of logs) {
    if (log.checkIn == null || log.checkOut == null) continue
    const diff = log.checkOut.getTime() - log.checkIn.getTime()
    if (diff <= 0) continue
    total += Math.round(diff / 60000)
  }
  return total
}
