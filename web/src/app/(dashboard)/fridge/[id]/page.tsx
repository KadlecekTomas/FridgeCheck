import EmptyState from '@/components/dashboard/EmptyState'
import { FoodList } from '@/components/fridge/FoodList'
import { FoodStatusStats } from '@/components/fridge/FoodStatusStats'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

export default async function FridgeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const fridgeId = params.id

  // 1. Získání přihlášeného uživatele
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user || userError) {
    console.error('Uživatel není přihlášen nebo došlo k chybě:', userError?.message)
    notFound()
  }

  // 2. Získání dat o lednici (pouze pokud je vlastník nebo člen)
  const { data: fridge, error: fridgeError } = await supabase
    .from('fridges')
    .select('*')
    .eq('id', fridgeId)
    .single()

  if (!fridge || fridgeError) {
    console.error('Lednice nenalezena nebo chyba:', fridgeError?.message)
    notFound()
  }

  // 3. Zavolání vlastní Supabase funkce get_my_foods
  const { data: foods, error: foodError } = await supabase.rpc('get_my_foods', {
    fridge: fridgeId,
  })

  if (foodError) {
    console.error('Chyba při načítání foods přes RPC:', foodError)
    notFound()
  }

  const foodCount = foods?.length || 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Lednice: {fridge.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Vytvořeno: {new Date(fridge.created_at).toLocaleString()}
      </p>

      {/* Statistiky potravin */}
      <FoodStatusStats foods={foods || []} />

      {/* Seznam potravin nebo prázdný stav */}
      {foodCount === 0 ? (
        <EmptyState
          title="Lednice je prázdná"
          description="Přidej do ní první potraviny a sleduj expiraci!"
          actionText="Přidat potraviny"
          actionHref={`/foods/new?fridgeId=${fridge.id}`}
          fridgeId={fridge.id}
        />
      ) : (
        <FoodList foods={foods!} fridgeId={fridge.id} />
      )}
    </div>
  )
}
