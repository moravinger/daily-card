import { supabase } from '../config.js'

export async function getCardByDate(date) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('publish_date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error) {
    console.error('Error fetching card:', error)
    throw error
  }
}

export async function uploadCardImage(file, date) {
  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Файл слишком большой (максимум 5 МБ)')
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Это не изображение')
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `card_${date}.${ext}`

    const { data, error } = await supabase.storage
      .from('card-images')
      .upload(fileName, file, {
        upsert: true,
      })

    if (error) throw error

    const { data: publicUrlData } = supabase.storage
      .from('card-images')
      .getPublicUrl(fileName)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export async function saveCard(date, imageUrl, caption = '') {
  try {
    const existing = await getCardByDate(date)

    if (existing) {
      const { data, error } = await supabase
        .from('cards')
        .update({
          image_url: imageUrl,
          caption: caption,
          updated_at: new Date().toISOString(),
        })
        .eq('publish_date', date)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('cards')
        .insert([
          {
            publish_date: date,
            image_url: imageUrl,
            caption: caption,
          },
        ])
        .select()
        .single()

      if (error) throw error
      return data
    }
  } catch (error) {
    console.error('Error saving card:', error)
    throw error
  }
}
