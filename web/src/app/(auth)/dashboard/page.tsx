'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import EmptyState from '@/components/dashboard/EmptyState'
import StatsOverview from '@/components/dashboard/StatsOverview'
import FridgeSelector from '@/components/fridge/FridgeSelector'
import { InviteCodeManager } from '@/components/dashboard/InviteCodeManager'
import { JoinHouseholdInline } from '@/components/dashboard/JoinHouseholdForm'

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
  type: string
}


type HouseholdMemberRecord = {
  households: Household;
  user: {
    email: string;
    full_name?: string;
  };
}


export default function HomePage() {
  const router = useRouter()

  const [households, setHouseholds] = useState<Household[]>([])
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(null)
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0)
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

    console.log('Nová data:', data)
    console.log('Stará data:', storageUnits)
    console.log('Stejná reference?', data === storageUnits)
    setStorageUnits([...data])

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

  useEffect(() => {
    if (!activeHousehold) return;

    const supabase = supabaseBrowser();
    const channel = supabase.channel('realtime-storage-units');

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'storage_units',
          filter: `household_id=eq.${activeHousehold.id}`,
        },
        (payload) => {
          console.log('Realtime změna:', payload);
          fetchUnitsForHousehold(activeHousehold.id);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeHousehold]);


  const refreshHouseholds = async (forceHouseholdId?: string) => {
    const supabase = supabaseBrowser()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) return

    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('households(id, name)')
      .eq('user_id', session.user.id)

    if (memberError || !memberData) return

    const joinedHouseholds = (memberData as HouseholdMemberRecord[])?.map(m => m.households) ?? []
    setHouseholds(joinedHouseholds)

    const targetId = forceHouseholdId ?? joinedHouseholds[joinedHouseholds.length - 1]?.id
    if (targetId) {
      const found = joinedHouseholds.find(h => h.id === targetId)
      if (found) {
        setActiveHousehold({ id: found.id, name: found.name })
      }
      localStorage.setItem('active_household', targetId)
      await fetchUnitsForHousehold(targetId)
    }
    setInviteRefreshKey(prev => prev + 1)
  }


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
      <>
        <JoinHouseholdInline
          onJoined={async (joinedId) => {
            await refreshHouseholds(joinedId)
          }}
        />
        <div className="p-6 text-center">
          <p className="mb-4">Nemáte žádnou domácnost.</p>
          <button
            onClick={() => router.push('/dashboard/new-household')}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Vytvořit domácnost
          </button>
        </div>
      </>
    )
  }

  console.log('storageUnits:', storageUnits);
  console.log('selectedUnitId:', selectedUnitId);
  return (
    <div key={activeHousehold.id} className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex flex-col">
          <label htmlFor="household-select" className="text-sm font-medium">
            Vybraná domácnost
          </label>
          <InviteCodeManager
            key={activeHousehold.id}
            householdId={activeHousehold.id}
            refreshTrigger={inviteRefreshKey}
          />
          <JoinHouseholdInline
            onJoined={async (joinedId) => {
              await refreshHouseholds(joinedId)
            }}
          />
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
            key={activeHousehold.id + inviteRefreshKey}
            householdId={activeHousehold.id}
            onSelect={handleSelectUnit}
            selectedId={selectedUnitId}
            units={storageUnits}
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
