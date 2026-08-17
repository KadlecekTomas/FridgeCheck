import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { getCurrentUserV2 } from '@/lib/auth/v2-server'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUserV2()

  if (!user) {
    redirect('/login')
  }

  return <AppShell userEmail={user.email}>{children}</AppShell>
}
