import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EmptyState from '@/components/dashboard/EmptyState'
import { FoodList } from '@/components/fridge/FoodList'
import { FoodStatusStats } from '@/components/fridge/FoodStatusStats'

export default async function StorageDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const storageUnitId = params.id

  // 1. Získání přihlášeného uživatele
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user || userError) {
    console.error('Uživatel není přihlášen nebo došlo k chybě:', userError?.message)
    notFound()
  }

  // 2. Získání dat o storage unit
  const { data: unit, error: unitError } = await supabase
    .from('storage_units')
    .select('*')
    .eq('id', storageUnitId)
    .single()

  if (!unit || unitError) {
    console.error('Úložiště nenalezeno nebo chyba:', unitError?.message)
    notFound()
  }

  // 3. Ověření, že user patří do household vlastnící toto úložiště
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

  // 4. Zavolání RPC funkce pro foods
  const { data: foods, error: foodError } = await supabase.rpc('get_my_foods', {
    fridge: storageUnitId,
    user_id: user.id,
  })

  if (foodError) {
    console.error('Chyba při načítání foods přes RPC:', foodError)
    notFound()
  }

  const foodCount = foods?.length || 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Prostor: {unit.name}</h1>
        {foodCount > 0 && (
          <Link
            href={`/foods/new?fridgeId=${unit.id}`}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Přidat potravinu
          </Link>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Vytvořeno:{' '}
        {unit.created_at ? new Date(unit.created_at).toLocaleString() : 'Neznámé'}
      </p>

      <FoodStatusStats foods={foods || []} />

      {foodCount === 0 ? (
        <EmptyState
          title="Lednice je prázdná"
          description="Přidej do ní první potraviny a sleduj expiraci!"
          actionText="Přidat potraviny"
          actionHref={`/foods/new?fridgeId=${unit.id}`}
          fridgeId={unit.id}
        />
      ) : (
        <FoodList foods={foods!} fridgeId={unit.id} />
      )}
    </div>
  )
}
