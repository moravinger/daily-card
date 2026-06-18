import { createClient } from '@supabase/supabase-js'

export const CONFIG = {
  ADMIN_ID: Number(import.meta.env.VITE_ADMIN_ID),
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
