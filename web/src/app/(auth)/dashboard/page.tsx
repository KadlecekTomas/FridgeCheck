'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  PackageOpen,
  Plus,
  ShoppingBasket,
} from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import {
  buildUrgentBatches,
  computeLowStock,
  formatExpiryUrgency,
  type DashboardBatch,
} from '@/domain/inventory/dashboard'
import { resolveExpiringDays } from '@/domain/expiry/expiry'

const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 })

function formatQuantity(value: number, unit: string) {
  return `${numberFormatter.format(value)} ${unit === 'pcs' ? 'ks' : unit}`
}

export default function DashboardPage() {
  const {
    activeHousehold,
    activeHouseholdId,
    loading: householdLoading,
    error: householdError,
    refreshHouseholds,
  } = useHousehold()
  const dashboard = useDashboardV2(activeHouseholdId)

  const productById = useMemo(
    () => new Map(dashboard.products.map((product) => [product.id, product])),
    [dashboard.products]
  )
  const storageById = useMemo(
    () => new Map(dashboard.storageUnits.map((storage) => [storage.id, storage])),
    [dashboard.storageUnits]
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

  const expiringDays = resolveExpiringDays(process.env.NEXT_PUBLIC_EXPIRING_DAYS)
  const urgentBatches = useMemo(
    () => buildUrgentBatches(domainBatches, new Date(), expiringDays).slice(0, 4),
    [domainBatches, expiringDays]
  )
  const lowStock = useMemo(
    () =>
      computeLowStock(
        dashboard.stockTargets.map((target) => ({
          productId: target.product_id,
          minimumQuantity: target.minimum_quantity,
          targetQuantity: target.target_quantity,
          unit: target.unit,
        })),
        domainBatches,
        new Date()
      ).slice(0, 4),
    [dashboard.stockTargets, domainBatches]
  )

  const uncheckedShopping = dashboard.shoppingItems.filter((item) => !item.checked)

  if (householdLoading) return <DashboardSkeleton />

  if (householdError) {
    return (
      <StateCard
        title="Domácnosti se nepodařilo načíst"
        description="Zkontroluj připojení a zkus načtení znovu."
        action={
          <button className="button-secondary" onClick={() => void refreshHouseholds()}>
            Zkusit znovu
          </button>
        }
      />
    )
  }

  if (!activeHousehold) {
    return <CreateHouseholdCard onCreated={refreshHouseholds} />
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="text-sm font-medium text-primary">{activeHousehold.name}</p>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] text-text">
          Co dnes potřebuje pozornost
        </h1>
        <p className="max-w-xl text-sm leading-6 text-text-muted">
          Nejdřív jídlo, které má smysl sníst. Potom zásoby a nákup.
        </p>
      </section>

      {dashboard.error ? (
        <StateCard
          title="Přehled se nepodařilo načíst"
          description="Data domácnosti zůstala nedotčená. Zkus načtení znovu."
          action={
            <button className="button-secondary" onClick={() => void dashboard.refresh()}>
              Zkusit znovu
            </button>
          }
        />
      ) : dashboard.loading ? (
        <DashboardSkeleton compact />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="space-y-8">
            <DashboardSection
              title="Sněz nejdřív"
              description="Aktivní balení s nejbližším datem."
              icon={<Clock3 size={20} aria-hidden="true" />}
              href="/inventory"
            >
              {urgentBatches.length > 0 ? (
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {urgentBatches.map((batch) => {
                    const source = dashboard.batches.find((item) => item.id === batch.id)
                    const product = productById.get(batch.productId)
                    const storage = source ? storageById.get(source.storage_unit_id) : null
                    const urgency = formatExpiryUrgency(batch.daysRemaining, batch.expiryType)
                    const isCritical = batch.daysRemaining < 0 && batch.expiryType === 'use_by'
                    const isWarning = batch.daysRemaining <= 1

                    return (
                      <div key={batch.id} className="flex items-center gap-3 p-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isCritical
                              ? 'bg-danger/10 text-danger'
                              : isWarning
                                ? 'bg-warning/10 text-warning'
                                : 'bg-primary-soft text-primary'
                          }`}
                        >
                          {isCritical ? (
                            <AlertTriangle size={20} aria-hidden="true" />
                          ) : (
                            <Clock3 size={20} aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <p className="truncate font-semibold text-text">
                              {product?.name ?? 'Neznámý produkt'}
                            </p>
                            <span
                              className={`text-sm font-semibold ${
                                isCritical
                                  ? 'text-danger'
                                  : isWarning
                                    ? 'text-warning'
                                    : 'text-primary'
                              }`}
                            >
                              {urgency}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-text-muted">
                            {formatQuantity(batch.quantity, batch.unit)}
                            {storage ? ` · ${storage.name}` : ''}
                            {batch.expiryType === 'best_before' ? ' · min. trvanlivost' : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <SectionEmpty
                  title="Nic akutního"
                  description="V nejbližších dnech tu není žádné aktivní balení s datem expirace."
                />
              )}
            </DashboardSection>

            <DashboardSection
              title="Dochází"
              description="Zásoby pod nastaveným minimem."
              icon={<PackageOpen size={20} aria-hidden="true" />}
              href="/inventory"
            >
              {lowStock.length > 0 ? (
                <div className="space-y-3">
                  {lowStock.map((item) => {
                    const product = productById.get(item.productId)
                    return (
                      <div
                        key={`${item.productId}-${item.unit}`}
                        className="rounded-2xl border border-border bg-surface p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-text">
                              {product?.name ?? 'Neznámý produkt'}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">
                              Doma {formatQuantity(item.currentQuantity, item.unit)} · cíl{' '}
                              {formatQuantity(item.targetQuantity, item.unit)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
                            koupit {formatQuantity(item.recommendedQuantity, item.unit)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <SectionEmpty
                  title="Žádný nastavený nedostatek"
                  description="Jakmile nastavíš cílovou zásobu produktu, HlídačJídla tady ukáže, co dochází."
                />
              )}
            </DashboardSection>
          </div>

          <div className="space-y-8">
            <DashboardSection
              title="Doma"
              description="Přehled úložných míst bez nutnosti jedno nejdřív vybírat."
              icon={<PackageOpen size={20} aria-hidden="true" />}
              href="/inventory"
            >
              {dashboard.storageUnits.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {dashboard.storageUnits.map((storage) => {
                    const count = dashboard.batches.filter(
                      (batch) => batch.storage_unit_id === storage.id && batch.status === 'active'
                    ).length
                    return (
                      <div key={storage.id} className="rounded-2xl border border-border bg-surface p-4">
                        <p className="font-semibold text-text">{storage.name}</p>
                        <p className="mt-1 text-sm text-text-muted">
                          {count === 1 ? '1 aktivní balení' : `${count} aktivních balení`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <SectionEmpty
                  title="Chybí úložné místo"
                  description="Nová domácnost dostane Lednici automaticky. Další místa přidáme v nastavení."
                />
              )}
            </DashboardSection>

            <DashboardSection
              title="Nákup"
              description="Co už čeká na nákupním seznamu."
              icon={<ShoppingBasket size={20} aria-hidden="true" />}
              href="/shopping"
            >
              {uncheckedShopping.length > 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-3xl font-bold tracking-[-0.03em] text-text">
                    {uncheckedShopping.length}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {uncheckedShopping.length === 1 ? 'položka k nákupu' : 'položky k nákupu'}
                  </p>
                  <div className="mt-4 space-y-2">
                    {uncheckedShopping.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-text">{item.name}</span>
                        {item.quantity && item.unit ? (
                          <span className="shrink-0 text-text-muted">
                            {formatQuantity(item.quantity, item.unit)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <SectionEmpty
                  title="Seznam je prázdný"
                  description="Přidej položku ručně nebo později jedním klepnutím z doporučení Dochází."
                />
              )}
            </DashboardSection>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardSection({
  title,
  description,
  icon,
  href,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            {icon}
            <h2 className="text-xl font-bold tracking-[-0.02em] text-text">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Otevřít
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  )
}

function SectionEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5">
      <p className="font-semibold text-text">{title}</p>
      <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
    </div>
  )
}

function StateCard({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-xl font-bold text-text">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function CreateHouseholdCard({
  onCreated,
}: {
  onCreated: (preferredId?: string) => Promise<void>
}) {
  const [name, setName] = useState('Moje domácnost')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError(null)
    const { data, error: rpcError } = await supabaseV2Browser().rpc('create_household', {
      household_name: trimmed,
    })

    if (rpcError || !data) {
      setError('Domácnost se nepodařilo vytvořit. Zkus to znovu.')
      setSubmitting(false)
      return
    }

    await onCreated(data)
    setSubmitting(false)
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-6 md:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Plus size={22} aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-text">
        Založ první domácnost
      </h1>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Vytvoříme ji společně s výchozí Lednicí. Pak můžeš rovnou přidat první jídlo.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-text">Název domácnosti</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="input-field"
            autoComplete="organization"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="button-primary w-full sm:w-auto"
        >
          {submitting ? 'Vytvářím…' : 'Vytvořit domácnost'}
        </button>
      </form>
    </div>
  )
}

function DashboardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'grid gap-8 lg:grid-cols-2' : 'space-y-8'} aria-busy="true">
      {!compact ? (
        <div className="space-y-3">
          <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
          <div className="h-9 w-72 max-w-full animate-pulse rounded bg-surface-muted" />
        </div>
      ) : null}
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="space-y-3">
          <div className="h-6 w-36 animate-pulse rounded bg-surface-muted" />
          <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      ))}
    </div>
  )
}
