'use client'

import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
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

export function CorrectBatchAction({
  batchId,
  productName,
  quantity: recordedQuantity,
  unit,
  packageQuantity = null,
  packageUnit = null,
  onCorrected,
  compact = false,
}: {
  batchId: string
  productName: string
  quantity: number
  unit: string
  packageQuantity?: number | null
  packageUnit?: string | null
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
  const usesPackages = Boolean(packageQuantity && packageQuantity > 0 && packageUnit === unit)
  const recordedPackages = usesPackages && packageQuantity
    ? packageCountForTotal(recordedQuantity, packageQuantity)
    : null

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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const enteredValue = Number(quantity)
    const normalizedReason = reason.trim()
    if (!Number.isFinite(enteredValue) || enteredValue < 0) {
      setError(usesPackages ? 'Počet balení musí být nula nebo více.' : 'Skutečné množství musí být nula nebo více.')
      return
    }
    if (!hasAtMostThreeDecimals(enteredValue)) {
      setError('Hodnota může mít nejvýše tři desetinná místa.')
      return
    }

    const storedValue = usesPackages && packageQuantity
      ? totalForPackages(enteredValue, packageQuantity) ?? (enteredValue === 0 ? 0 : null)
      : enteredValue

    if (storedValue === null) {
      setError('Množství se nepodařilo spočítat.')
      return
    }
    if (storedValue === recordedQuantity) {
      setError('Zadej skutečný stav odlišný od hodnoty v aplikaci.')
      return
    }
    if (normalizedReason.length > 500) {
      setError('Poznámka může mít nejvýše 500 znaků.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: delta, error: correctionError } = await supabaseV2Browser().rpc('correct_inventory_batch', {
      p_batch_id: batchId,
      p_new_quantity: storedValue,
      p_reason: normalizedReason || undefined,
    })

    if (correctionError) {
      setError(
        correctionError.message.includes('Correction must change the quantity')
          ? 'Zásoba se mezitím změnila. Obnov přehled a zkus to znovu.'
          : 'Stav se nepodařilo uložit. Zásoba zůstala beze změny.'
      )
      setSubmitting(false)
      return
    }

    await onCorrected()
    const signedDelta = typeof delta === 'number' ? delta : storedValue - recordedQuantity
    const packageDelta = usesPackages && packageQuantity ? packageCountForTotal(Math.abs(signedDelta), packageQuantity) : null
    toast.success(
      usesPackages && packageDelta !== null
        ? `Stav srovnán · ${productName} ${signedDelta > 0 ? '+' : '−'}${formatPackageCount(packageDelta)}`
        : `Stav srovnán · ${productName} ${signedDelta > 0 ? '+' : ''}${formatQuantity(signedDelta, unit)}`
    )
    setSubmitting(false)
    setOpen(false)
    setQuantity('')
    setReason('')
  }

  return (
    <>
      <button
        type="button"
        className={compact
          ? 'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          : 'button-secondary'}
        onClick={() => {
          setQuantity(String(usesPackages && recordedPackages !== null ? recordedPackages : recordedQuantity))
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
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-text/30 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">{productName}</p>
                <h2 id={titleId} className="mt-1 text-xl font-bold tracking-[-0.02em] text-text">Srovnat skutečný stav</h2>
              </div>
              <button type="button" onClick={close} disabled={submitting} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Zavřít">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p id={descriptionId} className="mt-3 text-sm leading-6 text-text-muted">
              Teď evidujeme {formatStockQuantity(recordedQuantity, unit, packageQuantity, packageUnit)}. Napiš, kolik opravdu máš doma.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor={quantityId} className="field-label">{usesPackages ? 'Skutečný počet balení' : 'Skutečné množství'}</label>
                <div className="relative">
                  <input id={quantityId} ref={quantityRef} className="input-field pr-20" type="number" min="0" step="0.001" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{usesPackages ? 'balení' : unit === 'pcs' ? 'ks' : unit}</span>
                </div>
                {usesPackages && packageQuantity && packageUnit ? <p className="mt-1.5 text-xs text-text-muted">1 balení = {formatQuantity(packageQuantity, packageUnit)}</p> : null}
              </div>

              <div>
                <label htmlFor={reasonId} className="field-label">Poznámka <span className="font-normal text-text-muted">volitelně</span></label>
                <textarea id={reasonId} className="input-field min-h-24 resize-y" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="např. přepočítáno doma" />
                <p className="mt-1.5 text-xs text-text-muted">{reason.length}/500</p>
              </div>

              {error ? <p className="rounded-xl bg-danger/8 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p> : null}

              <div className="flex gap-2">
                <button type="button" onClick={close} disabled={submitting} className="button-secondary flex-1">Zrušit</button>
                <button type="submit" disabled={submitting || quantity === ''} className="button-primary flex-1">
                  <RefreshCw size={17} aria-hidden="true" />
                  {submitting ? 'Ukládám…' : 'Srovnat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
