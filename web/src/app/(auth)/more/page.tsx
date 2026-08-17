'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, LogOut, Plus } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'

export default function MorePage() {
  const router = useRouter()
  const {
    households,
    activeHousehold,
    activeHouseholdId,
    refreshHouseholds,
  } = useHousehold()
  const dashboard = useDashboardV2(activeHouseholdId)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createHousehold = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setCreating(true)
    setError(null)
    const { data, error: rpcError } = await supabaseV2Browser().rpc('create_household', {
      household_name: trimmed,
    })

    if (rpcError || !data) {
      setError('Domácnost se nepodařilo vytvořit.')
      setCreating(false)
      return
    }

    setName('')
    await refreshHouseholds(data)
    setCreating(false)
  }

  const signOut = async () => {
    await supabaseV2Browser().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-[30px] font-bold tracking-[-0.03em] text-text">Více</h1>
        <p className="mt-1 text-sm text-text-muted">
          Správa domácností a účtu mimo každodenní food loop.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Home size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-text">Domácnosti</h2>
            <p className="text-sm text-text-muted">
              {households.length === 0
                ? 'Zatím žádná domácnost'
                : `${households.length} ${households.length === 1 ? 'domácnost' : 'domácnosti'}`}
            </p>
          </div>
        </div>

        {activeHousehold ? (
          <div className="mt-5 rounded-2xl bg-canvas p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Aktivní</p>
            <p className="mt-1 font-semibold text-text">{activeHousehold.name}</p>
            {dashboard.storageUnits.length > 0 ? (
              <p className="mt-1 text-sm text-text-muted">
                {dashboard.storageUnits.map((storage) => storage.name).join(' · ')}
              </p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={createHousehold} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Název nové domácnosti</span>
            <input
              className="input-field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nová domácnost"
              maxLength={80}
            />
          </label>
          <button type="submit" className="button-secondary shrink-0" disabled={creating || !name.trim()}>
            <Plus size={17} aria-hidden="true" />
            {creating ? 'Vytvářím…' : 'Přidat domácnost'}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-bold text-text">Účet</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          Odhlášení ukončí lokální Supabase session na tomto zařízení.
        </p>
        <button type="button" onClick={() => void signOut()} className="button-secondary mt-5 text-danger">
          <LogOut size={17} aria-hidden="true" />
          Odhlásit se
        </button>
      </section>
    </div>
  )
}
