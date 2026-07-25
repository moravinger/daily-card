import { describe, expect, it } from 'vitest'
import { formatCardDate, getTodayLocal, getTodayUTC } from './date.js'

describe('date helpers', () => {
  it('formats the UTC calendar day', () => {
    expect(getTodayUTC(new Date('2026-07-25T23:59:59Z'))).toBe('2026-07-25')
  })

  it('formats the local calendar day', () => {
    const now = new Date('2026-07-25T23:30:00Z')
    const expected = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .split('T')[0]

    expect(getTodayLocal(now)).toBe(expected)
  })

  it('formats a card date without shifting the calendar day', () => {
    expect(formatCardDate('2026-07-25')).toBe('25 июля')
  })
})
