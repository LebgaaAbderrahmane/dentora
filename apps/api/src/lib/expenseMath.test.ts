import { describe, expect, it } from 'vitest'
import { expenseSums, expenseTotal } from './expenseMath'

describe('expense math', () => {
  it('expenseSums groups by category', () => {
    const rows = [
      { category: 'RENT' as const, amountDZD: 120000 },
      { category: 'UTILITIES' as const, amountDZD: 8500 },
      { category: 'RENT' as const, amountDZD: 5000 },
    ]
    const sums = expenseSums(rows)
    expect(sums.get('RENT')).toBe(125000)
    expect(sums.get('UTILITIES')).toBe(8500)
    expect(sums.get('SALARY')).toBeUndefined()
  })

  it('expenseTotal sums every row and returns 0 for none', () => {
    expect(expenseTotal([{ amountDZD: 1000 }, { amountDZD: 2000 }])).toBe(3000)
    expect(expenseTotal([])).toBe(0)
  })
})
