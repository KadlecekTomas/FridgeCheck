import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase-v2'

function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing public Supabase browser configuration')
  }

  return { url, key }
}

export const supabaseV2Browser = () => {
  const { url, key } = getSupabaseBrowserConfig()
  return createBrowserClient<Database>(url, key)
}
