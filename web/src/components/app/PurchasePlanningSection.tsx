'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, TrendingUp } from 'lucide-react'
import { ExpectedConsumptionEditor } from '@/components/app/ExpectedConsumptionEditor'
import { computePurchasePlan } from '@/domain/inventory/planning'
import { formatStockQuantity, roundUpToPackage } from '@/domain/inventory/quantity'
import type { DashboardBatch } from '@/domain/inventory/dashboard'
import type { Tables } from '@/types/supabase-v2'

type PlanningTargetRow = Tables<'stock_targets'> & {
  expected_daily_consumption?: number | null
}

const HORIZONS = [3, 7, 14] as const

function horizonLabel(days: number) {
  return days === 3 ? '3 dny' : `${days} dní`
}

export function PurchasePlanningSection({
  products,
  batches,
  targets,
  openItems,
  addingProductId,
  onAddRecommendation,
  onRefresh,
}: {
  products: Tables<'products'>[]
  batches: Tables<'inventory_batches'>[]
  targets: Tables<'stock_targets'>[]
  openItems: Tables<'shopping_list_items'>[]
  addingProductId: string | null
  onAddRecommendation: (productId: string, recommended: number, unit: string) => void | Promise<void>
  onRefresh: () => void | Promise<void>
}) {
  const [horizonDays, setHorizonDays] = useState<number>(7)
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )

  const domainBatches = useMemo<DashboardBatch[]>(
    () => batches.map((batch) => ({
      id: batch.id,
      productId: batch.product_id,
      quantity: batch.quantity,
      quantityIsEstimate: batch.quantity_is_estimate,
      unit: batch.unit,
      expiryDate: batch.expiry_date,
      expiryType: batch.expiry_type,
      status: batch.status,
    })),
    [batches]
  )

  const planningTargets = useMemo(
    () => targets.map((target) => ({
      productId: target.product_id,
      minimumQuantity: target.minimum_quantity,
      targetQuantity: target.target_quantity,
      expectedDailyConsumption: Number(
        (target as PlanningTargetRow).expected_daily_consumption ?? 0
      ),
      unit: target.unit,
    })),
    [targets]
  )

  const plan = useMemo(
    () => computePurchasePlan(planningTargets, domainBatches, horizonDays),
    [planningTargets, domainBatches, horizonDays]
  )

  return (
    <section className="space-y-5" aria-labelledby="purchase-plan-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" aria-hidden="true" />
            <h2 id="purchase-plan-heading" className="text-xl font-bold tracking-[-0.02em] text-text">
              Plán nákupu
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
            Počítáme se zásobami, expirací a běžnou spotřebou. Cílem je, aby ti po zvoleném období zůstala tvoje cílová rezerva.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Plánovací horizont">
          {HORIZONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setHorizonDays(days)}
              aria-pressed={horizonDays === days}
              className={`min-h-10 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                horizonDays === days
                  ? 'bg-primary text-white'
                  : 'border border-border bg-surface text-text-muted hover:text-text'
              }`}
            >
              {horizonLabel(days)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div>
          <h3 className="font-bold text-text">Jak rychle zásoby mizí</h3>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            Nastav jednou běžnou denní spotřebu. Nula zachová původní režim „upozorni až pod minimum“.
          </p>
        </div>
        {targets.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {targets.map((target) => {
              const product = productById.get(target.product_id)
              if (!product) return null
              const expectedDailyConsumption = Number(
                (target as PlanningTargetRow).expected_daily_consumption ?? 0
              )

              return (
                <ExpectedConsumptionEditor
                  key={target.id}
                  targetId={target.id}
                  productName={product.name}
                  expectedDailyConsumption={expectedDailyConsumption}
                  unit={target.unit}
                  packageQuantity={product.package_quantity}
                  packageUnit={product.package_unit}
                  onSaved={onRefresh}
                />
              )
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-canvas/60 p-4 text-sm leading-6 text-text-muted">
            Nejdřív nastav u některého jídla hlídání zásoby. Pak k němu můžeme přidat i tempo spotřeby.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-bold tracking-[-0.01em] text-text">
            Co koupit na {horizonLabel(horizonDays)}
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Doporučení je odvoditelné z čísel níže; pokud je vstupní zásoba odhad, zachováme i v plánu symbol ≈.
          </p>
        </div>

        {plan.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {plan.map((item) => {
              const product = productById.get(item.productId)
              if (!product) return null

              const alreadyAdded = openItems.some(
                (shopping) => shopping.product_id === item.productId
              )
              const addingThis = addingProductId === item.productId
              const purchaseQuantity = product.package_quantity && product.package_unit === item.unit
                ? roundUpToPackage(item.recommendedQuantity, product.package_quantity) ?? item.recommendedQuantity
                : item.recommendedQuantity

              return (
                <article key={item.productId} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-text">{product.name}</p>
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        Doma {formatStockQuantity(
                          item.currentQuantity,
                          item.unit,
                          product.package_quantity,
                          product.package_unit,
                          item.currentQuantityIsEstimate
                        )} · chci {formatStockQuantity(
                          item.targetQuantity,
                          item.unit,
                          product.package_quantity,
                          product.package_unit
                        )}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-text-muted">
                        Výhled: za {horizonLabel(horizonDays)} bez nákupu {formatStockQuantity(
                          item.projectedQuantity,
                          item.unit,
                          product.package_quantity,
                          product.package_unit,
                          item.projectedQuantityIsEstimate
                        )} · spotřeba {formatStockQuantity(
                          item.expectedDailyConsumption,
                          item.unit,
                          product.package_quantity,
                          product.package_unit
                        )} / den
                      </p>
                      {item.expiredBeforeUseQuantity > 0 ? (
                        <p className="mt-1 text-xs leading-5 text-warning">
                          Do konce plánu přestane být použitelné {formatStockQuantity(
                            item.expiredBeforeUseQuantity,
                            item.unit,
                            product.package_quantity,
                            product.package_unit
                          )} se „spotřebujte do“.
                        </p>
                      ) : null}
                      {item.unmetConsumption > 0 ? (
                        <p className="mt-1 text-xs leading-5 text-danger">
                          Bez nákupu by už během období chybělo {formatStockQuantity(
                            item.unmetConsumption,
                            item.unit,
                            product.package_quantity,
                            product.package_unit,
                            item.recommendationIsEstimate
                          )}.
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="button-secondary shrink-0"
                      disabled={alreadyAdded || addingProductId !== null}
                      onClick={() => void onAddRecommendation(
                        item.productId,
                        item.recommendedQuantity,
                        item.unit
                      )}
                      aria-label={
                        alreadyAdded
                          ? `${product.name} už je na seznamu`
                          : addingThis
                            ? `Přidávám ${product.name}`
                            : `Přidat ${product.name}: ${formatStockQuantity(
                                purchaseQuantity,
                                item.unit,
                                product.package_quantity,
                                product.package_unit,
                                item.recommendationIsEstimate
                              )}`
                      }
                    >
                      {alreadyAdded ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                      {alreadyAdded
                        ? 'Přidáno'
                        : addingThis
                          ? 'Přidávám…'
                          : formatStockQuantity(
                              purchaseQuantity,
                              item.unit,
                              product.package_quantity,
                              product.package_unit,
                              item.recommendationIsEstimate
                            )}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 text-sm leading-6 text-text-muted">
            Na {horizonLabel(horizonDays)} máš podle současných zásob a nastavené spotřeby pokryto. Pokud nic nenastavíš, zůstává původní hlídání minima.
          </div>
        )}
      </div>
    </section>
  )
}
