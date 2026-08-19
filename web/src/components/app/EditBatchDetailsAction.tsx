'use client'

import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import type { Tables } from '@/types/supabase-v2'

type ExpiryType = Tables<'inventory_batches'>['expiry_type']

export function EditBatchDetailsAction({
  batch,
  productName,
  storageUnits,
  onUpdated,
}: {
  batch: Tables<'inventory_batches'>
  productName: string
  storageUnits: Tables<'storage_units'>[]
  onUpdated: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [storageId, setStorageId] = useState('')
  const [expiryType, setExpiryType] = useState<ExpiryType>('unknown')
  const [expiryDate, setExpiryDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const storageIdField = useId()
  const expiryTypeId = useId()
  const expiryDateId = useId()
  const reasonId = useId()
  const storageRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => storageRef.current?.focus())
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
    setStorageId(batch.storage_unit_id)
    setExpiryType(batch.expiry_type)
    setExpiryDate(batch.expiry_date ?? '')
    setReason('')
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
    const normalizedReason = reason.trim()
    const normalizedDate = expiryType === 'unknown' ? '' : expiryDate

    if (!storageId) {
      setError('Vyber úložné místo.')
      return
    }
    if (expiryType !== 'unknown' && !normalizedDate) {
      setError('Pro zvolený typ expirace je potřeba datum.')
      return
    }
    if (!normalizedReason) {
      setError('Napiš stručně, proč údaje opravuješ.')
      return
    }
    if (normalizedReason.length > 500) {
      setError('Důvod může mít nejvýše 500 znaků.')
      return
    }

    const storageChanged = storageId !== batch.storage_unit_id
    const expiryChanged = expiryType !== batch.expiry_type || normalizedDate !== (batch.expiry_date ?? '')
    if (!storageChanged && !expiryChanged) {
      setError('Úložiště ani expirace se nezměnily.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: updateError } = await supabaseV2Browser().rpc('update_inventory_batch_details', {
      p_batch_id: batch.id,
      p_storage_unit_id: storageId,
      p_expiry_type: expiryType,
      p_expiry_date: normalizedDate || undefined,
      p_reason: normalizedReason,
    })

    if (updateError) {
      setError('Údaje balení se nepodařilo uložit. Původní stav zůstal beze změny.')
      setSubmitting(false)
      return
    }

    await onUpdated()
    toast.success(`${productName} · balení upraveno.`)
    setSubmitting(false)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={startEditing}
        aria-label={`Upravit údaje balení ${productName}`}
      >
        <Pencil size={14} aria-hidden="true" />
        Upravit
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
                  Upravit balení
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
              Oprav umístění nebo datum, pokud evidence neodpovídá skutečnosti. Změna se zapíše do historie. Množství upravuj přes „Srovnat stav“.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label htmlFor={storageIdField} className="field-label">Kam to patří</label>
                <select
                  id={storageIdField}
                  ref={storageRef}
                  className="input-field"
                  value={storageId}
                  onChange={(event) => setStorageId(event.target.value)}
                  required
                >
                  {storageUnits.map((storage) => (
                    <option key={storage.id} value={storage.id}>{storage.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={expiryTypeId} className="field-label">Typ data</label>
                <select
                  id={expiryTypeId}
                  className="input-field"
                  value={expiryType}
                  onChange={(event) => {
                    const next = event.target.value as ExpiryType
                    setExpiryType(next)
                    if (next === 'unknown') setExpiryDate('')
                  }}
                >
                  <option value="unknown">Bez data</option>
                  <option value="use_by">Spotřebujte do</option>
                  <option value="best_before">Minimální trvanlivost</option>
                </select>
              </div>

              {expiryType !== 'unknown' ? (
                <div>
                  <label htmlFor={expiryDateId} className="field-label">Datum</label>
                  <input
                    id={expiryDateId}
                    className="input-field"
                    type="date"
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                    required
                  />
                </div>
              ) : null}

              <div>
                <label htmlFor={reasonId} className="field-label">Proč údaje měníš?</label>
                <textarea
                  id={reasonId}
                  className="input-field min-h-24 resize-y"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  placeholder="např. špatně opsané datum, přesunuto do mrazáku"
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
                <button
                  type="submit"
                  disabled={submitting || !storageId || !reason.trim() || (expiryType !== 'unknown' && !expiryDate)}
                  className="button-primary flex-1"
                >
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
