'use client'

import { HouseholdProvider, useHousehold } from '@/contexts/HouseholdContext'
import { AppHeader } from './AppHeader'
import { BottomNavigation } from './AppNavigation'

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string | null
}) {
  return (
    <HouseholdProvider>
      <AppShellBody userEmail={userEmail}>{children}</AppShellBody>
    </HouseholdProvider>
  )
}

function AppShellBody({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string | null
}) {
  const { loading, error, refreshHouseholds } = useHousehold()

  return (
    <div className="min-h-dvh bg-canvas text-text">
      <AppHeader userEmail={userEmail} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pb-10 md:pt-8">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Načítám domácnost">
            <div className="h-8 w-56 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
          </div>
        ) : error ? (
          <section className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-surface p-6" role="alert">
            <h1 className="text-xl font-bold text-text">Domácnosti se nepodařilo načíst</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Aktuální stav domácnosti se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.
            </p>
            <button type="button" className="button-primary mt-5" onClick={() => void refreshHouseholds()}>
              Zkusit znovu
            </button>
          </section>
        ) : (
          children
        )}
      </main>
      <BottomNavigation />
    </div>
  )
}
