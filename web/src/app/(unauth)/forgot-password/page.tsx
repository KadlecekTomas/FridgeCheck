import { ForgotPasswordForm } from './ForgotPasswordForm'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  return <ForgotPasswordForm invalidLink={params.error === 'invalid-link'} />
}
