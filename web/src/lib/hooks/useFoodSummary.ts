import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'

export function useFoodSummary(storageUnitId?: string | null) {
    const [summary, setSummary] = useState<{ expired: number; soon: number } | null>(null)

    useEffect(() => {
        if (!storageUnitId) return

        const supabase = supabaseBrowser()

        const fetchSummary = async () => {
            const { data } = await supabase
                .from('view_food_summary_by_storage_unit')
                .select('*')
                .eq('storage_unit_id', storageUnitId)
                .single()

            if (data) {
                setSummary({
                    expired: data.expired_count ?? 0,
                    soon: data.expiring_soon_count ?? 0,
                })
            }
        }

        fetchSummary()

        const channel = supabase
            .channel('realtime-summary')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'foods',
                    filter: `storage_unit_id=eq.${storageUnitId}`,
                },
                () => {
                    fetchSummary()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [storageUnitId])

    return summary
}
