import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase-v2'

export const supabaseV2Server = () =>
  createServerComponentClient<Database>({ cookies })

export const getCurrentUserV2 = async () => {
  const supabase = supabaseV2Server()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
