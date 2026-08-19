'use client'

import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeBarcode } from '@/domain/products/openFoodFacts'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import type { Tables } from '@/types/supabase-v2'

function unitLabel(unit: string) {
  return unit === 'pcs' ? 'ks' : unit
}

export function EditProductMetadataAction({
  product,
  onUpdated,
}: {
  product: Tables<'products'>
  onUpdated: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [ean, setEan] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const nameId = useId()
  const brandId = useId()
  const eanId = useId()
  const categoryId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => nameRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submitting) return
      setOpen(false)
      setError(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, submitting])

  const startEditing = () => {
    setName(product.name)
    setBrand(product.brand ?? '')
    setEan(product.ean_code ?? '')
    setCategory(product.category ?? '')
    setError(null)
    setOpen(true)
  }

  const close = () => {
    if (submitting) return
    setOpen(false)
    setError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedBrand = brand.trim()
    const normalizedCategory = category.trim()
    const normalizedEan = ean.trim() ? normalizeBarcode(ean) : null

    if (!normalizedName) {
      setError('Název produktu nesmí být prázdný.')
      return
    }
    if (normalizedName.length > 200 || normalizedBrand.length > 200 || normalizedCategory.length > 200) {
      setError('Název, značka i kategorie mohou mít nejvýše 200 znaků.')
      return
    }
    if (ean.trim() && !normalizedEan) {
      setError('EAN musí obsahovat 8 až 14 číslic.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: updateError } = await supabaseV2Browser().rpc('update_product_metadata', {
      p_product_id: product.id,
      p_name: normalizedName,
      p_brand: normalizedBrand || undefined,
      p_ean_code: normalizedEan || undefined,
      p_category: normalizedCategory || undefined,
    })

    if (updateError) {
      setError('Údaje produktu se nepodařilo uložit. Původní data zůstala beze změny.')
      setSubmitting(false)
      return
    }

    await onUpdated()
    toast.success(`${normalizedName} · údaje upraveny.`)
    setSubmitting(false)
    setOpen(false)
  }

  return (
    <>
      <button type="button" className="button-secondary shrink-0" onClick={startEditing}>
        <Pencil size={17} aria-hidden="true" />
        Upravit produkt
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-text/30 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Produkt</p>
                <h2 id={titleId} className="mt-1 text-xl font-bold tracking-[-0.02em] text-text">
                  Upravit údaje produktu
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Zavřít"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p id={descriptionId} className="mt-3 text-sm leading-6 text-text-muted">
              Oprav název nebo metadata, pokud byl sken či ruční zadání nepřesné. Jednotka zůstává {unitLabel(product.default_unit)}, protože na ni navazují existující balení a cílová zásoba.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor={nameId} className="field-label">Název</label>
                <input
                  id={nameId}
                  ref={nameRef}
                  className="input-field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label htmlFor={brandId} className="field-label">Značka</label>
                <input
                  id={brandId}
                  className="input-field"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  maxLength={200}
                  placeholder="volitelné"
                />
              </div>

              <div>
                <label htmlFor={eanId} className="field-label">EAN</label>
                <input
                  id={eanId}
                  className="input-field"
                  value={ean}
                  onChange={(event) => setEan(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="8 až 14 číslic"
                />
              </div>

              <div>
                <label htmlFor={categoryId} className="field-label">Kategorie</label>
                <input
                  id={categoryId}
                  className="input-field"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  maxLength={200}
                  placeholder="volitelné"
                />
              </div>

              {error ? (
                <p className="rounded-xl bg-danger/8 px-3 py-2.5 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <button type="button" onClick={close} disabled={submitting} className="button-secondary flex-1">
                  Zrušit
                </button>
                <button type="submit" disabled={submitting || !name.trim()} className="button-primary flex-1">
                  <Save size={17} aria-hidden="true" />
                  {submitting ? 'Ukládám…' : 'Uložit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
