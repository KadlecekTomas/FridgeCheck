import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TestLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sessionInfo, setSessionInfo] = useState<string | null>(null)

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error.message)
      setSessionInfo(`Error: ${error.message}`)
    } else {
      console.log('Session:', data.session)
      setSessionInfo(JSON.stringify(data.session, null, 2))
    }
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>FridgeCheck Web Login Test</h1>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 10 }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: 10 }}
      />
      <button onClick={handleLogin}>Login</button>

      <pre style={{ marginTop: 20 }}>{sessionInfo}</pre>
    </div>
  )
}
