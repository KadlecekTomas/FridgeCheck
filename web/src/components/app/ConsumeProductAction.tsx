'use client'

import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Check, Minus, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import {
  formatPackageCount,
  formatQuantity,
  formatStockQuantity,
  hasAtMostThreeDecimals,
  packageCountForTotal,
  totalForPackages,
} from '@/domain/inventory/quantity'

export function ConsumeProductAction({
  productId,
  productName,
  unit,
  availableQuantity,
  availableQuantityIsEstimate = false,
  packageQuantity = null,
  packageUnit = null,
  onConsumed,
  compact = false,
}: {
  productId: string
  productName: string
  unit: string
  availableQuantity: number
  availableQuantityIsEstimate?: boolean
  packageQuantity?: number | null
  packageUnit?: string | null
  onConsumed: () => void | Promise<void>
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const usesPackages = Boolean(packageQuantity && packageQuantity > 0 && packageUnit === unit)
  const availablePackages = usesPackages && packageQuantity
    ? packageCountForTotal(availableQuantity, packageQuantity)
    : null

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        setOpen(false)
        setQuantity('')
        setError(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, submitting])

  const close = () => {
    if (submitting) return
    setOpen(false)
    setQuantity('')
    setError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const enteredValue = Number(quantity)
    if (!Number.isFinite(enteredValue) || enteredValue <= 0) {
      setError(usesPackages ? 'Zadej počet balení větší než nula.' : 'Zadej množství větší než nula.')
      return
    }
    if (!hasAtMostThreeDecimals(enteredValue)) {
      setError('Hodnota může mít nejvýše tři desetinná místa.')
      return
    }

    const storedValue = usesPackages && packageQuantity
      ? totalForPackages(enteredValue, packageQuantity)
      : enteredValue

    if (storedValue === null) {
      setError('Množství se nepodařilo spočítat.')
      return
    }
    if (storedValue > availableQuantity) {
      setError(
        usesPackages && availablePackages !== null
          ? `Doma je jen ${formatPackageCount(availablePackages)}.`
          : `Použitelně je doma jen ${formatQuantity(availableQuantity, unit, availableQuantityIsEstimate)}.`
      )
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: consumeError } = await supabaseV2Browser().rpc('consume_product_fefo', {
      p_product_id: productId,
      p_quantity: storedValue,
    })

    if (consumeError) {
      setError(
        consumeError.message.includes('Insufficient usable stock')
          ? 'Zásoba se mezitím změnila. Obnov přehled a zkus to znovu.'
          : 'Spotřebu se nepodařilo uložit. Zásoba zůstala beze změny.'
      )
      setSubmitting(false)
      return
    }

    await onConsumed()
    toast.success(
      `Spotřebováno ${usesPackages ? formatPackageCount(enteredValue) : formatQuantity(storedValue, unit)} · ${productName}`
    )
    setSubmitting(false)
    setOpen(false)
    setQuantity('')
  }

  return (
    <>
      <button
        type="button"
        className={compact ? 'button-secondary min-h-9 px-3 py-1.5 text-xs' : 'button-secondary shrink-0'}
        onClick={() => setOpen(true)}
        disabled={availableQuantity <= 0}
        aria-label={`Spotřebovat ${productName}`}
      >
        <Minus size={compact ? 14 : 17} aria-hidden="true" />
        Spotřebovat
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
                <p className="text-sm font-semibold text-primary">{productName}</p>
                <h2 id={titleId} className="mt-1 text-xl font-bold tracking-[-0.02em] text-text">
                  {usesPackages ? 'Kolik balení jsi spotřeboval?' : 'Kolik jsi spotřeboval?'}
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
              Odečteme automaticky zásobu s nejbližším datem. Prošlé „spotřebujte do“ bez tvého rozhodnutí nepoužijeme.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor={inputId} className="field-label">
                  {usesPackages ? 'Počet balení' : 'Množství ke spotřebě'}
                </label>
                <div className="relative">
                  <input
                    id={inputId}
                    ref={inputRef}
                    className="input-field pr-20"
                    type="number"
                    min="0.001"
                    max={usesPackages && availablePackages !== null ? availablePackages : availableQuantity}
                    step="0.001"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    inputMode="decimal"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                    {usesPackages ? 'balení' : unit === 'pcs' ? 'ks' : unit}
                  </span>
                </div>
                {usesPackages && packageQuantity && packageUnit ? (
                  <p className="mt-1.5 text-xs text-text-muted">1 balení = {formatQuantity(packageQuantity, packageUnit)}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-soft/55 px-2 py-1.5 text-sm sm:px-3 sm:py-2.5">
                <span className="px-1 text-text-muted">Doma</span>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold text-primary underline-offset-4 hover:bg-white/60 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setQuantity(String(usesPackages && availablePackages !== null ? availablePackages : availableQuantity))}
                >
                  Všechno · {formatStockQuantity(availableQuantity, unit, packageQuantity, packageUnit, availableQuantityIsEstimate)}
                </button>
              </div>

              {availableQuantityIsEstimate && !usesPackages ? (
                <p className="text-xs leading-5 text-text-muted">Dostupný stav je odhad. Zadej ale množství, které jsi skutečně spotřeboval; historie si přesnost jednotlivých FEFO batchů zachová sama.</p>
              ) : null}

              {error ? <p className="rounded-xl bg-danger/8 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p> : null}

              <div className="flex gap-2">
                <button type="button" onClick={close} disabled={submitting} className="button-secondary flex-1">Zrušit</button>
                <button type="submit" disabled={submitting || !quantity} className="button-primary flex-1">
                  <Check size={17} aria-hidden="true" />
                  {submitting ? 'Ukládám…' : 'Potvrdit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
