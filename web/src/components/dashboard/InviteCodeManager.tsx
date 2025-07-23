'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'
import { toast } from 'sonner'

export function InviteCodeManager({
  householdId,
  refreshTrigger = 0,
}: {
  householdId: string
  refreshTrigger?: number
}) {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [memberLimit, setMemberLimit] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const supabase = supabaseBrowser()

    const { data: householdView, error: viewError } = await supabase
      .from('household_with_member_count')
      .select('invite_code, member_count')
      .eq('id', householdId)
      .single()

    if (viewError || !householdView) {
      console.error('Chyba načítání household view:', viewError?.message)
      setLoading(false)
      return
    }

    setInviteCode(householdView.invite_code)
    setMemberCount(householdView.member_count)

    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    if (!userId) {
      toast.error('Nepřihlášený uživatel')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Chyba při načítání profilu:', profileError.message)
      setLoading(false)
      return
    }

    if (!profile) {
      toast.error('Uživatelský profil nenalezen.')
      setLoading(false)
      return
    }

    const limit = profile?.is_premium ? 999 : 5
    setMemberLimit(limit)

    setLoading(false)
  }

  const regenerateCode = async () => {
    setLoading(true)
    const supabase = supabaseBrowser()

    const { error } = await supabase.rpc('regenerate_invite_code', {
      household_uuid: householdId,
    })

    if (error) {
      toast.error('Nepodařilo se obnovit kód.')
    } else {
      toast.success('Kód úspěšně obnoven.')
      await fetchData()
      // volitelně:
      // onForceRefresh?.() // ⬅️ callback z parentu, pokud chceš prop
    }

    setLoading(false)
  }

  // 📡 Realtime listener + refresh trigger
  useEffect(() => {
    const supabase = supabaseBrowser()
    fetchData()

    const channel = supabase
      .channel(`realtime:household_members:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${householdId}`,
        },
        async (payload) => {
          console.log('📡 Změna v household_members:', payload)
          await fetchData()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Realtime připojeno na household_members pro ${householdId}`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, refreshTrigger])

  return (
    <div className="p-4 border rounded-md bg-gray-50 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm text-gray-600">Kód pro připojení k domácnosti:</p>
        <span className="text-sm text-gray-500">
          {memberCount !== null && memberLimit !== null
            ? `${memberCount}/${memberLimit} členů`
            : '...'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <code className="font-mono text-lg">{inviteCode || 'Načítám...'}</code>
        <button
          onClick={regenerateCode}
          className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Obnovuji...' : 'Obnovit'}
        </button>
      </div>
    </div>
  )
}
