import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '../auth/client';
import type { StorageUnit } from '@/types/supabase';

export function useStorageUnits(householdId: string | null) {
  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUnits = useCallback(async () => {
    if (!householdId) {
      setUnits([]);
      setSelectedUnitId(null);
      return;
    }
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase
      .from('storage_units')
      .select('*')
      .eq('household_id', householdId);
    if (error) {
      setUnits([]);
      setSelectedUnitId(null);
      setLoading(false);
      return;
    }
    setUnits(data);
    const saved = localStorage.getItem(`active_fridge_${householdId}`);
    const defaultId = saved || data?.[0]?.id || null;
    setSelectedUnitId(defaultId);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    fetchUnits();
    if (!householdId) return;
    const supabase = supabaseBrowser();
    const channel = supabase.channel('realtime-storage-units');
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
          fetchUnits();
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [householdId, fetchUnits]);

  const selectUnit = (id: string) => {
    setSelectedUnitId(id);
    if (householdId) {
      localStorage.setItem(`active_fridge_${householdId}`, id);
    }
  };

  return {
    units,
    selectedUnitId,
    setSelectedUnitId: selectUnit,
    loading,
    refreshUnits: fetchUnits,
  };
} 