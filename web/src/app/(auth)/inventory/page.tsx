'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, PackageOpen, Plus, Search, Target } from 'lucide-react'
import { ConsumeProductAction } from '@/components/app/ConsumeProductAction'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import { formatExpiryUrgency, isBatchUsableForStock } from '@/domain/inventory/dashboard'
import { daysUntilExpiry } from '@/domain/expiry/expiry'
import type { Tables } from '@/types/supabase-v2'

const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 })

function quantity(value: number, unit: string) {
  return `${numberFormatter.format(value)} ${unit === 'pcs' ? 'ks' : unit}`
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
        description="Zásoby vždy patří konkrétní domácnosti."
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
          <p className="mt-1 text-sm text-text-muted">
            Produkty a jejich skutečná balení napříč lednicí, mrazákem i spíží.
          </p>
        </div>
        <Link href="/inventory/new" className="button-primary shrink-0">
          <Plus size={18} aria-hidden="true" />
          Přidat jídlo
        </Link>
      </div>

      <label className="relative block max-w-lg">
        <span className="sr-only">Hledat v zásobách</span>
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Hledat produkt…"
          className="input-field pl-10"
          type="search"
        />
      </label>

      {dashboard.error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5">
          <p className="font-semibold text-danger">Zásoby se nepodařilo načíst.</p>
          <button className="button-secondary mt-4" onClick={() => void dashboard.refresh()}>
            Zkusit znovu
          </button>
        </div>
      ) : dashboard.loading ? (
        <InventorySkeleton />
      ) : dashboard.products.length === 0 ? (
        <EmptyState
          title="Zásoby jsou zatím prázdné"
          description="Přidej první produkt ručně. Čtečku EAN vrátíme jako urychlení, ne jako podmínku."
          href="/inventory/new"
          action="Přidat první jídlo"
        />
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-sm text-text-muted">
          Pro „{search}“ tu nic není.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const batches = dashboard.batches.filter(
              (batch) => batch.product_id === product.id && batch.status === 'active'
            )
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
                      Doma {quantity(currentQuantity, product.default_unit)} · {batches.length}{' '}
                      {batches.length === 1 ? 'aktivní balení' : 'aktivní balení'}
                    </p>
                    {target ? (
                      <p className="mt-1 text-sm font-medium text-primary">
                        Minimum {quantity(target.minimum_quantity, target.unit)} · cíl{' '}
                        {quantity(target.target_quantity, target.unit)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <ConsumeProductAction
                      productId={product.id}
                      productName={product.name}
                      unit={product.default_unit}
                      availableQuantity={currentQuantity}
                      onConsumed={dashboard.refresh}
                    />
                    <button
                      type="button"
                      className="button-secondary shrink-0"
                      onClick={() => setTargetProductId(editorOpen ? null : product.id)}
                      aria-expanded={editorOpen}
                    >
                      <Target size={17} aria-hidden="true" />
                      {target ? 'Upravit cíl' : 'Nastavit cíl'}
                      {editorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                            <div key={batch.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                              <div className="min-w-0">
                                <span className="font-semibold text-text">
                                  {quantity(batch.quantity, batch.unit)}
                                </span>
                                {storage ? <span className="text-text-muted"> · {storage.name}</span> : null}
                              </div>
                              <div className="shrink-0 text-right">
                                {days === null ? (
                                  <span className="text-text-muted">bez data</span>
                                ) : (
                                  <span
                                    className={
                                      days < 0 && batch.expiry_type === 'use_by'
                                        ? 'font-semibold text-danger'
                                        : days <= 1
                                          ? 'font-semibold text-warning'
                                          : 'text-text-muted'
                                    }
                                  >
                                    {formatExpiryUrgency(days, batch.expiry_type)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-text-muted">
                      Produkt nemá žádné aktivní balení.
                    </div>
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
  const [minimum, setMinimum] = useState(String(existing?.minimum_quantity ?? 0))
  const [target, setTarget] = useState(String(existing?.target_quantity ?? 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const minimumValue = Number(minimum)
    const targetValue = Number(target)

    if (!Number.isFinite(minimumValue) || minimumValue < 0 || !Number.isFinite(targetValue)) {
      setError('Zadej platná nezáporná množství.')
      return
    }
    if (targetValue < minimumValue) {
      setError('Cílová zásoba musí být alespoň stejně velká jako minimum.')
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
      setError('Cílovou zásobu se nepodařilo uložit.')
      setSaving(false)
      return
    }

    await onSaved()
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="border-t border-border bg-primary-soft/45 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label>
          <span className="mb-1.5 block text-sm font-semibold text-text">Dochází pod</span>
          <div className="relative">
            <input
              className="input-field pr-12"
              type="number"
              min="0"
              step="0.001"
              value={minimum}
              onChange={(event) => setMinimum(event.target.value)}
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
              {product.default_unit === 'pcs' ? 'ks' : product.default_unit}
            </span>
          </div>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-semibold text-text">Chci mít doma</span>
          <div className="relative">
            <input
              className="input-field pr-12"
              type="number"
              min="0"
              step="0.001"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
              {product.default_unit === 'pcs' ? 'ks' : product.default_unit}
            </span>
          </div>
        </label>
        <button type="submit" disabled={saving} className="button-primary">
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </form>
  )
}

function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-7 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <PackageOpen size={22} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p>
      <Link href={href} className="button-primary mt-5">
        {action}
      </Link>
    </div>
  )
}

function InventorySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      {[0, 1, 2].map((key) => (
        <div key={key} className="h-32 animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  )
}
