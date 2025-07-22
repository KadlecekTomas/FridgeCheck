'use client';

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'

export default function CreateFridgePage() {
  const [name, setName] = useState('')
  const [type, setType] = useState<'fridge' | 'freezer' | 'pantry'>('fridge')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setError('Nepřihlášený uživatel');
      setLoading(false);
      return;
    }

    const householdId = localStorage.getItem('active_household');
    if (!householdId) {
      setError('Není vybraná žádná domácnost');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('storage_units').insert([
      {
        name,
        type: type as string,
        owner_id: session.user.id,
        created_at: new Date().toISOString(),
        household_id: householdId
      }
    ]);


    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Přidat úložiště</h1>

        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

        <input
          type="text"
          placeholder="Název (např. Lednice v kuchyni)"
          className="w-full p-2 border rounded mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <select
          className="w-full p-2 border rounded mb-4"
          value={type}
          onChange={(e) => setType(e.target.value as 'fridge' | 'freezer' | 'pantry')}
        >
          <option value="fridge">Lednice</option>
          <option value="freezer">Mrazák</option>
          <option value="pantry">Spíž</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {loading ? 'Přidávám...' : 'Přidat'}
        </button>
      </form>
    </div>
  )
}
