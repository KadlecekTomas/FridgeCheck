import { ClientFoodSection } from '@/components/dashboard/ClientFoodSection'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

export default async function StorageDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const storageUnitId = params.id

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user || userError) {
    console.error('Uživatel není přihlášen nebo došlo k chybě:', userError?.message)
    notFound()
  }

  const { data: unit, error: unitError } = await supabase
    .from('storage_units')
    .select('*')
    .eq('id', storageUnitId)
    .single()

  if (!unit || unitError) {
    console.error('Úložiště nenalezeno nebo chyba:', unitError?.message)
    notFound()
  }

  const isOwner = unit.owner_id === user.id

  const { data: householdMembership } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', unit.household_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!isOwner && !householdMembership) {
    console.error('Uživatel nemá přístup – není owner ani člen domácnosti')
    notFound()
  }

  const { data: foods, error: foodError } = await supabase.rpc('get_my_foods', {
    fridge: storageUnitId,
    user_id: user.id,
  })

  if (foodError) {
    console.error('Chyba při načítání foods přes RPC:', foodError)
    notFound()
  }

  return (
    <ClientFoodSection
      unitName={unit.name}
      createdAt={unit.created_at}
      unitId={unit.id}
      foods={foods || []}
    />
  )
}
