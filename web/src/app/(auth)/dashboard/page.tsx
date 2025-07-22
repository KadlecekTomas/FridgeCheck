'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import EmptyState from '@/components/dashboard/EmptyState'
import StatsOverview from '@/components/dashboard/StatsOverview'
import FridgeSelector from '@/components/fridge/FridgeSelector'

type Household = {
  id: string
  name: string
}

type StorageUnit = {
  id: string
  name: string
  created_at: string | null
  owner_id: string | null
  household_id: string | null
  type: 'fridge' | 'freezer'
}

type HouseholdMemberRecord = {
  households: Household
}

export default function HomePage() {
  const router = useRouter()

  const [households, setHouseholds] = useState<Household[]>([])
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(null)

  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUnitsForHousehold = async (householdId: string) => {
    const supabase = supabaseBrowser()
    const { data, error } = await supabase
      .from('storage_units')
      .select('*')
      .eq('household_id', householdId)

    if (error) {
      console.error(error.message)
      setStorageUnits([])
      return
    }

    setStorageUnits(
      (data || []).map((unit) => ({
        ...unit,
        type: unit.type === 'fridge' || unit.type === 'freezer' ? unit.type : 'fridge',
      }))
    )
    const saved = localStorage.getItem(`active_fridge_${householdId}`)
    const defaultId = saved || data?.[0]?.id || null
    setSelectedUnitId(defaultId)
  }

  useEffect(() => {
    const fetchInitial = async () => {
      const supabase = supabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      const { data: memberData, error: memberError } = await supabase
        .from('household_members')
        .select('households(id, name)')
        .eq('user_id', session.user.id)

      if (memberError) {
        console.error(memberError.message)
        setLoading(false)
        return
      }

      const joinedHouseholds = (memberData as HouseholdMemberRecord[])?.map(m => m.households) ?? []
      setHouseholds(joinedHouseholds)

      if (joinedHouseholds.length === 0) {
        setLoading(false)
        return
      }

      const savedHouseholdId = localStorage.getItem('active_household')
      const initial = joinedHouseholds.find(h => h.id === savedHouseholdId) || joinedHouseholds[0]

      setActiveHousehold(initial)
      localStorage.setItem('active_household', initial.id)

      await fetchUnitsForHousehold(initial.id)
      setLoading(false)
    }

    fetchInitial()
  }, [])

  const handleSelectUnit = (id: string) => {
    setSelectedUnitId(id)
    if (activeHousehold) {
      localStorage.setItem(`active_fridge_${activeHousehold.id}`, id)
    }
  }

  const handleSelectHousehold = async (id: string) => {
    const household = households.find(h => h.id === id) || null
    setActiveHousehold(household)
    localStorage.setItem('active_household', id)
    await fetchUnitsForHousehold(id)
  }

  if (loading) return <p className="p-6">Načítání...</p>

  if (!activeHousehold) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">Nemáte žádnou domácnost.</p>
        <button
          onClick={() => router.push('/dashboard/new-household')}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Vytvořit domácnost
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex flex-col">
          <label htmlFor="household-select" className="text-sm font-medium">
            Vybraná domácnost
          </label>
          <select
            id="household-select"
            value={activeHousehold.id}
            onChange={(e) => handleSelectHousehold(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {storageUnits.length > 0 ? (
        <>
          <FridgeSelector
            householdId={activeHousehold.id}
            onSelect={handleSelectUnit}
            selectedId={selectedUnitId}
          />
          {selectedUnitId ? (
            <StatsOverview fridgeId={selectedUnitId} />
          ) : (
            <p>Vyber sekci pro zobrazení dat.</p>
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
