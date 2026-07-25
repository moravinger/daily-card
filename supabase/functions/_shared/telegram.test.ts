import { describe, expect, it } from 'vitest'
import { validateTelegramInitData } from './telegram.ts'

const encoder = new TextEncoder()

async function hmac(key: BufferSource, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value))
}

function toHex(value: ArrayBuffer) {
  return [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function createInitData(userId: number, botToken: string, authDate: number) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'test-query',
    user: JSON.stringify({ id: userId, first_name: 'Test' }),
  })
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secret = await hmac(encoder.encode('WebAppData'), botToken)
  params.set('hash', toHex(await hmac(secret, dataCheckString)))
  return params.toString()
}

describe('validateTelegramInitData', () => {
  const botToken = '123456:test-token'
  const now = Math.floor(Date.now() / 1000)

  it('returns the user ID for correctly signed fresh data', async () => {
    const initData = await createInitData(41894118, botToken, now)
    await expect(validateTelegramInitData(initData, botToken))
      .resolves.toBe(41894118)
  })

  it('rejects tampered user data', async () => {
    const initData = await createInitData(41894118, botToken, now)
    const tampered = initData.replace('41894118', '41894119')
    await expect(validateTelegramInitData(tampered, botToken)).resolves.toBeNull()
  })

  it('rejects expired data', async () => {
    const initData = await createInitData(41894118, botToken, now - 3601)
    await expect(validateTelegramInitData(initData, botToken)).resolves.toBeNull()
  })
})
