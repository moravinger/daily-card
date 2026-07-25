import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config.js', () => ({
  CONFIG: { ADMIN_ID: null },
}))

import { initAppTheme } from './telegram.js'

describe('Telegram theme synchronization', () => {
  let themeColor

  beforeEach(() => {
    themeColor = { setAttribute: vi.fn() }
    globalThis.document = {
      documentElement: { dataset: {} },
      querySelector: vi.fn(() => themeColor),
    }
    globalThis.window = {
      Telegram: { WebApp: { version: '8.0' } },
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
      })),
    }
  })

  it('applies the current Telegram theme and Telegram chrome colors', () => {
    const tg = {
      colorScheme: 'light',
      onEvent: vi.fn(),
      setHeaderColor: vi.fn(),
      setBackgroundColor: vi.fn(),
      setBottomBarColor: vi.fn(),
    }

    initAppTheme(tg)

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(themeColor.setAttribute).toHaveBeenCalledWith('content', '#f4f1eb')
    expect(tg.setHeaderColor).toHaveBeenCalledWith('#f4f1eb')
    expect(tg.setBackgroundColor).toHaveBeenCalledWith('#f4f1eb')
    expect(tg.setBottomBarColor).toHaveBeenCalledWith('#f4f1eb')
  })

  it('updates the interface when Telegram emits themeChanged', () => {
    let themeChanged
    const tg = {
      colorScheme: 'light',
      onEvent: vi.fn((event, callback) => {
        if (event === 'themeChanged') themeChanged = callback
      }),
      setHeaderColor: vi.fn(),
      setBackgroundColor: vi.fn(),
      setBottomBarColor: vi.fn(),
    }

    initAppTheme(tg)
    tg.colorScheme = 'dark'
    themeChanged()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(themeColor.setAttribute).toHaveBeenLastCalledWith('content', '#0b0b0d')
    expect(tg.setHeaderColor).toHaveBeenLastCalledWith('#0b0b0d')
  })
})
