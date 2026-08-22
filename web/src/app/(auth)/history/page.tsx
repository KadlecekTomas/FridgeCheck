'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Clock3,
  PackageOpen,
  RefreshCw,
  ShoppingBasket,
  Trash2,
  Utensils,
} from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useInventoryHistory } from '@/lib/hooks/useInventoryHistory'
import {
  formatInventoryEventQuantity,
  inventoryEventDirection,
  inventoryEventLabel,
  type InventoryHistoryEventType,
} from '@/domain/inventory/history'
import { formatPackageCount, packageCountForTotal } from '@/domain/inventory/quantity'
import type { Tables } from '@/types/supabase-v2'

const FILTERS: { value: 'all' | InventoryHistoryEventType; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'purchase', label: 'Nákupy' },
  { value: 'consume', label: 'Spotřeba' },
  { value: 'discard', label: 'Vyhození' },
  { value: 'correction', label: 'Opravy stavu' },
]

const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatEventQuantity(
  delta: number | null,
  unit: string | null,
  product: Tables<'products'> | undefined
) {
  if (
    delta !== null &&
    unit &&
    product?.package_quantity &&
    product.package_quantity > 0 &&
    product.package_unit === unit
  ) {
    const packages = packageCountForTotal(Math.abs(delta), product.package_quantity)
    if (packages !== null) {
      const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
      return `${sign}${formatPackageCount(packages)}`
    }
  }

  return formatInventoryEventQuantity(delta, unit)
}

export default function InventoryHistoryPage() {
  const { activeHousehold, activeHouseholdId, loading: householdLoading } = useHousehold()
  const history = useInventoryHistory(activeHouseholdId)
  const [filter, setFilter] = useState<'all' | InventoryHistoryEventType>('all')

  const productById = useMemo(
    () => new Map(history.products.map((product) => [product.id, product])),
    [history.products]
  )
  const filteredEvents = useMemo(
    () => history.events.filter((event) => filter === 'all' || event.type === filter),
    [filter, history.events]
  )

  if (householdLoading) return <HistorySkeleton />

  if (!activeHousehold) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Nejdřív založ domácnost</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">Pak ti můžeme ukázat, co se doma se zásobami měnilo.</p>
        <Link href="/dashboard" className="button-primary mt-5">Zpět domů</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{activeHousehold.name}</p>
        <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-text">Historie změn</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
          Co jsi přidal, spotřeboval, vyhodil nebo ručně opravil.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrovat historii">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`min-h-10 shrink-0 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              filter === item.value
                ? 'bg-primary text-white'
                : 'border border-border bg-surface text-text-muted hover:text-text'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {history.error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5">
          <p className="font-semibold text-danger">{history.error}</p>
          <button className="button-secondary mt-4" onClick={() => void history.refresh()}>Zkusit znovu</button>
        </div>
      ) : history.loading ? (
        <HistorySkeleton compact />
      ) : history.events.length === 0 ? (
        <EmptyHistory />
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-sm text-text-muted">
          Pro tento filtr zatím není žádná změna.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {filteredEvents.map((event) => {
              const product = productById.get(event.product_id)
              const direction = inventoryEventDirection(event.quantity_delta)
              const formattedQuantity = formatEventQuantity(event.quantity_delta, event.unit, product)

              return (
                <article
                  key={event.id}
                  className="flex gap-3 p-4 sm:gap-4 sm:p-5"
                  aria-label={`${inventoryEventLabel(event.type)} · ${product?.name ?? 'Neznámé jídlo'}`}
                >
                  <EventIcon type={event.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">{product?.name ?? 'Neznámé jídlo'}</p>
                        <p className="mt-0.5 text-sm font-medium text-text-muted">{inventoryEventLabel(event.type)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {formattedQuantity ? (
                          <p
                            className={`font-bold tabular-nums ${
                              event.type === 'discard'
                                ? 'text-danger'
                                : direction === 'increase'
                                  ? 'text-primary'
                                  : direction === 'decrease'
                                    ? 'text-text'
                                    : 'text-text-muted'
                            }`}
                          >
                            {formattedQuantity}
                          </p>
                        ) : null}
                        <time dateTime={event.created_at} className="mt-0.5 block text-xs text-text-muted">
                          {dateFormatter.format(new Date(event.created_at))}
                        </time>
                      </div>
                    </div>
                    {event.reason ? (
                      <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-sm leading-5 text-text-muted">{event.reason}</p>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {!history.loading && history.hasMore ? (
        <div className="flex justify-center">
          <button type="button" className="button-secondary" onClick={() => void history.loadMore()} disabled={history.loadingMore}>
            <Clock3 size={17} aria-hidden="true" />
            {history.loadingMore ? 'Načítám…' : 'Načíst starší'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function EventIcon({ type }: { type: InventoryHistoryEventType }) {
  const common = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'

  switch (type) {
    case 'purchase':
      return <span className={`${common} bg-primary-soft text-primary`}><ShoppingBasket size={18} aria-hidden="true" /></span>
    case 'consume':
      return <span className={`${common} bg-primary-soft text-primary`}><Utensils size={18} aria-hidden="true" /></span>
    case 'discard':
      return <span className={`${common} bg-danger/10 text-danger`}><Trash2 size={18} aria-hidden="true" /></span>
    case 'correction':
      return <span className={`${common} bg-surface-muted text-text`}><RefreshCw size={18} aria-hidden="true" /></span>
    case 'move':
      return <span className={`${common} bg-surface-muted text-text-muted`}><ArrowRightLeft size={18} aria-hidden="true" /></span>
    case 'open':
      return <span className={`${common} bg-surface-muted text-text-muted`}><PackageOpen size={18} aria-hidden="true" /></span>
    default:
      return <span className={`${common} bg-surface-muted text-text-muted`}><ArrowUpRight size={18} aria-hidden="true" /></span>
  }
}

function EmptyHistory() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-7 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <ArrowDownRight size={22} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-text">Historie je zatím prázdná</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
        Jakmile něco přidáš, spotřebuješ, vyhodíš nebo opravíš, objeví se to tady.
      </p>
      <Link href="/inventory/new" className="button-primary mt-5">Přidat jídlo</Link>
    </div>
  )
}

function HistorySkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: compact ? 4 : 6 }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  )
}
