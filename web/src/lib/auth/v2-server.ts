import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase-v2'

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing public Supabase server configuration')
  }

  return { url, key }
}

export async function supabaseV2Server() {
  const { url, key } = getSupabaseServerConfig()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot always write cookies. A refresh-capable
          // middleware/proxy can own token rotation without weakening reads.
        }
      },
    },
  })
}

export async function getCurrentUserV2() {
  const supabase = await supabaseV2Server()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
