import { createClient } from '@supabase/supabase-js'

export const CONFIG = {
  ADMIN_ID: Number(window.CONFIG?.ADMIN_ID ?? 0),
}

export const supabase = createClient(
  window.CONFIG?.SUPABASE_URL,
  window.CONFIG?.SUPABASE_ANON_KEY,
)
