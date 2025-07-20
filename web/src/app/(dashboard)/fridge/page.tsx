'use client';

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import ProtectedRoute from '../../ProtectedRoute'

type Fridge = {
  id: string
  name: string
}

export default function DashboardPage() {
  const [fridges, setFridges] = useState<Fridge[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = supabaseBrowser()

  useEffect(() => {
    const fetchFridges = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!session?.user || sessionError) {
        console.error('Nepřihlášený uživatel');
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('fridges')
        .select('id, name')
        .eq('owner_id', session.user.id);

      if (error) {
        console.error('Chyba při načítání lednic:', error.message);
      } else {
        setFridges(data);
      }

      setLoading(false);
    };

    fetchFridges();
  }, []);

  if (loading) return <div className="p-6">Načítání...</div>

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Moje lednice</h1>
          <Link
            href="/fridge/new"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Přidat lednici
          </Link>
        </div>

        {fridges.length === 0 ? (
          <p>Nemáš žádné lednice. Přidej si první!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fridges.map((fridge) => (
              <Link
                key={fridge.id}
                href={`/fridge/${fridge.id}`}
                className="border rounded p-4 hover:shadow-md transition"
              >
                <h2 className="text-lg font-semibold">{fridge.name}</h2>
                <p className="text-sm text-gray-600">Klikni pro detaily</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
