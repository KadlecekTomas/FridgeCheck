'use client'

import { FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import {
  formatQuantity,
  hasAtMostThreeDecimals,
  packageCountForTotal,
  totalForPackages,
} from '@/domain/inventory/quantity'

export function ExpectedConsumptionEditor({
  targetId,
  productName,
  expectedDailyConsumption,
  unit,
  packageQuantity = null,
  packageUnit = null,
  onSaved,
}: {
  targetId: string
  productName: string
  expectedDailyConsumption: number
  unit: string
  packageQuantity?: number | null
  packageUnit?: string | null
  onSaved: () => void | Promise<void>
}) {
  const usesPackages = Boolean(
    packageQuantity && packageQuantity > 0 && packageUnit === unit
  )
  const displayValue = useMemo(() => {
    if (!usesPackages || !packageQuantity) return expectedDailyConsumption
    return packageCountForTotal(expectedDailyConsumption, packageQuantity) ?? 0
  }, [expectedDailyConsumption, packageQuantity, usesPackages])
  const [value, setValue] = useState(String(displayValue))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const enteredValue = Number(value)

    if (
      !Number.isFinite(enteredValue) ||
      enteredValue < 0 ||
      !hasAtMostThreeDecimals(enteredValue)
    ) {
      setError('Zadej nezáporné číslo s nejvýše třemi desetinnými místy.')
      return
    }

    const storedValue = usesPackages && packageQuantity
      ? enteredValue === 0
        ? 0
        : totalForPackages(enteredValue, packageQuantity)
      : enteredValue

    if (storedValue === null) {
      setError('Denní spotřebu se nepodařilo přepočítat.')
      return
    }

    if (storedValue === expectedDailyConsumption) {
      setError(null)
      return
    }

    setSaving(true)
    setError(null)
    const { error: updateError } = await supabaseV2Browser()
      .from('stock_targets')
      .update({ expected_daily_consumption: storedValue })
      .eq('id', targetId)

    if (updateError) {
      setError('Denní spotřebu se nepodařilo uložit.')
      setSaving(false)
      return
    }

    await onSaved()
    toast.success(`${productName}: plán spotřeby uložen.`)
    setSaving(false)
  }

  const suffix = usesPackages ? 'balení / den' : `${unit === 'pcs' ? 'ks' : unit} / den`

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-canvas/70 p-3"
      aria-label={`Denní spotřeba ${productName}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text">{productName}</span>
          <span className="mt-0.5 block text-xs leading-5 text-text-muted">
            Kolik běžně spotřebuješ za den
          </span>
          <div className="relative mt-2">
            <input
              className="input-field pr-28"
              type="number"
              min="0"
              step="0.001"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-label={`Denní spotřeba ${productName}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              {suffix}
            </span>
          </div>
        </label>
        <button
          type="submit"
          className="button-secondary shrink-0"
          disabled={saving || value === String(displayValue)}
        >
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
      </div>
      {usesPackages && packageQuantity && packageUnit ? (
        <p className="mt-2 text-xs text-text-muted">
          1 balení = {formatQuantity(packageQuantity, packageUnit)}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-danger" role="alert">{error}</p> : null}
    </form>
  )
}
