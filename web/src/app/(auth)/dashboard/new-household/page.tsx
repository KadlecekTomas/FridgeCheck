'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'

export default function NewHouseholdPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Název domácnosti je povinný.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = supabaseBrowser()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      setError('Nejste přihlášen.')
      setLoading(false)
      return
    }

    const userId = session.user.id

    // 1. Vytvoř domácnost s owner_id
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({
        name,
        owner_id: userId
      })
      .select()
      .single()

    if (householdError || !household) {
      setError('Nepodařilo se vytvořit domácnost.')
      setLoading(false)
      return
    }

    // 2. Přidej ownera jako člena
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        user_id: userId,
        household_id: household.id,
        role: 'owner', // přidej roli, pokud používáš
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      setError('Nepodařilo se přidat uživatele do domácnosti.')
      setLoading(false)
      return
    }

    // 3. Přesměruj na dashboard
    router.push('/dashboard')
  }


  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Vytvořit novou domácnost</h1>

      <input
        type="text"
        placeholder="Název domácnosti"
        className="w-full p-2 border rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />

      {error && <p className="text-red-600">{error}</p>}

      <button
        onClick={handleCreate}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
        disabled={loading}
      >
        {loading ? 'Vytvářím...' : 'Vytvořit'}
      </button>
    </div>
  )
}
