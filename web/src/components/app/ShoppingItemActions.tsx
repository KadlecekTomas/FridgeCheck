'use client'

import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Pencil, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import type { Tables } from '@/types/supabase-v2'

type ShoppingItem = Tables<'shopping_list_items'>

function hasAtMostThreeDecimals(value: number) {
  return Math.abs(Math.round(value * 1000) / 1000 - value) <= Number.EPSILON * 16
}

export function ShoppingItemActions({
  item,
  onChanged,
}: {
  item: ShoppingItem
  onChanged: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const nameId = useId()
  const quantityId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const quantityRef = useRef<HTMLInputElement>(null)

  const busy = submitting || deleting
  const isDerived = item.source === 'derived'

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      if (isDerived) quantityRef.current?.focus()
      else nameRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, isDerived])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return
      setOpen(false)
      setError(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy])

  const startEditing = () => {
    setName(item.name)
    setQuantity(item.quantity === null ? '' : String(item.quantity))
    setError(null)
    setOpen(true)
  }

  const close = () => {
    if (busy) return
    setOpen(false)
    setError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedName = isDerived ? item.name : name.trim()

    if (!normalizedName) {
      setError('Název položky nesmí být prázdný.')
      return
    }
    if (normalizedName.length > 200) {
      setError('Název může mít nejvýše 200 znaků.')
      return
    }

    let quantityValue: number | null = null
    if (item.quantity !== null) {
      quantityValue = Number(quantity)
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        setError('Množství musí být větší než nula.')
        return
      }
      if (!hasAtMostThreeDecimals(quantityValue)) {
        setError('Množství může mít nejvýše tři desetinná místa.')
        return
      }
    }

    setSubmitting(true)
    setError(null)

    const { error: updateError } = await supabaseV2Browser()
      .from('shopping_list_items')
      .update({
        ...(isDerived ? {} : { name: normalizedName }),
        ...(item.quantity === null ? {} : { quantity: quantityValue }),
      })
      .eq('id', item.id)

    if (updateError) {
      setError('Položku se nepodařilo uložit.')
      setSubmitting(false)
      return
    }

    await onChanged()
    toast.success('Nákupní položka je upravená.')
    setSubmitting(false)
    setOpen(false)
  }

  const deleteItem = async () => {
    if (busy) return
    setDeleting(true)

    const { error: deleteError } = await supabaseV2Browser()
      .from('shopping_list_items')
      .delete()
      .eq('id', item.id)

    if (deleteError) {
      toast.error('Položku se nepodařilo smazat.')
      setDeleting(false)
      return
    }

    await onChanged()
    toast.success(`${item.name} odstraněno z nákupu.`)
    setDeleting(false)
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={startEditing}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Upravit ${item.name}`}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void deleteItem()}
          disabled={deleting}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted hover:bg-danger/8 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-50"
          aria-label={`Smazat ${item.name}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

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
                <p className="text-sm font-semibold text-primary">
                  {isDerived ? 'Doporučení upravené tebou' : 'Ruční položka'}
                </p>
                <h2 id={titleId} className="mt-1 text-xl font-bold tracking-[-0.02em] text-text">
                  Upravit položku
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Zavřít"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p id={descriptionId} className="mt-3 text-sm leading-6 text-text-muted">
              {isDerived
                ? 'Uprav jen množství k nákupu. Produkt, zásoba ani nastavený cíl se nezmění.'
                : 'Uprav položku tak, aby seznam odpovídal tomu, co chceš skutečně koupit.'}
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {isDerived ? (
                <div>
                  <p className="field-label">Produkt</p>
                  <p className="rounded-xl border border-border bg-surface-muted px-3 py-2.5 font-medium text-text">
                    {item.name}
                  </p>
                </div>
              ) : (
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
              )}

              {item.quantity !== null && item.unit ? (
                <div>
                  <label htmlFor={quantityId} className="field-label">Množství k nákupu</label>
                  <div className="relative">
                    <input
                      id={quantityId}
                      ref={quantityRef}
                      className="input-field pr-14"
                      type="number"
                      min="0.001"
                      step="0.001"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                      {item.unit === 'pcs' ? 'ks' : item.unit}
                    </span>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-danger/8 px-3 py-2.5 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <button type="button" onClick={close} disabled={busy} className="button-secondary flex-1">
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!isDerived && !name.trim()) || (item.quantity !== null && !quantity)}
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
