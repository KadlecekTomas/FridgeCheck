'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import type { Tables } from '@/types/supabase-v2'

export type DashboardV2Data = {
  storageUnits: Tables<'storage_units'>[]
  products: Tables<'products'>[]
  batches: Tables<'inventory_batches'>[]
  stockTargets: Tables<'stock_targets'>[]
  shoppingItems: Tables<'shopping_list_items'>[]
}

const EMPTY_DATA: DashboardV2Data = {
  storageUnits: [],
  products: [],
  batches: [],
  stockTargets: [],
  shoppingItems: [],
}

async function fetchDashboardData(householdId: string) {
  const supabase = supabaseV2Browser()
  const [storageResult, productResult, batchResult, targetResult, shoppingResult] =
    await Promise.all([
      supabase
        .from('storage_units')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true }),
      supabase
        .from('products')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true }),
      supabase
        .from('inventory_batches')
        .select('*')
        .eq('household_id', householdId)
        .order('expiry_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('stock_targets')
        .select('*')
        .eq('household_id', householdId),
      supabase
        .from('shopping_list_items')
        .select('*')
        .eq('household_id', householdId)
        .order('checked', { ascending: true })
        .order('created_at', { ascending: false }),
    ])

  const queryError =
    storageResult.error ??
    productResult.error ??
    batchResult.error ??
    targetResult.error ??
    shoppingResult.error

  if (queryError) {
    return { data: null, error: queryError }
  }

  return {
    data: {
      storageUnits: storageResult.data ?? [],
      products: productResult.data ?? [],
      batches: batchResult.data ?? [],
      stockTargets: targetResult.data ?? [],
      shoppingItems: shoppingResult.data ?? [],
    } satisfies DashboardV2Data,
    error: null,
  }
}

export function useDashboardV2(householdId: string | null) {
  const [data, setData] = useState<DashboardV2Data>(EMPTY_DATA)
  const [loading, setLoading] = useState(Boolean(householdId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!householdId) {
      setData(EMPTY_DATA)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const result = await fetchDashboardData(householdId)

    if (result.error || !result.data) {
      setError('Data domácnosti se nepodařilo načíst.')
      setLoading(false)
      return
    }

    setData(result.data)
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      // The async boundary avoids synchronous state cascades from the effect while
      // still switching the UI into a loading state before the network result lands.
      await Promise.resolve()
      if (cancelled) return

      if (!householdId) {
        setData(EMPTY_DATA)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      const result = await fetchDashboardData(householdId)
      if (cancelled) return

      if (result.error || !result.data) {
        setError('Data domácnosti se nepodařilo načíst.')
        setLoading(false)
        return
      }

      setData(result.data)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [householdId])

  return { ...data, loading, error, refresh }
}
