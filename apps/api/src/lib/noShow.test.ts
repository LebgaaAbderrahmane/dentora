import { describe, expect, it } from 'vitest'
import { noShowStats } from './noShow'

describe('noShowStats', () => {
  it('returns zero when there are no resolved visits', () => {
    expect(noShowStats({ noShowCount: 0, completedCount: 0 })).toEqual({
      noShowCount: 0,
      noShowRate: 0,
    })
  })

  it('returns 0 rate when every visit was completed', () => {
    expect(noShowStats({ noShowCount: 0, completedCount: 3 })).toEqual({
      noShowCount: 0,
      noShowRate: 0,
    })
  })

  it('returns 1 rate when every resolved visit was a no-show', () => {
    expect(noShowStats({ noShowCount: 2, completedCount: 0 })).toEqual({
      noShowCount: 2,
      noShowRate: 1,
    })
  })

  it('computes the rate over completed + no-show records', () => {
    expect(noShowStats({ noShowCount: 1, completedCount: 3 })).toEqual({
      noShowCount: 1,
      noShowRate: 0.25,
    })
  })

  it('rounds the rate to 4 decimals', () => {
    expect(noShowStats({ noShowCount: 1, completedCount: 2 })).toEqual({
      noShowCount: 1,
      noShowRate: 0.3333,
    })
  })
})
