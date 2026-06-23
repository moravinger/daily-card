import { createClient } from '@supabase/supabase-js'

export const CONFIG = {
  ADMIN_ID: Number(import.meta.env.VITE_ADMIN_ID ?? 0),
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
