import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.8'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { validateTelegramInitData } from '../_shared/telegram.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(request) })
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'Method not allowed' }, 405)
  }

  try {
    const { initData } = await request.json()
    if (typeof initData !== 'string' || !initData) {
      return jsonResponse(request, { error: 'initData is required' }, 400)
    }

    const botToken = Deno.env.get('BOT_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error('Required server secrets are not configured')
      return jsonResponse(request, { error: 'Server configuration error' }, 500)
    }

    const userId = await validateTelegramInitData(initData, botToken)
    if (!userId) {
      return jsonResponse(request, { error: 'Invalid or expired Telegram data' }, 401)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
    const { error } = await supabase
      .from('subscribers')
      .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

    if (error) {
      console.error('Failed to subscribe user:', error)
      return jsonResponse(request, { error: 'Failed to subscribe user' }, 500)
    }

    return jsonResponse(request, { subscribed: true })
  } catch (error) {
    console.error('Unexpected subscribe-user error:', error)
    return jsonResponse(request, { error: 'Invalid request' }, 400)
  }
})
