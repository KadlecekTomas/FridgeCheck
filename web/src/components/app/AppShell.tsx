'use client'

import { HouseholdProvider } from '@/contexts/HouseholdContext'
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
      <div className="min-h-dvh bg-canvas text-text">
        <AppHeader userEmail={userEmail} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pb-10 md:pt-8">
          {children}
        </main>
        <BottomNavigation />
      </div>
    </HouseholdProvider>
  )
}
