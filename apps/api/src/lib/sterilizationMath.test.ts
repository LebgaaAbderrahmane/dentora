import { describe, expect, it } from 'vitest'
import { applySterilizationTransition, STERILIZATION_TERMINAL } from './sterilizationMath'

describe('sterilization status transitions (3.6, ADR 026)', () => {
  it('terminal states are COMPLETED/FAILED/CANCELLED', () => {
    expect(STERILIZATION_TERMINAL.has('COMPLETED')).toBe(true)
    expect(STERILIZATION_TERMINAL.has('FAILED')).toBe(true)
    expect(STERILIZATION_TERMINAL.has('CANCELLED')).toBe(true)
    expect(STERILIZATION_TERMINAL.has('IN_PROGRESS')).toBe(false)
  })

  it('IN_PROGRESS may move to any terminal state', () => {
    expect(applySterilizationTransition('IN_PROGRESS', 'COMPLETED')).toEqual({
      ok: true,
      status: 'COMPLETED',
    })
    expect(applySterilizationTransition('IN_PROGRESS', 'FAILED')).toEqual({
      ok: true,
      status: 'FAILED',
    })
    expect(applySterilizationTransition('IN_PROGRESS', 'CANCELLED')).toEqual({
      ok: true,
      status: 'CANCELLED',
    })
  })

  it('a no-op keeps the current state', () => {
    expect(applySterilizationTransition('IN_PROGRESS', 'IN_PROGRESS')).toEqual({
      ok: true,
      status: 'IN_PROGRESS',
    })
    expect(applySterilizationTransition('COMPLETED', 'COMPLETED')).toEqual({
      ok: true,
      status: 'COMPLETED',
    })
  })

  it('terminal cycles are never reopened', () => {
    expect(applySterilizationTransition('COMPLETED', 'IN_PROGRESS')).toEqual({
      ok: false,
      error: 'TERMINAL_CYCLE',
    })
    expect(applySterilizationTransition('CANCELLED', 'FAILED')).toEqual({
      ok: false,
      error: 'TERMINAL_CYCLE',
    })
  })
})
