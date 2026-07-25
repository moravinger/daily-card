import { describe, expect, it } from 'vitest'
import { withCacheBuster } from './url.js'

describe('withCacheBuster', () => {
  it('adds a timestamp to a URL without query parameters', () => {
    expect(withCacheBuster('https://example.com/card.jpg', 42))
      .toBe('https://example.com/card.jpg?t=42')
  })

  it('preserves existing signed URL parameters', () => {
    expect(withCacheBuster('https://example.com/card.jpg?token=abc', 42))
      .toBe('https://example.com/card.jpg?token=abc&t=42')
  })

  it('supports relative URLs when a base is supplied', () => {
    expect(withCacheBuster('/card.jpg', 42, 'https://example.com/app/'))
      .toBe('https://example.com/card.jpg?t=42')
  })
})
