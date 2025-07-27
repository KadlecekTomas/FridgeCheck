import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '../auth/client';
import { Database } from '@/types/supabase';

type Household = Database['public']['Tables']['households']['Row']

type HouseholdMemberRecord = {
  households: Household;
  user_id: string;
  joined_at: string | null;
  role: string | null;
};

export function useHouseholds() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHouseholds = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabaseBrowser().auth.getSession();
    if (!session?.user) {
      setHouseholds([]);
      setActiveHousehold(null);
      setLoading(false);
      return;
    }
    const { data: memberData, error: memberError } = await supabaseBrowser()
      .from('household_members')
      .select('households(id, name, created_at, invite_code, owner_id), user_id, joined_at, role')
      .eq('user_id', session.user.id);
    if (memberError) {
      setHouseholds([]);
      setActiveHousehold(null);
      setLoading(false);
      return;
    }
    const joinedHouseholds = (memberData as HouseholdMemberRecord[])?.map(m => m.households) ?? [];
    setHouseholds(joinedHouseholds);
    if (joinedHouseholds.length === 0) {
      setActiveHousehold(null);
      setLoading(false);
      return;
    }
    const savedHouseholdId = localStorage.getItem('active_household');
    const initial = joinedHouseholds.find(h => h.id === savedHouseholdId) || joinedHouseholds[0];
    setActiveHousehold(initial);
    localStorage.setItem('active_household', initial.id);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  const refreshHouseholds = useCallback(async (forceHouseholdId?: string) => {
    await fetchHouseholds();
    if (forceHouseholdId) {
      setActiveHousehold(prev => {
        if (prev && prev.id === forceHouseholdId) return prev;
        const found = households.find(h => h.id === forceHouseholdId);
        if (found) {
          localStorage.setItem('active_household', found.id);
          return found;
        }
        return prev;
      });
    }
  }, [fetchHouseholds, households]);

  const selectHousehold = (household: Household | null) => {
    setActiveHousehold(household);
    if (household) localStorage.setItem('active_household', household.id);
  };

  return {
    households,
    activeHousehold,
    setActiveHousehold: selectHousehold,
    refreshHouseholds,
    loading,
  };
} 