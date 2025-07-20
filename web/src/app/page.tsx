'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import EmptyState from '@/components/dashboard/EmptyState'
import StatsOverview from '@/components/dashboard/StatsOverview'
import FridgeSelector from '@/components/fridge/FridgeSelector'

type Fridge = {
  id: string
  name: string
  created_at: string | null
  invite_code: string | null
  owner_id: string | null
}

export default function HomePage() {
  const [fridges, setFridges] = useState<Fridge[]>([])
  const [selectedFridgeId, setSelectedFridgeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchFridges = async () => {
      const supabase = supabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('fridges')
        .select('*')
        .eq('owner_id', session.user.id)

      if (error) {
        console.error(error.message)
      } else {
        setFridges(data || [])

        const saved = localStorage.getItem('active_fridge')
        const defaultId = saved || data?.[0]?.id || null
        setSelectedFridgeId(defaultId)
      }

      setLoading(false)
    }

    fetchFridges()
  }, [])

  const handleSelectFridge = (id: string) => {
    setSelectedFridgeId(id)
    localStorage.setItem('active_fridge', id)
  }

  if (loading) return <p className="p-6">Načítání...</p>

  return (
    <div className="p-6 space-y-6">
      {fridges.length > 0 ? (
        <>
          {/* výběr lednice */}
          <FridgeSelector
            onSelect={handleSelectFridge}
          />

          {/* přehled statistik pro aktivní lednici */}
          {selectedFridgeId ? (
            <StatsOverview fridgeId={selectedFridgeId} />
          ) : (
            <p>Vyber lednici pro zobrazení dat.</p>
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
