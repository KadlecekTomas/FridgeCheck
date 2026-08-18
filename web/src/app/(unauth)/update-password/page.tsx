import { redirect } from 'next/navigation'
import { getCurrentUserV2 } from '@/lib/auth/v2-server'
import { UpdatePasswordForm } from './UpdatePasswordForm'

export default async function UpdatePasswordPage() {
  const user = await getCurrentUserV2()

  if (!user) {
    redirect('/forgot-password?error=invalid-link')
  }

  return <UpdatePasswordForm />
}
