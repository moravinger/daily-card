import { describe, expect, it } from 'vitest'
import { isValidPublishDate, validateImage } from './upload.ts'

describe('isValidPublishDate', () => {
  it('accepts a real ISO calendar date', () => {
    expect(isValidPublishDate('2028-02-29')).toBe(true)
  })

  it('rejects impossible and malformed dates', () => {
    expect(isValidPublishDate('2027-02-29')).toBe(false)
    expect(isValidPublishDate('25.07.2026')).toBe(false)
  })
})

describe('validateImage', () => {
  it.each([
    ['image/jpeg', [0xff, 0xd8, 0xff, 0x00], 'jpg'],
    ['image/png', [0x89, 0x50, 0x4e, 0x47], 'png'],
    ['image/webp', [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 'webp'],
  ])('accepts a valid %s signature', async (type, bytes, extension) => {
    const file = new File([new Uint8Array(bytes)], `card.${extension}`, { type })
    await expect(validateImage(file)).resolves.toBe(extension)
  })

  it('rejects a MIME type that does not match the file signature', async () => {
    const file = new File([new Uint8Array([0x47, 0x49, 0x46])], 'fake.png', {
      type: 'image/png',
    })
    await expect(validateImage(file)).resolves.toBeNull()
  })

  it('rejects unsupported image formats', async () => {
    const file = new File(['<svg/>'], 'card.svg', { type: 'image/svg+xml' })
    await expect(validateImage(file)).resolves.toBeNull()
  })
})
