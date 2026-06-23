export const CONFIG = {
  ADMIN_ID: Number(window.CONFIG?.ADMIN_ID ?? 0),
}

export const supabase = window.supabase?.createClient(
  window.CONFIG?.SUPABASE_URL,
  window.CONFIG?.SUPABASE_ANON_KEY,
)
