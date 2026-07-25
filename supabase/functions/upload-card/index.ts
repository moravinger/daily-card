import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.8'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import { validateTelegramInitData } from '../_shared/telegram.ts'
import { isValidPublishDate, validateImage } from '../_shared/upload.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(request) })
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'Method not allowed' }, 405)
  }

  try {
    const botToken = Deno.env.get('BOT_TOKEN')
    const adminId = Number(Deno.env.get('ADMIN_ID'))
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (
      !botToken
      || !Number.isSafeInteger(adminId)
      || adminId <= 0
      || !supabaseUrl
      || !serviceRoleKey
    ) {
      console.error('Required server secrets are not configured')
      return jsonResponse(request, { error: 'Server configuration error' }, 500)
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return jsonResponse(request, { error: 'Invalid upload data' }, 400)
    }
    const initData = formData.get('initData')
    const publishDate = formData.get('date')
    const file = formData.get('file')

    if (
      typeof initData !== 'string'
      || typeof publishDate !== 'string'
      || !(file instanceof File)
      || !isValidPublishDate(publishDate)
    ) {
      return jsonResponse(request, { error: 'Invalid upload data' }, 400)
    }

    const userId = await validateTelegramInitData(initData, botToken, 15 * 60)
    if (!userId) {
      return jsonResponse(request, { error: 'Invalid or expired Telegram data' }, 401)
    }
    if (userId !== adminId) {
      return jsonResponse(request, { error: 'Forbidden' }, 403)
    }

    const extension = await validateImage(file)
    if (!extension) {
      return jsonResponse(request, { error: 'Unsupported or invalid image' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
    const objectPath = `cards/${publishDate}/${crypto.randomUUID()}.${extension}`

    const { data: previousCard, error: previousCardError } = await supabase
      .from('cards')
      .select('image_path')
      .eq('publish_date', publishDate)
      .maybeSingle()
    if (previousCardError) throw previousCardError

    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(objectPath, file, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('card-images')
      .getPublicUrl(objectPath)

    const { error: cardError } = await supabase
      .from('cards')
      .upsert(
        {
          publish_date: publishDate,
          image_url: publicUrlData.publicUrl,
          image_path: objectPath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'publish_date' },
      )

    if (cardError) {
      await supabase.storage.from('card-images').remove([objectPath])
      throw cardError
    }

    if (previousCard?.image_path && previousCard.image_path !== objectPath) {
      const { error: cleanupError } = await supabase.storage
        .from('card-images')
        .remove([previousCard.image_path])
      if (cleanupError) console.error('Failed to remove previous card image:', cleanupError)
    }

    return jsonResponse(request, { uploaded: true, imageUrl: publicUrlData.publicUrl })
  } catch (error) {
    console.error('Unexpected upload-card error:', error)
    return jsonResponse(request, { error: 'Upload failed' }, 500)
  }
})
