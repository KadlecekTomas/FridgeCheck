'use client'

import Link from 'next/link'
import { AlertTriangle, ChevronDown, Refrigerator } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { DesktopNavigation } from './AppNavigation'

export function AppHeader({ userEmail }: { userEmail?: string | null }) {
  const {
    households,
    activeHousehold,
    activeHouseholdId,
    loading,
    error,
    setActiveHouseholdId,
  } = useHousehold()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="HlídačJídla – domů"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Refrigerator size={19} aria-hidden="true" />
          </span>
          <span className="hidden text-sm font-bold tracking-[-0.01em] text-text sm:inline">
            HlídačJídla
          </span>
        </Link>

        <div className="min-w-0 flex-1 md:max-w-56">
          {loading ? (
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface-muted" />
          ) : error ? (
            <div className="flex min-h-10 items-center gap-2 truncate text-sm font-semibold text-warning" title="Domácnosti se nepodařilo načíst">
              <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
              <span className="truncate">Načtení selhalo</span>
            </div>
          ) : households.length > 1 ? (
            <label className="relative block">
              <span className="sr-only">Aktivní domácnost</span>
              <select
                value={activeHouseholdId ?? ''}
                onChange={(event) => setActiveHouseholdId(event.target.value)}
                className="min-h-11 w-full appearance-none truncate rounded-xl border border-border bg-surface py-2 pl-3 pr-9 text-sm font-semibold text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {households.map((household) => (
                  <option value={household.id} key={household.id}>
                    {household.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
            </label>
          ) : activeHousehold ? (
            <div className="truncate text-sm font-semibold text-text">{activeHousehold.name}</div>
          ) : (
            <div className="text-sm text-text-muted">Bez domácnosti</div>
          )}
        </div>

        <DesktopNavigation />

        {userEmail ? (
          <span
            className="hidden max-w-40 truncate text-xs text-text-muted lg:block"
            title={userEmail}
          >
            {userEmail}
          </span>
        ) : null}
      </div>
    </header>
  )
}
