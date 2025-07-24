import { useEffect, useState, useCallback, useRef } from 'react'
import { supabaseBrowser } from '../auth/client'
import type { StorageUnit } from '@/types/supabase'

export function useStorageUnits(householdId: string | null) {
  const [units, setUnits] = useState<StorageUnit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const householdIdRef = useRef(householdId)

  useEffect(() => {
    householdIdRef.current = householdId
  }, [householdId])

  const fetchUnits = useCallback(async () => {
    const currentHouseholdId = householdIdRef.current
    setLoading(true)
    if (!currentHouseholdId) {
      setLoading(false)
      return
    }
    const supabase = supabaseBrowser()
    const { data, error } = await supabase
      .from('storage_units')
      .select('*')
      .eq('household_id', currentHouseholdId)
    if (householdIdRef.current !== currentHouseholdId) return
    if (error) {
      setUnits([])
      setSelectedUnitId(null)
    } else {
      setUnits(data)
      setSelectedUnitId(prev => {
        if (!data || data.length === 0) return null
        if (prev && data.some(u => u.id === prev)) return prev
        return data[0].id
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    fetchUnits();

    if (!householdId) return;

    const supabase = supabaseBrowser();
    const channel = supabase.channel('realtime-storage-units-' + householdId);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'storage_units',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          if (isMounted) fetchUnits();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel); // DŮLEŽITÉ: správně odhlásit!
    };
  }, [householdId, fetchUnits]);

  const selectUnit = (id: string) => {
    setSelectedUnitId(id)
    if (householdId) {
      localStorage.setItem(`active_fridge_${householdId}`, id)
    }
  }

  return {
    units,
    selectedUnitId,
    setSelectedUnitId: selectUnit,
    loading,
    refreshUnits: fetchUnits,
  }
}
