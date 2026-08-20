'use client'

import { useRouter } from 'next/navigation'
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

async function fetchHouseholds() {
  return supabaseV2Browser()
    .from('households')
    .select('*')
    .order('created_at', { ascending: true })
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyHouseholds = useCallback((nextHouseholds: Household[], preferredId?: string) => {
    setHouseholds(nextHouseholds)

    if (nextHouseholds.length === 0) {
      setActiveHouseholdIdState(null)
      window.localStorage.removeItem(STORAGE_KEY)
      setLoading(false)
      return
    }

    const savedId = window.localStorage.getItem(STORAGE_KEY)
    const nextId =
      [preferredId, savedId].find(
        (candidate) => candidate && nextHouseholds.some((household) => household.id === candidate)
      ) ?? nextHouseholds[0].id

    setActiveHouseholdIdState(nextId)
    window.localStorage.setItem(STORAGE_KEY, nextId)
    setLoading(false)
  }, [])

  const refreshHouseholds = useCallback(
    async (preferredId?: string) => {
      const creatingFirstHousehold = Boolean(preferredId) && households.length === 0
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await fetchHouseholds()

      if (queryError) {
        setHouseholds([])
        setActiveHouseholdIdState(null)
        setError('Domácnosti se nepodařilo načíst.')
        setLoading(false)
        return
      }

      const nextHouseholds = data ?? []
      applyHouseholds(nextHouseholds, preferredId)

      if (
        creatingFirstHousehold &&
        preferredId &&
        nextHouseholds.some((household) => household.id === preferredId)
      ) {
        router.replace('/inventory/new')
      }
    },
    [applyHouseholds, households.length, router]
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data, error: queryError } = await fetchHouseholds()
      if (cancelled) return

      if (queryError) {
        setHouseholds([])
        setActiveHouseholdIdState(null)
        setError('Domácnosti se nepodařilo načíst.')
        setLoading(false)
        return
      }

      applyHouseholds(data ?? [])
    })()

    return () => {
      cancelled = true
    }
  }, [applyHouseholds])

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
