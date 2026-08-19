'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, PackagePlus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { BarcodeScannerAction } from '@/components/app/BarcodeScannerAction'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import { normalizeBarcode, type OpenFoodFactsProduct } from '@/domain/products/openFoodFacts'
import type { Enums } from '@/types/supabase-v2'

type InventoryUnit = Enums<'inventory_unit'>
type ExpiryType = Enums<'expiry_type'>

type ProductLookupPayload = {
  found: boolean
  product?: OpenFoodFactsProduct
  error?: string
}

const UNITS: { value: InventoryUnit; label: string }[] = [
  { value: 'pcs', label: 'kusy' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
]

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
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<InventoryUnit>('pcs')
  const [storageUnitId, setStorageUnitId] = useState('')
  const [expiryType, setExpiryType] = useState<ExpiryType>('unknown')
  const [expiryDate, setExpiryDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const productSelectId = useId()
  const unitSelectId = useId()
  const unitHelpId = useId()
  const eanInputId = useId()

  const selectedProduct = useMemo(
    () => dashboard.products.find((product) => product.id === productId) ?? null,
    [dashboard.products, productId]
  )
  const resolvedStorageId = storageUnitId || dashboard.storageUnits[0]?.id || ''
  const resolvedUnit = mode === 'existing' && selectedProduct ? selectedProduct.default_unit : unit

  const lookupEan = async (candidate = ean) => {
    const normalized = normalizeBarcode(candidate)
    if (!normalized) {
      setLookupError('EAN musí obsahovat 8 až 14 číslic.')
      setLookupStatus(null)
      return
    }

    setEan(normalized)
    setLookupError(null)
    setLookupStatus(null)
    setImageUrl(null)

    const existingProduct = dashboard.products.find((product) => product.ean_code === normalized)
    if (existingProduct) {
      setMode('existing')
      setProductId(existingProduct.id)
      setLookupStatus(
        `${existingProduct.name} už v této domácnosti známe. Přidáváš další balení, takže cíl zásoby i historie zůstanou u jednoho produktu.`
      )
      return
    }

    setLookupLoading(true)

    try {
      const response = await fetch(`/api/products/ean?ean=${encodeURIComponent(normalized)}`)
      const payload = (await response.json()) as ProductLookupPayload

      if (response.status === 404 || !payload.found || !payload.product) {
        setLookupError('Produkt v Open Food Facts zatím není. Údaje můžeš vyplnit ručně.')
        return
      }

      if (!response.ok) {
        setLookupError('Open Food Facts teď neodpovídá. Ruční zadání dál funguje.')
        return
      }

      setEan(payload.product.ean)
      if (payload.product.name) setName(payload.product.name)
      if (payload.product.brand) setBrand(payload.product.brand)
      if (payload.product.category) setCategory(payload.product.category)
      setImageUrl(payload.product.imageUrl)
      setLookupStatus(
        payload.product.name
          ? 'Údaje jsou předvyplněné. Před uložením je můžeš libovolně upravit.'
          : 'Produkt byl nalezen, ale chybí mu název. Doplň údaje ručně.'
      )
    } catch {
      setLookupError('Open Food Facts teď neodpovídá. Ruční zadání dál funguje.')
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

    const quantityValue = Number(quantity)
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError('Množství musí být větší než nula.')
      return
    }
    if (expiryType !== 'unknown' && !expiryDate) {
      setError('Pro zvolený typ expirace vyber datum.')
      return
    }

    const normalizedEan = ean.trim() ? normalizeBarcode(ean) : null
    if (ean.trim() && !normalizedEan) {
      setError('EAN musí obsahovat 8 až 14 číslic.')
      return
    }

    if (mode === 'new' && normalizedEan) {
      const existingProduct = dashboard.products.find((product) => product.ean_code === normalizedEan)
      if (existingProduct) {
        setMode('existing')
        setProductId(existingProduct.id)
        setLookupStatus(
          `${existingProduct.name} už v této domácnosti existuje. Přepnul jsem formulář na další balení.`
        )
        setError('Stejný EAN nevytváří druhý produkt. Zkontroluj množství a přidej další balení.')
        return
      }
    }

    setSubmitting(true)
    setError(null)
    const supabase = supabaseV2Browser()
    const expiryArgs =
      expiryType === 'unknown'
        ? { p_expiry_type: 'unknown' as const }
        : { p_expiry_type: expiryType, p_expiry_date: expiryDate }

    const result =
      mode === 'existing'
        ? selectedProduct
          ? await supabase.rpc('add_batch_to_product', {
              p_product_id: selectedProduct.id,
              p_storage_unit_id: resolvedStorageId,
              p_quantity: quantityValue,
              p_unit: selectedProduct.default_unit,
              ...expiryArgs,
            })
          : { data: null, error: new Error('Vyber produkt.') }
        : await supabase.rpc('create_product_with_batch', {
            p_household_id: activeHousehold.id,
            p_storage_unit_id: resolvedStorageId,
            p_name: name.trim(),
            p_quantity: quantityValue,
            p_unit: unit,
            p_brand: brand.trim() || undefined,
            p_ean_code: normalizedEan || undefined,
            p_category: category.trim() || undefined,
            p_image_url: imageUrl || undefined,
            ...expiryArgs,
          })

    if (result.error || !result.data) {
      setError(result.error?.message || 'Jídlo se nepodařilo uložit.')
      setSubmitting(false)
      return
    }

    toast.success(mode === 'existing' ? 'Další balení je uložené.' : 'Jídlo je uložené.')
    router.push('/inventory')
    router.refresh()
  }

  if (householdLoading || dashboard.loading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-surface-muted" aria-busy="true" />
  }

  if (!activeHousehold) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Nejdřív založ domácnost</h1>
        <p className="mt-2 text-sm text-text-muted">Bez domácnosti nemá zásoba vlastníka ani bezpečnostní hranici.</p>
        <Link href="/dashboard" className="button-primary mt-5">Zpět na domů</Link>
      </div>
    )
  }

  if (dashboard.storageUnits.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-danger/20 bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Chybí úložné místo</h1>
        <p className="mt-2 text-sm text-text-muted">
          Přidání jídla je záměrně zastavené, dokud není jasné, kam fyzicky patří.
        </p>
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
          EAN může předvyplnit produkt. Balení pak říká, kolik toho doma skutečně je a do kdy.
        </p>

        {dashboard.products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1.5" role="group" aria-label="Typ přidání">
            <button
              type="button"
              onClick={() => {
                setMode('new')
                setProductId('')
                setLookupStatus(null)
                setError(null)
              }}
              aria-pressed={mode === 'new'}
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
                mode === 'new' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              Nový produkt
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('existing')
                setLookupStatus(null)
                setError(null)
              }}
              aria-pressed={mode === 'existing'}
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
                mode === 'existing' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              Další balení
            </button>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-5">
          {mode === 'existing' && dashboard.products.length > 0 ? (
            <div>
              <label htmlFor={productSelectId} className="field-label">Produkt</label>
              <select
                id={productSelectId}
                className="input-field"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                required
              >
                <option value="">Vyber produkt</option>
                {dashboard.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.brand ? ` · ${product.brand}` : ''}
                  </option>
                ))}
              </select>
              {lookupStatus ? (
                <p className="mt-2 text-sm font-medium text-primary" role="status">{lookupStatus}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-primary/15 bg-primary-soft/35 p-4">
                <label htmlFor={eanInputId} className="field-label">EAN / čárový kód</label>
                <input
                  id={eanInputId}
                  className="input-field"
                  value={ean}
                  onChange={(event) => {
                    setEan(event.target.value)
                    setLookupError(null)
                    setLookupStatus(null)
                    setImageUrl(null)
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="např. 859…"
                  maxLength={20}
                  autoFocus
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <BarcodeScannerAction
                    onDetected={handleScannedBarcode}
                    disabled={lookupLoading}
                  />
                  <button
                    type="button"
                    className="button-secondary shrink-0"
                    onClick={() => void lookupEan()}
                    disabled={lookupLoading || !ean.trim()}
                  >
                    <Search size={17} aria-hidden="true" />
                    {lookupLoading ? 'Hledám…' : 'Načíst údaje'}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  Naskenuj kód kamerou nebo ho napiš. Když produkt nenajdeme, pokračuj ručně.
                </p>
                {lookupStatus ? <p className="mt-2 text-sm font-medium text-primary">{lookupStatus}</p> : null}
                {lookupError ? <p className="mt-2 text-sm text-warning" role="status">{lookupError}</p> : null}
                <a
                  href="https://world.openfoodfacts.org"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-text-muted underline underline-offset-2 hover:text-text"
                >
                  Produktová data: Open Food Facts
                </a>
              </div>

              {imageUrl ? (
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-canvas p-3">
                  <Image
                    src={imageUrl}
                    alt={name ? `Náhled produktu ${name}` : 'Náhled produktu z Open Food Facts'}
                    width={88}
                    height={88}
                    className="h-20 w-20 shrink-0 rounded-xl bg-white object-contain"
                  />
                  <p className="text-sm leading-6 text-text-muted">
                    Obrázek je jen pomůcka k rozpoznání produktu. Množství a expiraci vždy zadáváš pro konkrétní balení doma.
                  </p>
                </div>
              ) : null}

              <label className="block">
                <span className="field-label">Název</span>
                <input
                  className="input-field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="např. Vejce"
                  maxLength={200}
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">Značka <span className="font-normal text-text-muted">volitelně</span></span>
                  <input
                    className="input-field"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="např. Albert"
                    maxLength={200}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Kategorie <span className="font-normal text-text-muted">volitelně</span></span>
                  <input
                    className="input-field"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="např. Jogurty"
                    maxLength={200}
                  />
                </label>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Množství</span>
              <input
                className="input-field"
                type="number"
                min="0.001"
                step="0.001"
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
                aria-describedby={mode === 'existing' ? unitHelpId : undefined}
              >
                {UNITS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              {mode === 'existing' ? (
                <span id={unitHelpId} className="mt-1.5 block text-xs text-text-muted">
                  Další balení drží stejnou jednotku jako produkt. Převody budeme dělat jen explicitně.
                </span>
              ) : null}
            </div>
          </div>

          <label className="block">
            <span className="field-label">Kam to patří</span>
            <select
              className="input-field"
              value={resolvedStorageId}
              onChange={(event) => setStorageUnitId(event.target.value)}
              required
            >
              {dashboard.storageUnits.map((storage) => (
                <option key={storage.id} value={storage.id}>{storage.name}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Typ data</span>
              <select
                className="input-field"
                value={expiryType}
                onChange={(event) => {
                  const next = event.target.value as ExpiryType
                  setExpiryType(next)
                  if (next === 'unknown') setExpiryDate('')
                }}
              >
                <option value="unknown">Bez známého data</option>
                <option value="use_by">Spotřebujte do</option>
                <option value="best_before">Minimální trvanlivost</option>
              </select>
            </label>
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
          </div>

          {error ? (
            <div className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger" role="alert">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              submitting ||
              (mode === 'new' ? !name.trim() : !selectedProduct) ||
              !resolvedStorageId
            }
            className="button-primary w-full"
          >
            {submitting ? 'Ukládám…' : mode === 'existing' ? 'Přidat balení' : 'Přidat do zásob'}
          </button>
        </form>
      </div>
    </div>
  )
}
