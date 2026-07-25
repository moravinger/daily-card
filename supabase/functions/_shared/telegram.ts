const encoder = new TextEncoder()
const DEFAULT_MAX_AGE_SECONDS = 60 * 60

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function hashesMatch(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || left.length !== right.length) return false

  let difference = 0
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value))
}

export async function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
) {
  const params = new URLSearchParams(initData)
  const receivedHash = params.get('hash')
  const authDate = Number(params.get('auth_date'))

  if (!receivedHash || !Number.isInteger(authDate)) return null

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate
  if (ageSeconds < 0 || ageSeconds > maxAgeSeconds) return null

  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = await hmacSha256(encoder.encode('WebAppData'), botToken)
  const calculatedHash = toHex(await hmacSha256(secretKey, dataCheckString))

  if (!hashesMatch(calculatedHash, receivedHash.toLowerCase())) return null

  try {
    const user = JSON.parse(params.get('user') ?? '')
    return Number.isSafeInteger(user.id) && user.id > 0 ? user.id : null
  } catch {
    return null
  }
}
