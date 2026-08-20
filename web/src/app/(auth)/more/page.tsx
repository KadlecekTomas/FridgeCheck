'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Home, LogOut, Plus, Warehouse } from 'lucide-react'
import { InstallAppCard } from '@/components/app/InstallAppCard'
import { useHousehold } from '@/contexts/HouseholdContext'
import { supabaseV2Browser } from '@/lib/auth/v2-client'

function householdCountLabel(count: number) {
  if (count === 1) return '1 domácnost'
  if (count >= 2 && count <= 4) return `${count} domácnosti`
  return `${count} domácností`
}

export default function MorePage() {
  const router = useRouter()
  const {
    households,
    activeHousehold,
    refreshHouseholds,
  } = useHousehold()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [householdError, setHouseholdError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const createHousehold = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setCreating(true)
    setHouseholdError(null)
    const { data, error: rpcError } = await supabaseV2Browser().rpc('create_household', {
      household_name: trimmed,
    })

    if (rpcError || !data) {
      setHouseholdError('Domácnost se nepodařilo vytvořit. Zkus to prosím znovu.')
      setCreating(false)
      return
    }

    setName('')
    await refreshHouseholds(data)
    setCreating(false)
  }

  const signOut = async () => {
    if (signingOut) return

    setSigningOut(true)
    setAccountError(null)
    const { error: signOutError } = await supabaseV2Browser().auth.signOut()

    if (signOutError) {
      setAccountError('Odhlášení se nepodařilo. Zkontroluj připojení a zkus to znovu.')
      setSigningOut(false)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-[30px] font-bold tracking-[-0.03em] text-text">Více</h1>
        <p className="mt-1 text-sm text-text-muted">Domácnosti, úložná místa, historie a účet.</p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Home size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-text">Domácnosti</h2>
            <p className="text-sm text-text-muted">
              {households.length === 0 ? 'Zatím žádná domácnost' : householdCountLabel(households.length)}
            </p>
          </div>
        </div>

        {activeHousehold ? (
          <div className="mt-5 rounded-2xl bg-canvas p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Používáš</p>
            <p className="mt-1 font-semibold text-text">{activeHousehold.name}</p>
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
        {householdError ? <p className="mt-3 text-sm text-danger" role="alert">{householdError}</p> : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/more/storage"
          className="flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/30 hover:bg-primary-soft/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Warehouse size={19} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-text">Úložná místa</span>
            <span className="mt-0.5 block text-sm leading-5 text-text-muted">Lednice, mrazák, spíž a další.</span>
          </span>
        </Link>

        <Link
          href="/history"
          className="flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/30 hover:bg-primary-soft/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Clock3 size={19} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-text">Historie změn</span>
            <span className="mt-0.5 block text-sm leading-5 text-text-muted">Nákupy, spotřeba, vyhození a opravy stavu.</span>
          </span>
        </Link>
      </div>

      <InstallAppCard />

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-bold text-text">Účet</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">Odhlásíš se z HlídačeJídla na tomto zařízení.</p>
        {accountError ? <p className="mt-3 text-sm text-danger" role="alert">{accountError}</p> : null}
        <button type="button" onClick={() => void signOut()} disabled={signingOut} className="button-secondary mt-5 text-danger">
          <LogOut size={17} aria-hidden="true" />
          {signingOut ? 'Odhlašuji…' : 'Odhlásit se'}
        </button>
      </section>
    </div>
  )
}
