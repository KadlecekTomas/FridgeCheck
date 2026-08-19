'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, PackageOpen, Plus, Search, Target } from 'lucide-react'
import { ConsumeProductAction } from '@/components/app/ConsumeProductAction'
import { CorrectBatchAction } from '@/components/app/CorrectBatchAction'
import { DiscardBatchAction } from '@/components/app/DiscardBatchAction'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import { formatExpiryUrgency, isBatchUsableForStock } from '@/domain/inventory/dashboard'
import {
  formatQuantity,
  formatStockQuantity,
  hasAtMostThreeDecimals,
  packageCountForTotal,
  totalForPackages,
} from '@/domain/inventory/quantity'
import { daysUntilExpiry } from '@/domain/expiry/expiry'
import type { Tables } from '@/types/supabase-v2'

function productUsesPackages(product: Tables<'products'>) {
  return Boolean(
    product.package_quantity &&
      product.package_quantity > 0 &&
      product.package_unit === product.default_unit
  )
}

export default function InventoryPage() {
  const { activeHousehold, activeHouseholdId, loading: householdLoading } = useHousehold()
  const dashboard = useDashboardV2(activeHouseholdId)
  const [search, setSearch] = useState('')
  const [targetProductId, setTargetProductId] = useState<string | null>(null)

  const storageById = useMemo(
    () => new Map(dashboard.storageUnits.map((storage) => [storage.id, storage])),
    [dashboard.storageUnits]
  )

  const products = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('cs-CZ')
    if (!normalized) return dashboard.products
    return dashboard.products.filter((product) =>
      `${product.name} ${product.brand ?? ''}`.toLocaleLowerCase('cs-CZ').includes(normalized)
    )
  }, [dashboard.products, search])

  if (householdLoading) return <InventorySkeleton />

  if (!activeHousehold) {
    return (
      <EmptyState
        title="Nejdřív založ domácnost"
        description="Pak bude jasné, do kterých zásob jídlo patří."
        href="/dashboard"
        action="Založit domácnost"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{activeHousehold.name}</p>
          <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-text">Zásoby</h1>
          <p className="mt-1 text-sm text-text-muted">Co máš doma, kde to je a co se blíží k datu na obalu.</p>
        </div>
        <Link href="/inventory/new" className="button-primary shrink-0">
          <Plus size={18} aria-hidden="true" />
          Přidat jídlo
        </Link>
      </div>

      <label className="relative block max-w-lg">
        <span className="sr-only">Hledat v zásobách</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat jídlo…" className="input-field pl-10" type="search" />
      </label>

      {dashboard.error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5">
          <p className="font-semibold text-danger">Zásoby se nepodařilo načíst.</p>
          <p className="mt-1 text-sm text-text-muted">Nic se nezměnilo.</p>
          <button className="button-secondary mt-4" onClick={() => void dashboard.refresh()}>Zkusit znovu</button>
        </div>
      ) : dashboard.loading ? (
        <InventorySkeleton />
      ) : dashboard.products.length === 0 ? (
        <EmptyState
          title="Zásoby jsou zatím prázdné"
          description="Naskenuj čárový kód nebo přidej první jídlo ručně."
          href="/inventory/new"
          action="Přidat první jídlo"
        />
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-sm text-text-muted">Pro „{search}“ tu nic není.</div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const batches = dashboard.batches.filter((batch) => batch.product_id === product.id && batch.status === 'active')
            const target = dashboard.stockTargets.find((item) => item.product_id === product.id)
            const currentQuantity = dashboard.batches
              .filter(
                (batch) =>
                  batch.product_id === product.id &&
                  batch.unit === product.default_unit &&
                  isBatchUsableForStock({
                    id: batch.id,
                    productId: batch.product_id,
                    quantity: batch.quantity,
                    unit: batch.unit,
                    expiryDate: batch.expiry_date,
                    expiryType: batch.expiry_type,
                    status: batch.status,
                  })
              )
              .reduce((sum, batch) => sum + batch.quantity, 0)
            const editorOpen = targetProductId === product.id

            return (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h2 className="text-lg font-bold tracking-[-0.01em] text-text">{product.name}</h2>
                      {product.brand ? <span className="text-sm text-text-muted">{product.brand}</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      Doma {formatStockQuantity(currentQuantity, product.default_unit, product.package_quantity, product.package_unit)}
                    </p>
                    {target ? (
                      <p className="mt-1 text-sm font-medium text-primary">
                        Dochází pod {formatStockQuantity(target.minimum_quantity, target.unit, product.package_quantity, product.package_unit)} · chci mít{' '}
                        {formatStockQuantity(target.target_quantity, target.unit, product.package_quantity, product.package_unit)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <ConsumeProductAction
                      productId={product.id}
                      productName={product.name}
                      unit={product.default_unit}
                      availableQuantity={currentQuantity}
                      packageQuantity={product.package_quantity}
                      packageUnit={product.package_unit}
                      onConsumed={dashboard.refresh}
                    />
                    <button
                      type="button"
                      className="button-secondary shrink-0"
                      onClick={() => setTargetProductId(editorOpen ? null : product.id)}
                      aria-expanded={editorOpen}
                    >
                      <Target size={17} aria-hidden="true" />
                      {target ? 'Upravit zásobu' : 'Hlídání zásoby'}
                      {editorOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {editorOpen ? (
                  <TargetEditor
                    householdId={activeHousehold.id}
                    product={product}
                    existing={target}
                    onSaved={async () => {
                      setTargetProductId(null)
                      await dashboard.refresh()
                    }}
                  />
                ) : null}

                <div className="border-t border-border bg-canvas/50">
                  {batches.length > 0 ? (
                    <div className="divide-y divide-border">
                      {batches
                        .slice()
                        .sort((a, b) => {
                          if (!a.expiry_date) return 1
                          if (!b.expiry_date) return -1
                          return a.expiry_date.localeCompare(b.expiry_date)
                        })
                        .map((batch) => {
                          const storage = storageById.get(batch.storage_unit_id)
                          const days = batch.expiry_date ? daysUntilExpiry(batch.expiry_date) : null
                          return (
                            <div key={batch.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-text">
                                  {formatStockQuantity(batch.quantity, batch.unit, product.package_quantity, product.package_unit)}
                                </span>
                                {storage ? <span className="text-text-muted"> · {storage.name}</span> : null}
                                <div className="mt-1">
                                  {days === null ? (
                                    <span className="text-text-muted">bez data</span>
                                  ) : (
                                    <span className={days < 0 && batch.expiry_type === 'use_by' ? 'font-semibold text-danger' : days <= 1 ? 'font-semibold text-warning' : 'text-text-muted'}>
                                      {formatExpiryUrgency(days, batch.expiry_type)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-1">
                                <CorrectBatchAction
                                  compact
                                  batchId={batch.id}
                                  productName={product.name}
                                  quantity={batch.quantity}
                                  unit={batch.unit}
                                  packageQuantity={product.package_quantity}
                                  packageUnit={product.package_unit}
                                  onCorrected={dashboard.refresh}
                                />
                                <DiscardBatchAction
                                  compact
                                  batchId={batch.id}
                                  productName={product.name}
                                  quantity={batch.quantity}
                                  unit={batch.unit}
                                  packageQuantity={product.package_quantity}
                                  packageUnit={product.package_unit}
                                  onDiscarded={dashboard.refresh}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-text-muted">Teď nic doma nemáš.</div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TargetEditor({
  householdId,
  product,
  existing,
  onSaved,
}: {
  householdId: string
  product: Tables<'products'>
  existing?: Tables<'stock_targets'>
  onSaved: () => Promise<void>
}) {
  const usesPackages = productUsesPackages(product)
  const packageQuantity = usesPackages ? product.package_quantity : null
  const toInputValue = (value: number) => {
    if (!packageQuantity) return value
    return packageCountForTotal(value, packageQuantity) ?? 0
  }
  const [minimum, setMinimum] = useState(String(toInputValue(existing?.minimum_quantity ?? 0)))
  const [target, setTarget] = useState(String(toInputValue(existing?.target_quantity ?? 0)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toStoredValue = (value: number) => {
    if (!packageQuantity) return value
    if (value === 0) return 0
    return totalForPackages(value, packageQuantity)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const enteredMinimum = Number(minimum)
    const enteredTarget = Number(target)

    if (
      !Number.isFinite(enteredMinimum) ||
      enteredMinimum < 0 ||
      !Number.isFinite(enteredTarget) ||
      enteredTarget < 0 ||
      !hasAtMostThreeDecimals(enteredMinimum) ||
      !hasAtMostThreeDecimals(enteredTarget)
    ) {
      setError('Zadej platné nezáporné hodnoty s nejvýše třemi desetinnými místy.')
      return
    }

    const minimumValue = toStoredValue(enteredMinimum)
    const targetValue = toStoredValue(enteredTarget)
    if (minimumValue === null || targetValue === null) {
      setError('Množství se nepodařilo spočítat.')
      return
    }
    if (targetValue < minimumValue) {
      setError('To, co chceš mít doma, musí být alespoň stejné jako hranice „dochází“.')
      return
    }

    setSaving(true)
    setError(null)
    const { error: saveError } = await supabaseV2Browser().from('stock_targets').upsert(
      {
        household_id: householdId,
        product_id: product.id,
        minimum_quantity: minimumValue,
        target_quantity: targetValue,
        unit: product.default_unit,
      },
      { onConflict: 'household_id,product_id' }
    )

    if (saveError) {
      setError('Hlídání zásoby se nepodařilo uložit.')
      setSaving(false)
      return
    }

    await onSaved()
    setSaving(false)
  }

  const suffix = usesPackages ? 'balení' : product.default_unit === 'pcs' ? 'ks' : product.default_unit

  return (
    <form onSubmit={submit} className="border-t border-border bg-primary-soft/45 p-4">
      {usesPackages && packageQuantity && product.package_unit ? (
        <p className="mb-3 text-sm text-text-muted">1 balení = {formatQuantity(packageQuantity, product.package_unit)}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label>
          <span className="mb-1.5 block text-sm font-semibold text-text">Upozorni, když mám méně než</span>
          <div className="relative">
            <input className="input-field pr-20" type="number" min="0" step="0.001" value={minimum} onChange={(event) => setMinimum(event.target.value)} required />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{suffix}</span>
          </div>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-semibold text-text">Chci mít doma</span>
          <div className="relative">
            <input className="input-field pr-20" type="number" min="0" step="0.001" value={target} onChange={(event) => setTarget(event.target.value)} required />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{suffix}</span>
          </div>
        </label>
        <button type="submit" disabled={saving} className="button-primary">{saving ? 'Ukládám…' : 'Uložit'}</button>
      </div>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
    </form>
  )
}

function EmptyState({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-7 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><PackageOpen size={22} aria-hidden="true" /></span>
      <h2 className="mt-4 text-lg font-bold text-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p>
      <Link href={href} className="button-primary mt-5">{action}</Link>
    </div>
  )
}

function InventorySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      {[0, 1, 2].map((key) => <div key={key} className="h-32 animate-pulse rounded-2xl bg-surface-muted" />)}
    </div>
  )
}
