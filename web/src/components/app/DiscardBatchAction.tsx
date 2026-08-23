'use client'

import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Trash2, X } from 'lucide-react'
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

export function DiscardBatchAction({
  batchId,
  productName,
  quantity: availableQuantity,
  quantityIsEstimate = false,
  unit,
  packageQuantity = null,
  packageUnit = null,
  onDiscarded,
  compact = false,
}: {
  batchId: string
  productName: string
  quantity: number
  quantityIsEstimate?: boolean
  unit: string
  packageQuantity?: number | null
  packageUnit?: string | null
  onDiscarded: () => void | Promise<void>
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
  const availablePackages = usesPackages && packageQuantity
    ? packageCountForTotal(availableQuantity, packageQuantity)
    : null

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => quantityRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        setOpen(false)
        setQuantity('')
        setReason('')
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
    setReason('')
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
          ? `V této zásobě je jen ${formatPackageCount(availablePackages)}.`
          : `V této zásobě je jen ${formatQuantity(availableQuantity, unit, quantityIsEstimate)}.`
      )
      return
    }
    if (reason.trim().length > 500) {
      setError('Důvod může mít nejvýše 500 znaků.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: discardError } = await supabaseV2Browser().rpc('discard_inventory_batch', {
      p_batch_id: batchId,
      p_quantity: storedValue,
      p_reason: reason.trim() || undefined,
    })

    if (discardError) {
      setError(
        discardError.message.includes('Discard quantity exceeds batch quantity')
          ? 'Zásoba se mezitím změnila. Obnov přehled a zkus to znovu.'
          : 'Vyhození se nepodařilo uložit. Zásoba zůstala beze změny.'
      )
      setSubmitting(false)
      return
    }

    await onDiscarded()
    toast.success(
      `Vyřazeno ${usesPackages ? formatPackageCount(enteredValue) : formatQuantity(storedValue, unit, quantityIsEstimate)} · ${productName}`
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
          ? 'inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger'
          : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger/20 bg-surface px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger'}
        onClick={() => setOpen(true)}
        disabled={availableQuantity <= 0}
        aria-label={`Vyhodit ${productName}`}
      >
        <Trash2 size={compact ? 14 : 17} aria-hidden="true" />
        Vyhodit
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-text/30 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-danger">{productName}</p>
                <h2 id={titleId} className="mt-1 text-xl font-bold tracking-[-0.02em] text-text">{usesPackages ? 'Kolik balení vyhazuješ?' : 'Kolik vyhazuješ?'}</h2>
              </div>
              <button type="button" onClick={close} disabled={submitting} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Zavřít">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p id={descriptionId} className="mt-3 text-sm leading-6 text-text-muted">
              Odečteme jen tuhle zásobu a ostatní balení stejného jídla necháme beze změny.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor={quantityId} className="field-label">{usesPackages ? 'Počet balení k vyhození' : 'Množství k vyhození'}</label>
                <div className="relative">
                  <input id={quantityId} ref={quantityRef} className="input-field pr-20" type="number" min="0.001" max={usesPackages && availablePackages !== null ? availablePackages : availableQuantity} step="0.001" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{usesPackages ? 'balení' : unit === 'pcs' ? 'ks' : unit}</span>
                </div>
                {usesPackages && packageQuantity && packageUnit ? <p className="mt-1.5 text-xs text-text-muted">1 balení = {formatQuantity(packageQuantity, packageUnit)}</p> : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-danger/5 px-2 py-1.5 text-sm sm:px-3 sm:py-2.5">
                <span className="px-1 text-text-muted">V této zásobě</span>
                <button type="button" className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold text-danger underline-offset-4 hover:bg-white/60 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger" onClick={() => setQuantity(String(usesPackages && availablePackages !== null ? availablePackages : availableQuantity))}>
                  Všechno · {formatStockQuantity(availableQuantity, unit, packageQuantity, packageUnit, quantityIsEstimate)}
                </button>
              </div>

              <div>
                <label htmlFor={reasonId} className="field-label">Důvod <span className="font-normal text-text-muted">volitelně</span></label>
                <textarea id={reasonId} className="input-field min-h-24 resize-y" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="např. po expiraci, zkažené" />
                <p className="mt-1.5 text-xs text-text-muted">{reason.length}/500</p>
              </div>

              {error ? <p className="rounded-xl bg-danger/8 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p> : null}

              <div className="flex gap-2">
                <button type="button" onClick={close} disabled={submitting} className="button-secondary flex-1">Zrušit</button>
                <button type="submit" disabled={submitting || !quantity} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <Trash2 size={17} aria-hidden="true" />
                  {submitting ? 'Ukládám…' : 'Vyhodit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
