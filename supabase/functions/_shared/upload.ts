const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGES = new Map([
  ['image/jpeg', { extension: 'jpg', signature: [0xff, 0xd8, 0xff] }],
  ['image/png', { extension: 'png', signature: [0x89, 0x50, 0x4e, 0x47] }],
  ['image/webp', { extension: 'webp', signature: [0x52, 0x49, 0x46, 0x46] }],
])

export function isValidPublishDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
}

export async function validateImage(file: File) {
  const imageType = ALLOWED_IMAGES.get(file.type)
  if (!imageType || file.size === 0 || file.size > MAX_FILE_SIZE) return null

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const hasExpectedSignature = imageType.signature.every(
    (byte, index) => header[index] === byte,
  )
  if (!hasExpectedSignature) return null

  if (
    file.type === 'image/webp'
    && String.fromCharCode(...header.slice(8, 12)) !== 'WEBP'
  ) {
    return null
  }

  return imageType.extension
}
