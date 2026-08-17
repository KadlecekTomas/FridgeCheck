import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase-v2'

export const supabaseV2Browser = () => createPagesBrowserClient<Database>()
