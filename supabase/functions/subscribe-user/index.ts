import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const encoder = new TextEncoder()
const MAX_INIT_DATA_AGE_SECONDS = 60 * 60

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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

async function validateTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData)
  const receivedHash = params.get('hash')
  const authDate = Number(params.get('auth_date'))

  if (!receivedHash || !Number.isInteger(authDate)) return null

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate
  if (ageSeconds < 0 || ageSeconds > MAX_INIT_DATA_AGE_SECONDS) return null

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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const { initData } = await request.json()
    if (typeof initData !== 'string' || !initData) {
      return jsonResponse({ error: 'initData is required' }, 400)
    }

    const botToken = Deno.env.get('BOT_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error('Required server secrets are not configured')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    const userId = await validateTelegramInitData(initData, botToken)
    if (!userId) {
      return jsonResponse({ error: 'Invalid or expired Telegram data' }, 401)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
    const { error } = await supabase
      .from('subscribers')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

    if (error) {
      console.error('Failed to subscribe user:', error)
      return jsonResponse({ error: 'Failed to subscribe user' }, 500)
    }

    return jsonResponse({ subscribed: true })
  } catch (error) {
    console.error('Unexpected subscribe-user error:', error)
    return jsonResponse({ error: 'Invalid request' }, 400)
  }
})
