'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, PackagePlus, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BarcodeScannerAction } from '@/components/app/BarcodeScannerAction'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import { normalizeBarcode, type OpenFoodFactsProduct } from '@/domain/products/openFoodFacts'
import { buildPackageExpiryBatches, type CanonicalExpiryBatch } from '@/domain/inventory/expiryGroups'
import {
  formatPackageCount,
  formatQuantity,
  hasAtMostThreeDecimals,
  roundInventoryQuantity,
  totalForPackages,
} from '@/domain/inventory/quantity'
import type { Enums, Tables } from '@/types/supabase-v2'

type InventoryUnit = Enums<'inventory_unit'>
type ExpiryType = Enums<'expiry_type'>

type ProductLookupPayload = {
  found: boolean
  product?: OpenFoodFactsProduct
  error?: string
}

type ExpiryGroupDraft = {
  id: number
  packageCount: string
  expiryDate: string
}

const UNITS: { value: InventoryUnit; label: string }[] = [
  { value: 'pcs', label: 'kusy' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
]

function hasPackage(product: Tables<'products'> | null) {
  return Boolean(
    product &&
      product.package_quantity &&
      product.package_quantity > 0 &&
      product.package_unit === product.default_unit
  )
}

export default function NewInventoryPage() {
  const router = useRouter()
  const { activeHousehold, activeHouseholdId, loading: householdLoading } = useHousehold()
  const dashboard = useDashboardV2(activeHouseholdId)
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [productId, setProductId] = useState('')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [ean, setEan] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookupStatus, setLookupStatus] = useState<string | null>(null)
  const [entryMode, setEntryMode] = useState<'amount' | 'packages'>('amount')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<InventoryUnit>('pcs')
  const [packageCount, setPackageCount] = useState('1')
  const [packageQuantity, setPackageQuantity] = useState('1')
  const [packageUnit, setPackageUnit] = useState<InventoryUnit>('pcs')
  const [storageUnitId, setStorageUnitId] = useState('')
  const [expiryType, setExpiryType] = useState<ExpiryType>('unknown')
  const [expiryDate, setExpiryDate] = useState('')
  const [differentExpiryDates, setDifferentExpiryDates] = useState(false)
  const [expiryGroups, setExpiryGroups] = useState<ExpiryGroupDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const expiryGroupId = useRef(0)
  const productSelectId = useId()
  const unitSelectId = useId()
  const packageUnitSelectId = useId()
  const eanInputId = useId()

  const selectedProduct = useMemo(
    () => dashboard.products.find((product) => product.id === productId) ?? null,
    [dashboard.products, productId]
  )
  const resolvedStorageId = storageUnitId || dashboard.storageUnits[0]?.id || ''
  const existingIsPackaged = hasPackage(selectedProduct)
  const resolvedUnit = mode === 'existing' && selectedProduct
    ? selectedProduct.default_unit
    : entryMode === 'packages'
      ? packageUnit
      : unit
  const resolvedPackageQuantity = existingIsPackaged
    ? selectedProduct?.package_quantity ?? null
    : entryMode === 'packages'
      ? Number(packageQuantity)
      : null
  const resolvedPackageUnit = existingIsPackaged
    ? selectedProduct?.package_unit ?? null
    : entryMode === 'packages'
      ? packageUnit
      : null
  const usesPackages = existingIsPackaged || (mode === 'new' && entryMode === 'packages')
  const groupedPackageCount = useMemo(
    () => roundInventoryQuantity(expiryGroups.reduce((sum, group) => sum + (Number(group.packageCount) || 0), 0)),
    [expiryGroups]
  )
  const expectedPackageCount = Number(packageCount)
  const remainingPackageCount = Number.isFinite(expectedPackageCount)
    ? roundInventoryQuantity(expectedPackageCount - groupedPackageCount)
    : 0

  const makeExpiryGroup = (groupPackageCount = '', groupExpiryDate = ''): ExpiryGroupDraft => ({
    id: ++expiryGroupId.current,
    packageCount: groupPackageCount,
    expiryDate: groupExpiryDate,
  })

  const resetExpirySplit = () => {
    setDifferentExpiryDates(false)
    setExpiryGroups([])
  }

  const resetExternalProduct = () => {
    setName('')
    setBrand('')
    setCategory('')
    setImageUrl(null)
    setEntryMode('amount')
    setQuantity('1')
    setUnit('pcs')
    setPackageCount('1')
    setPackageQuantity('1')
    setPackageUnit('pcs')
    resetExpirySplit()
  }

  const selectKnownProduct = (product: Tables<'products'>, normalizedEan: string) => {
    setMode('existing')
    setProductId(product.id)
    setEan(normalizedEan)
    setPackageCount('1')
    setQuantity('1')
    resetExpirySplit()
    setLookupError(null)
    setImageUrl(product.image_url)
    setLookupStatus(
      hasPackage(product)
        ? `Tenhle kód už známe jako ${product.name}. Stačí zadat počet balení.`
        : `Tenhle kód už známe jako ${product.name}. Stačí zadat množství.`
    )
  }

  const lookupEan = async (candidate = ean) => {
    const normalized = normalizeBarcode(candidate)
    if (!normalized) {
      setLookupError('Čárový kód musí mít 8 až 14 číslic.')
      setLookupStatus(null)
      return
    }

    setEan(normalized)
    setLookupLoading(true)
    setLookupError(null)
    setLookupStatus(null)
    setError(null)

    const localMatches = dashboard.products.filter((product) => product.ean_code === normalized)
    if (localMatches.length === 1) {
      selectKnownProduct(localMatches[0], normalized)
      setLookupLoading(false)
      return
    }
    if (localMatches.length > 1) {
      setLookupError('Tenhle kód je uložený u více produktů. Vyber produkt ručně a data nesmažeme.')
      setLookupLoading(false)
      return
    }

    setMode('new')
    setProductId('')
    resetExternalProduct()

    try {
      const response = await fetch(`/api/products/ean?ean=${encodeURIComponent(normalized)}`)
      const payload = (await response.json()) as ProductLookupPayload

      if (response.status === 404) {
        setLookupStatus('Tenhle kód zatím neznáme. Doplň název jednou a příště ho domácnost pozná sama.')
        return
      }

      if (!response.ok) {
        setLookupStatus('Online databáze teď neodpovídá. Kód si přesto můžeš uložit ručně a příště ho poznáme.')
        return
      }

      if (!payload.found || !payload.product) {
        setLookupStatus('Tenhle kód zatím neznáme. Doplň název jednou a příště ho domácnost pozná sama.')
        return
      }

      setEan(payload.product.ean)
      setName(payload.product.name)
      setBrand(payload.product.brand)
      setCategory(payload.product.category)
      setImageUrl(payload.product.imageUrl)

      if (payload.product.packageQuantity && payload.product.packageUnit) {
        setEntryMode('packages')
        setPackageQuantity(String(payload.product.packageQuantity))
        setPackageUnit(payload.product.packageUnit)
        setUnit(payload.product.packageUnit)
        setPackageCount('1')
      }

      setLookupStatus(
        payload.product.name
          ? payload.product.packageQuantity && payload.product.packageUnit
            ? `Nalezeno. Jedno balení má ${formatQuantity(payload.product.packageQuantity, payload.product.packageUnit)} — zadej už jen kolik balení máš.`
            : 'Nalezeno. Zkontroluj název a zadej množství.'
          : 'Kód jsme našli, ale název chybí. Doplň ho jednou a příště už zůstane uložený.'
      )
    } catch {
      setLookupStatus('Online databáze teď neodpovídá. Kód si přesto můžeš uložit ručně a příště ho poznáme.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleScannedBarcode = (barcode: string) => {
    setEan(barcode)
    setLookupError(null)
    setLookupStatus(null)
    setImageUrl(null)
    void lookupEan(barcode)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeHousehold || !resolvedStorageId) return

    let quantityValue: number
    if (usesPackages) {
      const countValue = Number(packageCount)
      const packageValue = resolvedPackageQuantity
      if (!Number.isFinite(countValue) || countValue <= 0 || !hasAtMostThreeDecimals(countValue)) {
        setError('Počet balení musí být větší než nula a mít nejvýše tři desetinná místa.')
        return
      }
      if (!packageValue || !Number.isFinite(packageValue) || packageValue <= 0 || !hasAtMostThreeDecimals(packageValue)) {
        setError('Velikost jednoho balení musí být větší než nula a mít nejvýše tři desetinná místa.')
        return
      }
      const total = totalForPackages(countValue, packageValue)
      if (total === null) {
        setError('Množství se nepodařilo spočítat. Zkontroluj počet a velikost balení.')
        return
      }
      quantityValue = total
    } else {
      quantityValue = Number(quantity)
      if (!Number.isFinite(quantityValue) || quantityValue <= 0 || !hasAtMostThreeDecimals(quantityValue)) {
        setError('Množství musí být větší než nula a mít nejvýše tři desetinná místa.')
        return
      }
    }

    let splitExpiryBatches: CanonicalExpiryBatch[] | null = null
    if (usesPackages && differentExpiryDates) {
      if (!resolvedPackageQuantity) {
        setError('Velikost jednoho balení chybí.')
        return
      }
      const splitResult = buildPackageExpiryBatches(
        Number(packageCount),
        resolvedPackageQuantity,
        expiryType,
        expiryGroups.map((group) => ({
          packageCount: Number(group.packageCount),
          expiryDate: group.expiryDate,
        }))
      )
      if (!splitResult.ok) {
        setError(splitResult.error)
        return
      }
      splitExpiryBatches = splitResult.batches
    }

    if (!differentExpiryDates && expiryType !== 'unknown' && !expiryDate) {
      setError('Vyber datum, nebo nech „Bez známého data“.')
      return
    }

    const normalizedEan = ean.trim() ? normalizeBarcode(ean) : null
    if (ean.trim() && !normalizedEan) {
      setError('Čárový kód musí mít 8 až 14 číslic.')
      return
    }

    setSubmitting(true)
    setError(null)
    const supabase = supabaseV2Browser()
    const expiryArgs =
      expiryType === 'unknown'
        ? { p_expiry_type: 'unknown' as const }
        : { p_expiry_type: expiryType, p_expiry_date: expiryDate }

    const result = splitExpiryBatches
      ? await supabase.rpc('save_product_expiry_batches', {
          p_household_id: activeHousehold.id,
          p_storage_unit_id: resolvedStorageId,
          p_unit: resolvedUnit,
          p_batches: splitExpiryBatches.map((batch) => ({
            quantity: batch.quantity,
            expiry_type: batch.expiry_type,
            expiry_date: batch.expiry_date,
          })),
          p_product_id: mode === 'existing' ? selectedProduct?.id : undefined,
          p_name: mode === 'new' ? name.trim() : undefined,
          p_brand: mode === 'new' ? brand.trim() || undefined : undefined,
          p_ean_code: mode === 'new' ? normalizedEan || undefined : undefined,
          p_category: mode === 'new' ? category.trim() || undefined : undefined,
          p_image_url: mode === 'new' ? imageUrl || undefined : undefined,
          p_package_quantity: mode === 'new' && usesPackages ? resolvedPackageQuantity ?? undefined : undefined,
          p_package_unit: mode === 'new' && usesPackages ? (resolvedPackageUnit as InventoryUnit) : undefined,
        })
      : mode === 'existing'
        ? selectedProduct
          ? await supabase.rpc('add_batch_to_product', {
              p_product_id: selectedProduct.id,
              p_storage_unit_id: resolvedStorageId,
              p_quantity: quantityValue,
              p_unit: selectedProduct.default_unit,
              ...expiryArgs,
            })
          : { data: null, error: new Error('missing_product') }
        : await supabase.rpc('create_or_add_product_batch', {
            p_household_id: activeHousehold.id,
            p_storage_unit_id: resolvedStorageId,
            p_name: name.trim(),
            p_quantity: quantityValue,
            p_unit: resolvedUnit,
            p_brand: brand.trim() || undefined,
            p_ean_code: normalizedEan || undefined,
            p_category: category.trim() || undefined,
            p_image_url: imageUrl || undefined,
            p_package_quantity: usesPackages ? resolvedPackageQuantity ?? undefined : undefined,
            p_package_unit: usesPackages ? (resolvedPackageUnit as InventoryUnit) : undefined,
            ...expiryArgs,
          })

    if (result.error || !result.data) {
      setError('Jídlo se nepodařilo uložit. Zásoba zůstala beze změny; zkus to prosím znovu.')
      setSubmitting(false)
      return
    }

    toast.success(
      usesPackages
        ? differentExpiryDates
          ? `${formatPackageCount(Number(packageCount))} uloženo podle ${expiryGroups.length} dat.`
          : `${formatPackageCount(Number(packageCount))} uloženo.`
        : mode === 'existing'
          ? 'Další zásoba je uložená.'
          : 'Jídlo je uložené.'
    )
    router.push('/inventory')
    router.refresh()
  }

  if (householdLoading || dashboard.loading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />
  }

  if (dashboard.error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Zásoby se nepodařilo načíst</h1>
        <p className="mt-2 text-sm text-text-muted">Nic se nezměnilo. Zkus načtení znovu.</p>
        <button className="button-secondary mt-5" onClick={() => void dashboard.refresh()}>Zkusit znovu</button>
      </div>
    )
  }

  if (!activeHousehold) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Nejdřív založ domácnost</h1>
        <p className="mt-2 text-sm text-text-muted">Pak bude jasné, do kterých zásob jídlo patří.</p>
        <Link href="/dashboard" className="button-primary mt-5">Zpět domů</Link>
      </div>
    )
  }

  if (dashboard.storageUnits.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Chybí místo pro jídlo</h1>
        <p className="mt-2 text-sm text-text-muted">Přidej lednici, mrazák nebo spíž a pak pokračuj.</p>
        <Link href="/more/storage" className="button-primary mt-5">Přidat úložné místo</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/inventory"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Zpět na zásoby
      </Link>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <PackagePlus size={22} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-[28px] font-bold tracking-[-0.03em] text-text">Přidat jídlo</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Nejrychlejší je čárový kód. Když ho neznáme, údaje doplníš jednou a příště už si je domácnost pamatuje.
        </p>

        {dashboard.products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1.5" role="group" aria-label="Co přidáváš">
            <button
              type="button"
              onClick={() => {
                setMode('new')
                setProductId('')
                setLookupStatus(null)
                resetExpirySplit()
              }}
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
                mode === 'new' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              Nové jídlo
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('existing')
                setLookupStatus(null)
                resetExpirySplit()
              }}
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
                mode === 'existing' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              Už ho znám
            </button>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="rounded-2xl border border-primary/15 bg-primary-soft/35 p-4">
            <label htmlFor={eanInputId} className="field-label">Čárový kód <span className="font-normal text-text-muted">volitelně</span></label>
            <input
              id={eanInputId}
              className="input-field"
              value={ean}
              onChange={(event) => {
                setEan(event.target.value)
                setLookupError(null)
                setLookupStatus(null)
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="např. 859…"
              maxLength={20}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <BarcodeScannerAction onDetected={handleScannedBarcode} disabled={lookupLoading} />
              <button
                type="button"
                className="button-secondary shrink-0"
                onClick={() => void lookupEan()}
                disabled={lookupLoading || !ean.trim()}
              >
                <Search size={17} aria-hidden="true" />
                {lookupLoading ? 'Hledám…' : 'Najít podle kódu'}
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              Kód můžeš naskenovat nebo opsat. Když ho už známe, doplníme jídlo sami.
            </p>
            {lookupStatus ? <p className="mt-2 text-sm font-medium text-primary" role="status">{lookupStatus}</p> : null}
            {lookupError ? <p className="mt-2 text-sm text-warning" role="status">{lookupError}</p> : null}
          </div>

          {mode === 'existing' && dashboard.products.length > 0 ? (
            <div>
              <label htmlFor={productSelectId} className="field-label">Co přidáváš?</label>
              <select
                id={productSelectId}
                className="input-field"
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value)
                  const product = dashboard.products.find((item) => item.id === event.target.value)
                  if (product?.ean_code) setEan(product.ean_code)
                  setPackageCount('1')
                  setQuantity('1')
                  resetExpirySplit()
                }}
                required
              >
                <option value="">Vyber jídlo</option>
                {dashboard.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.brand ? ` · ${product.brand}` : ''}
                  </option>
                ))}
              </select>
              {selectedProduct ? (
                <p className="mt-2 text-sm text-text-muted">
                  {hasPackage(selectedProduct)
                    ? `1 balení = ${formatQuantity(selectedProduct.package_quantity!, selectedProduct.package_unit!)}`
                    : `Sledujeme v jednotce ${selectedProduct.default_unit === 'pcs' ? 'kusy' : selectedProduct.default_unit}.`}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              {imageUrl ? (
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-canvas p-3">
                  <Image
                    src={imageUrl}
                    alt={name ? `Náhled produktu ${name}` : 'Náhled produktu'}
                    width={88}
                    height={88}
                    className="h-20 w-20 shrink-0 rounded-xl bg-white object-contain"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{name || 'Produkt bez názvu'}</p>
                    {brand ? <p className="mt-1 text-sm text-text-muted">{brand}</p> : null}
                  </div>
                </div>
              ) : null}

              <label className="block">
                <span className="field-label">Název</span>
                <input
                  className="input-field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="např. Eidam 30 %"
                  maxLength={200}
                  required
                />
              </label>

              <details className="rounded-2xl border border-border bg-canvas/50 px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-text">Upřesnit značku nebo kategorii</summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">Značka <span className="font-normal text-text-muted">volitelně</span></span>
                    <input className="input-field" value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={200} />
                  </label>
                  <label className="block">
                    <span className="field-label">Kategorie <span className="font-normal text-text-muted">volitelně</span></span>
                    <input className="input-field" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={200} />
                  </label>
                </div>
              </details>
            </>
          )}

          {usesPackages ? (
            <div className="rounded-2xl border border-primary/15 bg-primary-soft/30 p-4">
              <label className="block">
                <span className="field-label">Kolik balení máš?</span>
                <input
                  className="input-field"
                  type="number"
                  min="0.001"
                  step="0.001"
                  inputMode="decimal"
                  value={packageCount}
                  onChange={(event) => setPackageCount(event.target.value)}
                  required
                />
              </label>

              {mode === 'new' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="field-label">Jedno balení má</span>
                    <input
                      className="input-field"
                      type="number"
                      min="0.001"
                      step="0.001"
                      inputMode="decimal"
                      value={packageQuantity}
                      onChange={(event) => setPackageQuantity(event.target.value)}
                      required
                    />
                  </label>
                  <div>
                    <label htmlFor={packageUnitSelectId} className="field-label">Jednotka balení</label>
                    <select
                      id={packageUnitSelectId}
                      className="input-field"
                      value={packageUnit}
                      onChange={(event) => setPackageUnit(event.target.value as InventoryUnit)}
                    >
                      {UNITS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                </div>
              ) : null}

              {resolvedPackageQuantity && resolvedPackageUnit ? (
                <p className="mt-3 text-sm text-text-muted">
                  {formatPackageCount(Number(packageCount) || 0)} × {formatQuantity(resolvedPackageQuantity, resolvedPackageUnit)}
                  {totalForPackages(Number(packageCount), resolvedPackageQuantity) !== null
                    ? ` = ${formatQuantity(totalForPackages(Number(packageCount), resolvedPackageQuantity)!, resolvedPackageUnit)} celkem`
                    : ''}
                </p>
              ) : null}

              {mode === 'new' ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    setEntryMode('amount')
                    setUnit(packageUnit)
                    setQuantity('1')
                    resetExpirySplit()
                  }}
                >
                  Radši zadám celkové množství
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Kolik toho přidáváš?</span>
                <input
                  className="input-field"
                  type="number"
                  min="0.001"
                  step="0.001"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </label>
              <div>
                <label htmlFor={unitSelectId} className="field-label">Jednotka</label>
                <select
                  id={unitSelectId}
                  className="input-field"
                  value={resolvedUnit}
                  onChange={(event) => setUnit(event.target.value as InventoryUnit)}
                  disabled={mode === 'existing'}
                >
                  {UNITS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              {mode === 'new' ? (
                <button
                  type="button"
                  className="sm:col-span-2 justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    setEntryMode('packages')
                    setPackageUnit(unit)
                    setPackageQuantity('1')
                    setPackageCount('1')
                    resetExpirySplit()
                  }}
                >
                  Přidávám více stejných balení
                </button>
              ) : null}
            </div>
          )}

          <label className="block">
            <span className="field-label">Kam to dáváš?</span>
            <select className="input-field" value={resolvedStorageId} onChange={(event) => setStorageUnitId(event.target.value)} required>
              {dashboard.storageUnits.map((storage) => <option key={storage.id} value={storage.id}>{storage.name}</option>)}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Datum na obalu</span>
              <select
                className="input-field"
                value={expiryType}
                onChange={(event) => {
                  const next = event.target.value as ExpiryType
                  setExpiryType(next)
                  if (next === 'unknown') {
                    setExpiryDate('')
                    resetExpirySplit()
                  }
                }}
              >
                <option value="unknown">Nevím / není uvedené</option>
                <option value="use_by">Spotřebujte do</option>
                <option value="best_before">Minimální trvanlivost</option>
              </select>
            </label>
            {!differentExpiryDates ? (
              <label className="block">
                <span className="field-label">Datum</span>
                <input
                  className="input-field disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted"
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  disabled={expiryType === 'unknown'}
                  required={expiryType !== 'unknown'}
                />
              </label>
            ) : (
              <div className="self-end rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary">
                Každá skupina má vlastní datum
              </div>
            )}
          </div>

          {usesPackages && expiryType !== 'unknown' && !differentExpiryDates && Number(packageCount) > 1 ? (
            <button
              type="button"
              className="button-secondary w-full sm:w-auto"
              onClick={() => {
                setExpiryGroups([
                  makeExpiryGroup(packageCount, expiryDate),
                  makeExpiryGroup('', ''),
                ])
                setDifferentExpiryDates(true)
                setError(null)
              }}
            >
              Mají různá data
            </button>
          ) : null}

          {usesPackages && differentExpiryDates ? (
            <div className="rounded-2xl border border-primary/15 bg-primary-soft/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold text-text">Rozděl balení podle data</h2>
                  <p className="mt-1 text-sm leading-5 text-text-muted">
                    Zadej jen skupiny, které mají stejné datum na obalu. Součet musí být {formatPackageCount(Number(packageCount) || 0)}.
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    const firstDate = expiryGroups.find((group) => group.expiryDate)?.expiryDate
                    if (firstDate) setExpiryDate(firstDate)
                    resetExpirySplit()
                    setError(null)
                  }}
                >
                  Všechna mají stejné datum
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {expiryGroups.map((group, index) => (
                  <div
                    key={group.id}
                    className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                    role="group"
                    aria-label={`Skupina data ${index + 1}`}
                  >
                    <label className="block">
                      <span className="field-label">Počet balení</span>
                      <input
                        className="input-field"
                        type="number"
                        min="0.001"
                        step="0.001"
                        inputMode="decimal"
                        value={group.packageCount}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          setExpiryGroups((current) => current.map((item) =>
                            item.id === group.id ? { ...item, packageCount: nextValue } : item
                          ))
                        }}
                        aria-label={`Počet balení skupina ${index + 1}`}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Datum</span>
                      <input
                        className="input-field"
                        type="date"
                        value={group.expiryDate}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          setExpiryGroups((current) => current.map((item) =>
                            item.id === group.id ? { ...item, expiryDate: nextValue } : item
                          ))
                        }}
                        aria-label={`Datum skupina ${index + 1}`}
                        required
                      />
                    </label>
                    <button
                      type="button"
                      className="button-secondary px-3"
                      onClick={() => setExpiryGroups((current) => current.filter((item) => item.id !== group.id))}
                      disabled={expiryGroups.length <= 2}
                      aria-label={`Smazat skupinu ${index + 1}`}
                      title={expiryGroups.length <= 2 ? 'Pro různá data jsou potřeba alespoň dvě skupiny.' : 'Smazat skupinu'}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                      <span className="sm:sr-only">Smazat</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setExpiryGroups((current) => [...current, makeExpiryGroup('', '')])}
                  disabled={expiryGroups.length >= 50}
                >
                  <Plus size={17} aria-hidden="true" />
                  Přidat další datum
                </button>
                <p
                  className={`text-sm font-semibold ${remainingPackageCount === 0 ? 'text-primary' : remainingPackageCount > 0 ? 'text-warning' : 'text-danger'}`}
                  role="status"
                >
                  {remainingPackageCount === 0
                    ? `Rozděleno ${formatPackageCount(groupedPackageCount)} z ${formatPackageCount(Number(packageCount) || 0)}.`
                    : remainingPackageCount > 0
                      ? `Zbývá rozdělit ${formatPackageCount(remainingPackageCount)}.`
                      : `Rozděleno je o ${formatPackageCount(Math.abs(remainingPackageCount))} víc.`}
                </p>
              </div>
            </div>
          ) : null}

          {error ? <div className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger" role="alert">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting || (mode === 'new' ? !name.trim() : !selectedProduct) || !resolvedStorageId}
            className="button-primary w-full"
          >
            {submitting ? 'Ukládám…' : usesPackages ? 'Přidat balení' : 'Přidat do zásob'}
          </button>
        </form>
      </div>
    </div>
  )
}
