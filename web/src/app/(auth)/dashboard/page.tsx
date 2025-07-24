'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import EmptyState from '@/components/dashboard/EmptyState'
import StatsOverview from '@/components/dashboard/StatsOverview'
import FridgeSelector from '@/components/fridge/FridgeSelector'
import { InviteCodeManager } from '@/components/dashboard/InviteCodeManager'
import { JoinHouseholdInline } from '@/components/dashboard/JoinHouseholdForm'
import type { Household } from '@/types/models';
import { useHouseholds } from '@/lib/hooks/useHouseholds'
import { useStorageUnits } from '@/lib/hooks/useStorageUnits'


type HouseholdMemberRecord = {
  households: Household;
  user: {
    email: string;
    full_name?: string;
  };
}

export default function DashboardPage() {
  const router = useRouter()
  const {
    households,
    activeHousehold,
    setActiveHousehold,
    refreshHouseholds,
    loading: householdsLoading,
  } = useHouseholds()
  const {
    units: storageUnits,
    selectedUnitId,
    setSelectedUnitId,
    loading: unitsLoading,
    refreshUnits,
  } = useStorageUnits(activeHousehold?.id || null)
  const loading = householdsLoading || unitsLoading

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
        return
      }

      const joinedHouseholds = (memberData as HouseholdMemberRecord[])?.map(m => m.households) ?? []
      // setHouseholds(joinedHouseholds) // useHouseholds handles this

      if (joinedHouseholds.length === 0) {
        return
      }

      const savedHouseholdId = localStorage.getItem('active_household')
      const initial = joinedHouseholds.find(h => h.id === savedHouseholdId) || joinedHouseholds[0]

      setActiveHousehold(initial)
      localStorage.setItem('active_household', initial.id)

      // await fetchUnitsForHousehold(initial.id) // useStorageUnits handles this
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
          refreshUnits();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeHousehold]);


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
    refreshUnits()
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
    <div key={activeHousehold?.id} className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex flex-col">
          <label htmlFor="household-select" className="text-sm font-medium">
            Vybraná domácnost
          </label>
          <InviteCodeManager
            key={activeHousehold?.id}
            householdId={activeHousehold?.id}
            refreshTrigger={0} // No longer needed, refreshUnits handles realtime
          />
          <JoinHouseholdInline
            onJoined={async (joinedId) => {
              await refreshHouseholds(joinedId)
            }}
          />
          <select
            id="household-select"
            value={activeHousehold?.id}
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
            key={activeHousehold?.id + 0} // No longer needed, refreshUnits handles realtime
            householdId={activeHousehold?.id}
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
