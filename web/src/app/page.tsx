'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {

  useEffect(() => {
    const url = new URL(window.location.href)

    const hasAccessToken = url.hash.includes('access_token')
    if (hasAccessToken) {
      const params = new URLSearchParams(url.hash.slice(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        supabase.auth.setSession({
          access_token,
          refresh_token,
        })
      }

      // 🧹 Vyčisti URL – smaž hash
      history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  return <div>Jsi přihlášený.</div>
}
