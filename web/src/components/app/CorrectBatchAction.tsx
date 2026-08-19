'use client'

import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Gauge, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import type { Enums } from '@/types/supabase-v2'

const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 3 })

type EstimateLevel = Enums<'inventory_estimate_level'>
type QuantityPrecision = Enums<'inventory_quantity_precision'>

function formatQuantity(value: number, unit: string, estimated = false) {
  return `${estimated ? '~' : ''}${numberFormatter.format(value)} ${unit === 'pcs' ? 'ks' : unit}`
}

function hasAtMostThreeDecimals(value: number) {
  return Math.abs(Math.round(value * 1000) / 1000 - value) <= Number.EPSILON * 16
}

function estimateQuantity(initialQuantity: number, factor: number) {
  return Math.max(0.001, Math.round(initialQuantity * factor * 1000) / 1000)
}

export function CorrectBatchAction({
  batchId,
  productName,
  quantity: recordedQuantity,
  initialQuantity,
  quantityPrecision,
  unit,
  onCorrected,
  compact = false,
}: {
  batchId: string
  productName: string
  quantity: number
  initialQuantity: number
  quantityPrecision: QuantityPrecision
  unit: string
  onCorrected: () => void | Promise<void>
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const quantityId = useId()
  const reasonId = useId()
  const quantityRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => quantityRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || submitting) return
      setOpen(false)
      setQuantity('')
      setReason('')
      setError(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, submitting])

  const close = () => {
    if (submitting) return
    setOpen(false)
    setQuantity('')
    setReason('')
    setError(null)
  }

  const applyEstimate = async (level: EstimateLevel, label: string) => {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const { data: estimatedQuantity, error: estimateError } = await supabaseV2Browser().rpc(
      'estimate_inventory_batch',
      { p_batch_id: batchId, p_level: level }
    )

    if (estimateError || typeof estimatedQuantity !== 'number') {
      setError('Odhad se nepodařilo uložit. Původní stav zůstal beze změny.')
      setSubmitting(false)
      return
    }

    await onCorrected()
    toast.success(`${productName} · ${label} · ${formatQuantity(estimatedQuantity, unit, true)}`)
    setSubmitting(false)
    setOpen(false)
    setQuantity('')
    setReason('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const value = Number(quantity)
    const normalizedReason = reason.trim()

    if (!Number.isFinite(value) || value < 0) {
      setError('Skutečné množství musí být nula nebo více.')
      return
    }
    if (!hasAtMostThreeDecimals(value)) {
      setError('Množství může mít nejvýše tři desetinná místa.')
      return
    }
    if (value === recordedQuantity && quantityPrecision === 'exact') {
      setError('Zadej skutečné množství odlišné od hodnoty v aplikaci.')
      return
    }
    if (!normalizedReason) {
      setError('Napiš stručně, proč stav opravuješ.')
      return
    }
    if (normalizedReason.length > 500) {
      setError('Důvod může mít nejvýše 500 znaků.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: delta, error: correctionError } = await supabaseV2Browser().rpc(
      'correct_inventory_batch',
      {
        p_batch_id: batchId,
        p_new_quantity: value,
        p_reason: normalizedReason,
      }
    )

    if (correctionError) {
      setError(
        correctionError.message.includes('Correction must change quantity')
          ? 'Balení se mezitím změnilo. Obnov přehled a zkus to znovu.'
          : 'Korekci se nepodařilo uložit. Zásoba zůstala beze změny.'
      )
      setSubmitting(false)
      return
    }

    await onCorrected()
    const signedDelta = typeof delta === 'number' ? delta : value - recordedQuantity
    toast.success(
      signedDelta === 0
        ? `Stav potvrzen přesně · ${productName} ${formatQuantity(value, unit)}`
        : `Stav srovnán · ${productName} ${signedDelta > 0 ? '+' : ''}${formatQuantity(signedDelta, unit)}`
    )
    setSubmitting(false)
    setOpen(false)
    setQuantity('')
    setReason('')
  }

  const fullEstimate = estimateQuantity(initialQuantity, 1)
  const halfEstimate = estimateQuantity(initialQuantity, 0.5)
  const lowEstimate = estimateQuantity(initialQuantity, 0.2)

  return (
    <>
      <button
        type="button"
        className={
          compact
            ? 'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            : 'button-secondary'
        }
        onClick={() => {
          setQuantity(String(recordedQuantity))
          setReason('')
          setError(null)
          setOpen(true)
        }}
        disabled={recordedQuantity <= 0}
        aria-label={`Srovnat stav ${productName}`}
      >
        <RefreshCw size={compact ? 14 : 17} aria-hidden="true" />
        Srovnat stav
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
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">{productName}</p>
                <h2 id={titleId} className="mt-1 text-xl font-bold tracking-[-0.02em] text-text">
                  Srovnat skutečný stav
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
              V aplikaci je {formatQuantity(recordedQuantity, unit, quantityPrecision === 'estimated')}. Když množství znáš, zadej ho přesně. Když ho nechceš vážit, použij rychlý odhad — v aplikaci zůstane viditelně označený jako přibližný.
            </p>

            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary-soft/35 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-text">
                <Gauge size={17} className="text-primary" aria-hidden="true" />
                Rychlý odhad bez vážení
              </div>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                Odhad se počítá z původního množství tohoto balení ({formatQuantity(initialQuantity, unit)}), ne z posledního odhadu.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="button-secondary min-w-0 px-2 text-xs"
                  disabled={submitting}
                  onClick={() => void applyEstimate('full', 'plné')}
                >
                  Plné<br />~{formatQuantity(fullEstimate, unit)}
                </button>
                <button
                  type="button"
                  className="button-secondary min-w-0 px-2 text-xs"
                  disabled={submitting}
                  onClick={() => void applyEstimate('half', 'půlka')}
                >
                  Půlka<br />~{formatQuantity(halfEstimate, unit)}
                </button>
                <button
                  type="button"
                  className="button-secondary min-w-0 px-2 text-xs"
                  disabled={submitting}
                  onClick={() => void applyEstimate('low', 'dochází')}
                >
                  Dochází<br />~{formatQuantity(lowEstimate, unit)}
                </button>
              </div>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor={quantityId} className="field-label">
                  Přesné množství
                </label>
                <div className="relative">
                  <input
                    id={quantityId}
                    ref={quantityRef}
                    className="input-field pr-14"
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                    {unit === 'pcs' ? 'ks' : unit}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor={reasonId} className="field-label">
                  Proč stav opravuješ?
                </label>
                <textarea
                  id={reasonId}
                  className="input-field min-h-24 resize-y"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  placeholder="např. převáženo, přepočítáno doma"
                  required
                />
                <p className="mt-1.5 text-xs text-text-muted">{reason.length}/500</p>
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
                <button type="submit" disabled={submitting || !quantity || !reason.trim()} className="button-primary flex-1">
                  <RefreshCw size={17} aria-hidden="true" />
                  {submitting ? 'Ukládám…' : quantityPrecision === 'estimated' ? 'Potvrdit přesně' : 'Srovnat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
