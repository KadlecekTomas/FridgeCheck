'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'

type StorageUnit = {
  id: string
  name: string
}

export default function DashboardPage() {
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = supabaseBrowser()

  const fetchStorageUnits = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (!session?.user || sessionError) {
      console.error('Nepřihlášený uživatel')
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('storage_units')
      .select('id, name')
      .eq('owner_id', session.user.id)

    if (error) {
      console.error('Chyba při načítání úložišť:', error.message)
      setStorageUnits([]) // fallback
    } else {
      setStorageUnits(data || [])
      console.log('✅ storageUnits aktualizovány:', data.length)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchStorageUnits()

    const channel = supabase
      .channel('storage_units_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'storage_units',
        },
        (payload) => {
          console.log('📦 storage_units změna:', payload)
          fetchStorageUnits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return <div className="p-6">Načítání...</div>

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Moje lednice</h1>
        <Link
          href="/storage/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Přidat lednici
        </Link>
      </div>

      {storageUnits.length === 0 ? (
        <p>Nemáš žádné lednice. Přidej si první!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storageUnits.map((unit) => (
            <Link
              key={unit.id}
              href={`/storage/${unit.id}`}
              className="border rounded p-4 hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold">{unit.name}</h2>
              <p className="text-sm text-gray-600">Klikni pro detaily</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
