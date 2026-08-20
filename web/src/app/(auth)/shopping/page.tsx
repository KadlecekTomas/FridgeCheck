'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Check, Plus, ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { ShoppingItemActions } from '@/components/app/ShoppingItemActions'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import { computeLowStock, type DashboardBatch } from '@/domain/inventory/dashboard'
import { formatStockQuantity, roundUpToPackage } from '@/domain/inventory/quantity'

export default function ShoppingPage() {
  const { activeHousehold, activeHouseholdId, loading: householdLoading } = useHousehold()
  const dashboard = useDashboardV2(activeHouseholdId)
  const [manualName, setManualName] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingProductId, setAddingProductId] = useState<string | null>(null)
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const productById = useMemo(
    () => new Map(dashboard.products.map((product) => [product.id, product])),
    [dashboard.products]
  )

  const domainBatches = useMemo<DashboardBatch[]>(
    () => dashboard.batches.map((batch) => ({
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
    () => computeLowStock(
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
    const { data: { user }, error: userError } = await supabaseV2Browser().auth.getUser()
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
      if (insertError) throw new Error('Položku se nepodařilo přidat.')
      setManualName('')
      await dashboard.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Položku se nepodařilo přidat.')
    } finally {
      setSaving(false)
    }
  }

  const addRecommendation = async (productId: string, recommended: number, unit: string) => {
    if (!activeHousehold || addingProductId) return
    const product = productById.get(productId)
    if (!product) return

    const purchaseQuantity = product.package_quantity && product.package_unit === unit
      ? roundUpToPackage(recommended, product.package_quantity) ?? recommended
      : recommended

    setAddingProductId(productId)
    setError(null)
    try {
      const userId = await getUserId()
      const { error: insertError } = await supabaseV2Browser().from('shopping_list_items').insert({
        household_id: activeHousehold.id,
        product_id: product.id,
        name: product.name,
        quantity: purchaseQuantity,
        unit: unit as 'g' | 'kg' | 'ml' | 'l' | 'pcs',
        source: 'derived',
        created_by: userId,
      })

      if (insertError?.code === '23505') {
        await dashboard.refresh()
        toast.info(`${product.name} už na nákupním seznamu je.`)
        return
      }
      if (insertError) throw new Error('Doporučení se nepodařilo přidat.')

      toast.success(`${product.name} je na nákupním seznamu.`)
      await dashboard.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Doporučení se nepodařilo přidat.')
    } finally {
      setAddingProductId(null)
    }
  }

  const toggleItem = async (id: string, checked: boolean) => {
    if (togglingItemId) return

    setTogglingItemId(id)
    setError(null)
    const { error: updateError } = await supabaseV2Browser().from('shopping_list_items').update({ checked: !checked }).eq('id', id)
    if (updateError) {
      setError(updateError.code === '23505' ? 'Tahle položka už na nákupním seznamu je.' : 'Položku se nepodařilo změnit.')
      setTogglingItemId(null)
      return
    }
    await dashboard.refresh()
    setTogglingItemId(null)
  }

  if (householdLoading || dashboard.loading) return <div className="h-80 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />

  if (!activeHousehold) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Nejdřív založ domácnost</h1>
        <p className="mt-2 text-sm text-text-muted">Pak ti můžeme hlídat, co doma chybí.</p>
      </div>
    )
  }

  if (dashboard.error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-surface p-6" role="alert">
        <h1 className="text-xl font-bold text-text">Nákup se nepodařilo načíst</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">Aktuální data se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.</p>
        <button type="button" className="button-primary mt-5" onClick={() => void dashboard.refresh()} disabled={dashboard.refreshing}>
          {dashboard.refreshing ? 'Načítám…' : 'Zkusit znovu'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">{activeHousehold.name}</p>
        <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-text">Nákup</h1>
        <p className="mt-1 text-sm text-text-muted">Co dochází doma a co chceš koupit navíc.</p>
      </div>

      {error ? <div className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger" role="alert">{error}</div> : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-text">Dochází</h2>
          <p className="mt-1 text-sm text-text-muted">Doporučíme jen to, co už kleslo pod tvoji hranici.</p>
        </div>
        {recommendations.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map((item) => {
              const product = productById.get(item.productId)
              if (!product) return null
              const alreadyAdded = openItems.some((shopping) => shopping.product_id === item.productId)
              const addingThis = addingProductId === item.productId
              const purchaseQuantity = product.package_quantity && product.package_unit === item.unit
                ? roundUpToPackage(item.recommendedQuantity, product.package_quantity) ?? item.recommendedQuantity
                : item.recommendedQuantity
              return (
                <div key={item.productId} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text">{product.name}</p>
                      <p className="mt-1 text-sm text-text-muted">
                        Doma {formatStockQuantity(item.currentQuantity, item.unit, product.package_quantity, product.package_unit)} · chci{' '}
                        {formatStockQuantity(item.targetQuantity, item.unit, product.package_quantity, product.package_unit)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button-secondary shrink-0"
                      disabled={alreadyAdded || addingProductId !== null}
                      onClick={() => void addRecommendation(item.productId, item.recommendedQuantity, item.unit)}
                      aria-label={alreadyAdded ? `${product.name} už je na seznamu` : addingThis ? `Přidávám ${product.name}` : `Přidat ${product.name}: ${formatStockQuantity(purchaseQuantity, item.unit, product.package_quantity, product.package_unit)}`}
                    >
                      {alreadyAdded ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                      {alreadyAdded ? 'Přidáno' : addingThis ? 'Přidávám…' : formatStockQuantity(purchaseQuantity, item.unit, product.package_quantity, product.package_unit)}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 text-sm leading-6 text-text-muted">
            Nic teď nedochází. Hlídání si nastavíš u jídla v Zásobách.
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
            <input className="input-field" value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Třeba pečivo…" maxLength={200} />
          </label>
          <button type="submit" className="button-primary shrink-0" disabled={saving || !manualName.trim()} aria-label="Přidat">
            <Plus size={18} aria-hidden="true" />
            <span className="hidden sm:inline">{saving ? 'Přidávám…' : 'Přidat'}</span>
          </button>
        </form>

        {openItems.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {openItems.map((item) => {
              const product = item.product_id ? productById.get(item.product_id) : null
              const toggling = togglingItemId === item.id
              return (
                <div key={item.id} role="group" aria-label={`Nákupní položka ${item.name}`} className="flex min-h-14 items-center gap-2 px-3 py-2">
                  <button type="button" onClick={() => void toggleItem(item.id, item.checked)} disabled={togglingItemId !== null} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50" aria-label={toggling ? `Označuji ${item.name} jako nakoupené` : `Označit ${item.name} jako nakoupené`}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-canvas" />
                  </button>
                  <div className="min-w-0 flex-1 px-1">
                    <p className="truncate font-medium text-text">{item.name}</p>
                    {item.quantity !== null && item.unit ? (
                      <p className="mt-0.5 text-sm text-text-muted">{formatStockQuantity(item.quantity, item.unit, product?.package_quantity, product?.package_unit)}</p>
                    ) : null}
                  </div>
                  <ShoppingItemActions item={item} packageQuantity={product?.package_quantity} packageUnit={product?.package_unit} onChanged={dashboard.refresh} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-center">
            <p className="font-semibold text-text">Nákupní seznam je prázdný</p>
            <p className="mt-1 text-sm text-text-muted">Přidávej jen to, co opravdu potřebuješ.</p>
          </div>
        )}

        {completedItems.length > 0 ? (
          <details className="rounded-2xl border border-border bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-text-muted">Nakoupeno ({completedItems.length})</summary>
            <div className="divide-y divide-border border-t border-border">
              {completedItems.map((item) => {
                const toggling = togglingItemId === item.id
                return (
                  <button key={item.id} type="button" onClick={() => void toggleItem(item.id, item.checked)} disabled={togglingItemId !== null} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-muted line-through hover:bg-surface-muted disabled:opacity-50" aria-label={toggling ? `Vracím ${item.name} na nákupní seznam` : `Vrátit ${item.name} na nákupní seznam`}>
                    <Check size={17} aria-hidden="true" />
                    {item.name}
                  </button>
                )
              })}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  )
}
