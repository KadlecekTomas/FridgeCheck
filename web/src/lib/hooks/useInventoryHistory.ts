'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import type { Tables } from '@/types/supabase-v2'

const PAGE_SIZE = 50

type HistoryState = {
  events: Tables<'inventory_events'>[]
  products: Tables<'products'>[]
}

const EMPTY_STATE: HistoryState = {
  events: [],
  products: [],
}

async function fetchInitialHistory(householdId: string) {
  const supabase = supabaseV2Browser()
  const [eventsResult, productsResult] = await Promise.all([
    supabase
      .from('inventory_events')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from('products')
      .select('*')
      .eq('household_id', householdId)
      .order('name', { ascending: true }),
  ])

  const error = eventsResult.error ?? productsResult.error
  if (error) return { data: null, error }

  return {
    data: {
      events: eventsResult.data ?? [],
      products: productsResult.data ?? [],
    } satisfies HistoryState,
    error: null,
  }
}

export function useInventoryHistory(householdId: string | null) {
  const [state, setState] = useState<HistoryState>(EMPTY_STATE)
  const [loading, setLoading] = useState(Boolean(householdId))
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const refresh = useCallback(async () => {
    if (!householdId) {
      setState(EMPTY_STATE)
      setLoading(false)
      setLoadingMore(false)
      setHasMore(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const result = await fetchInitialHistory(householdId)

    if (result.error || !result.data) {
      setError('Historii změn se nepodařilo načíst.')
      setLoading(false)
      return
    }

    setState(result.data)
    setHasMore(result.data.events.length === PAGE_SIZE)
    setLoading(false)
  }, [householdId])

  const loadMore = useCallback(async () => {
    if (!householdId || loadingMore || !hasMore) return

    setLoadingMore(true)
    setError(null)
    const from = state.events.length
    const { data, error: queryError } = await supabaseV2Browser()
      .from('inventory_events')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (queryError) {
      setError('Starší změny se nepodařilo načíst.')
      setLoadingMore(false)
      return
    }

    const page = data ?? []
    setState((current) => {
      const knownIds = new Set(current.events.map((event) => event.id))
      const newEvents = page.filter((event) => !knownIds.has(event.id))
      return { ...current, events: [...current.events, ...newEvents] }
    })
    setHasMore(page.length === PAGE_SIZE)
    setLoadingMore(false)
  }, [hasMore, householdId, loadingMore, state.events.length])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await Promise.resolve()
      if (cancelled) return

      if (!householdId) {
        setState(EMPTY_STATE)
        setLoading(false)
        setLoadingMore(false)
        setHasMore(false)
        setError(null)
        return
      }

      setLoading(true)
      setLoadingMore(false)
      setError(null)
      const result = await fetchInitialHistory(householdId)
      if (cancelled) return

      if (result.error || !result.data) {
        setError('Historii změn se nepodařilo načíst.')
        setLoading(false)
        return
      }

      setState(result.data)
      setHasMore(result.data.events.length === PAGE_SIZE)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [householdId])

  return {
    ...state,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  }
}
