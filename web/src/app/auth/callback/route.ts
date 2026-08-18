import { NextResponse } from 'next/server'
import { supabaseV2Server } from '@/lib/auth/v2-server'

const RECOVERY_DESTINATION = '/update-password'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next')
  const next = requestedNext === RECOVERY_DESTINATION ? RECOVERY_DESTINATION : '/dashboard'

  if (code) {
    const supabase = await supabaseV2Server()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/forgot-password?error=invalid-link', requestUrl.origin))
}
