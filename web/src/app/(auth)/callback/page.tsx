'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

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
        }).then(() => {
          router.push('/') 
        })
      }

      history.replaceState(null, '', window.location.pathname)
    } else {
      router.push('/')
    }
  }, [router])

  return null
}
