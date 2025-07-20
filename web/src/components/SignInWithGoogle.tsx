'use client'

import { supabase } from '../lib/supabase'

export default function SignInWithGoogle() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000', // změň podle potřeby
      },
    })

    if (error) {
      console.error('Google login error:', error.message)
    }
  }

  return (
    <button onClick={handleGoogleLogin} style={{ padding: 10, fontSize: 16 }}>
      Přihlásit se přes Google
    </button>
  )
}
