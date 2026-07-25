import { supabase } from '../config.js'

export async function getCardByDate(date) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('image_url, updated_at')
      .eq('publish_date', date)
      .maybeSingle()

    if (error) throw error

    return data || null
  } catch (error) {
    console.error('Error fetching card:', error)
    throw error
  }
}
