'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Check, Plus, ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import { computeLowStock, type DashboardBatch } from '@/domain/inventory/dashboard'

const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 })

function quantity(value: number, unit: string) {
  return `${numberFormatter.format(value)} ${unit === 'pcs' ? 'ks' : unit}`
}

export default function ShoppingPage() {
  const { activeHousehold, activeHouseholdId, loading: householdLoading } = useHousehold()
  const dashboard = useDashboardV2(activeHouseholdId)
  const [manualName, setManualName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productById = useMemo(
    () => new Map(dashboard.products.map((product) => [product.id, product])),
    [dashboard.products]
  )

  const domainBatches = useMemo<DashboardBatch[]>(
    () =>
      dashboard.batches.map((batch) => ({
        id: batch.id,
        productId: batch.product_id,
        quantity: batch.quantity,
        unit: batch.unit,
        expiryDate: batch.expiry_date,
        expiryType: batch.expiry_type,
        status: batch.status,
      })),
    [dashboard.batches]
  )

  const recommendations = useMemo(
    () =>
      computeLowStock(
        dashboard.stockTargets.map((target) => ({
          productId: target.product_id,
          minimumQuantity: target.minimum_quantity,
          targetQuantity: target.target_quantity,
          unit: target.unit,
        })),
        domainBatches
      ),
    [dashboard.stockTargets, domainBatches]
  )

  const openItems = dashboard.shoppingItems.filter((item) => !item.checked)
  const completedItems = dashboard.shoppingItems.filter((item) => item.checked)

  const getUserId = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabaseV2Browser().auth.getUser()
    if (userError || !user) throw new Error('Přihlášení vypršelo. Přihlas se znovu.')
    return user.id
  }

  const addManual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeHousehold || !manualName.trim()) return

    setSaving(true)
    setError(null)
    try {
      const userId = await getUserId()
      const { error: insertError } = await supabaseV2Browser().from('shopping_list_items').insert({
        household_id: activeHousehold.id,
        name: manualName.trim(),
        source: 'manual',
        created_by: userId,
      })
      if (insertError) throw insertError
      setManualName('')
      await dashboard.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Položku se nepodařilo přidat.')
    } finally {
      setSaving(false)
    }
  }

  const addRecommendation = async (productId: string, recommended: number, unit: string) => {
    if (!activeHousehold) return
    const product = productById.get(productId)
    if (!product) return

    setError(null)
    try {
      const userId = await getUserId()
      const { error: insertError } = await supabaseV2Browser().from('shopping_list_items').insert({
        household_id: activeHousehold.id,
        product_id: product.id,
        name: product.name,
        quantity: recommended,
        unit: unit as 'g' | 'kg' | 'ml' | 'l' | 'pcs',
        source: 'derived',
        created_by: userId,
      })
      if (insertError) throw insertError
      toast.success(`${product.name} je na nákupním seznamu.`)
      await dashboard.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Doporučení se nepodařilo přidat.')
    }
  }

  const toggleItem = async (id: string, checked: boolean) => {
    setError(null)
    const { error: updateError } = await supabaseV2Browser()
      .from('shopping_list_items')
      .update({ checked: !checked })
      .eq('id', id)

    if (updateError) {
      setError('Položku se nepodařilo změnit.')
      return
    }
    await dashboard.refresh()
  }

  if (householdLoading || dashboard.loading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />
  }

  if (!activeHousehold) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Nákup patří domácnosti</h1>
        <p className="mt-2 text-sm text-text-muted">Založ nejdřív domácnost na Domů.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">{activeHousehold.name}</p>
        <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-text">Nákup</h1>
        <p className="mt-1 text-sm text-text-muted">
          Doporučení vychází ze zásob a cílů. Ruční položky zůstávají ručními rozhodnutími.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-text">Doporučené</h2>
          <p className="mt-1 text-sm text-text-muted">Jen produkty, které jsou pod nastaveným minimem.</p>
        </div>
        {recommendations.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map((item) => {
              const product = productById.get(item.productId)
              if (!product) return null
              const alreadyAdded = openItems.some((shopping) => shopping.product_id === item.productId)
              return (
                <div key={item.productId} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text">{product.name}</p>
                      <p className="mt-1 text-sm text-text-muted">
                        Doma {quantity(item.currentQuantity, item.unit)} / cíl{' '}
                        {quantity(item.targetQuantity, item.unit)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button-secondary shrink-0"
                      disabled={alreadyAdded}
                      onClick={() => void addRecommendation(item.productId, item.recommendedQuantity, item.unit)}
                    >
                      {alreadyAdded ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                      {alreadyAdded ? 'Přidáno' : quantity(item.recommendedQuantity, item.unit)}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 text-sm leading-6 text-text-muted">
            Zatím tu není žádný nedostatek. Cílovou zásobu nastavíš u produktu v Zásobách.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBasket size={20} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-[-0.02em] text-text">Seznam</h2>
        </div>

        <form onSubmit={addManual} className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Přidat vlastní položku</span>
            <input
              className="input-field"
              value={manualName}
              onChange={(event) => setManualName(event.target.value)}
              placeholder="Přidat třeba pečivo…"
              maxLength={200}
            />
          </label>
          <button type="submit" className="button-primary shrink-0" disabled={saving || !manualName.trim()}>
            <Plus size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Přidat</span>
          </button>
        </form>

        {openItems.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {openItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void toggleItem(item.id, item.checked)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border bg-canvas" />
                <span className="min-w-0 flex-1 truncate font-medium text-text">{item.name}</span>
                {item.quantity !== null && item.unit ? (
                  <span className="shrink-0 text-sm text-text-muted">{quantity(item.quantity, item.unit)}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-center">
            <p className="font-semibold text-text">Nákupní seznam je prázdný</p>
            <p className="mt-1 text-sm text-text-muted">To je v pořádku. Přidávej jen to, co opravdu potřebuješ.</p>
          </div>
        )}

        {completedItems.length > 0 ? (
          <details className="rounded-2xl border border-border bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-text-muted">
              Nakoupeno ({completedItems.length})
            </summary>
            <div className="divide-y divide-border border-t border-border">
              {completedItems.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void toggleItem(item.id, item.checked)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-muted line-through hover:bg-surface-muted"
                >
                  <Check size={17} aria-hidden="true" />
                  {item.name}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  )
}
