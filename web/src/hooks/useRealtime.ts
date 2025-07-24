import { useEffect } from 'react'
import {
  RealtimePostgresChangesPayload,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
  RealtimePostgresDeletePayload,
} from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/auth/client'

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

/**
 * Bezpečnější typ – místo `any` použij `unknown` (pro ESLint)
 */
type GenericObject = Record<string, unknown>

type Options<T extends GenericObject> = {
  table: string
  schema?: string
  event?: EventType
  filter?: string
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void
}

export function useRealtime<T extends GenericObject>({
  table,
  schema = 'public',
  event = '*',
  filter = '',
  onChange,
}: Options<T>) {
  useEffect(() => {
    const supabase = supabaseBrowser()
    const channel = supabase.channel(`realtime:${table}:${filter}`)

    switch (event) {
      case 'INSERT':
        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema, table, filter } as const,
          (payload: RealtimePostgresInsertPayload<T>) => onChange(payload)
        )
        break
      case 'UPDATE':
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema, table, filter } as const,
          (payload: RealtimePostgresUpdatePayload<T>) => onChange(payload)
        )
        break
      case 'DELETE':
        channel.on(
          'postgres_changes',
          { event: 'DELETE', schema, table, filter } as const,
          (payload: RealtimePostgresDeletePayload<T>) => onChange(payload)
        )
        break
      case '*':
      default:
        channel.on(
          'postgres_changes',
          { event: '*', schema, table, filter } as const,
          (payload: RealtimePostgresChangesPayload<T>) => onChange(payload)
        )
        break
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, schema, event, filter, onChange])
}
