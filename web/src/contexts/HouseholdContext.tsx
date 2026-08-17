'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import type { Tables } from '@/types/supabase-v2'

type Household = Tables<'households'>

type HouseholdContextValue = {
  households: Household[]
  activeHousehold: Household | null
  activeHouseholdId: string | null
  loading: boolean
  error: string | null
  setActiveHouseholdId: (id: string) => void
  refreshHouseholds: (preferredId?: string) => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)
const STORAGE_KEY = 'fridgecheck_active_household'

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshHouseholds = useCallback(async (preferredId?: string) => {
    setLoading(true)
    setError(null)

    const supabase = supabaseV2Browser()
    const { data, error: queryError } = await supabase
      .from('households')
      .select('*')
      .order('created_at', { ascending: true })

    if (queryError) {
      setHouseholds([])
      setActiveHouseholdIdState(null)
      setError('Domácnosti se nepodařilo načíst.')
      setLoading(false)
      return
    }

    const nextHouseholds = data ?? []
    setHouseholds(nextHouseholds)

    if (nextHouseholds.length === 0) {
      setActiveHouseholdIdState(null)
      window.localStorage.removeItem(STORAGE_KEY)
      setLoading(false)
      return
    }

    const savedId = window.localStorage.getItem(STORAGE_KEY)
    const nextId =
      [preferredId, savedId, activeHouseholdId].find(
        (candidate) => candidate && nextHouseholds.some((household) => household.id === candidate)
      ) ?? nextHouseholds[0].id

    setActiveHouseholdIdState(nextId)
    window.localStorage.setItem(STORAGE_KEY, nextId)
    setLoading(false)
  }, [activeHouseholdId])

  useEffect(() => {
    void refreshHouseholds()
  }, [refreshHouseholds])

  const setActiveHouseholdId = useCallback(
    (id: string) => {
      if (!households.some((household) => household.id === id)) return
      setActiveHouseholdIdState(id)
      window.localStorage.setItem(STORAGE_KEY, id)
    },
    [households]
  )

  const activeHousehold = useMemo(
    () => households.find((household) => household.id === activeHouseholdId) ?? null,
    [activeHouseholdId, households]
  )

  const value = useMemo<HouseholdContextValue>(
    () => ({
      households,
      activeHousehold,
      activeHouseholdId,
      loading,
      error,
      setActiveHouseholdId,
      refreshHouseholds,
    }),
    [
      households,
      activeHousehold,
      activeHouseholdId,
      loading,
      error,
      setActiveHouseholdId,
      refreshHouseholds,
    ]
  )

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

export function useHousehold() {
  const context = useContext(HouseholdContext)
  if (!context) {
    throw new Error('useHousehold must be used inside HouseholdProvider')
  }
  return context
}
