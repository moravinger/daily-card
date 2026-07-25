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

export async function getArchivedCards(beforeDate, { from = 0, limit = 12 } = {}) {
  const { data, error } = await supabase
    .from('cards')
    .select('publish_date, image_url, updated_at')
    .lt('publish_date', beforeDate)
    .order('publish_date', { ascending: false })
    .range(from, from + limit - 1)

  if (error) throw error
  return data || []
}
