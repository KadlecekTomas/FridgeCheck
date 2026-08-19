'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { ArrowLeft, Pencil, Plus, Trash2, Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { useHousehold } from '@/contexts/HouseholdContext'
import { useDashboardV2 } from '@/lib/hooks/useDashboardV2'
import { supabaseV2Browser } from '@/lib/auth/v2-client'
import {
  storageDeletionBlockReason,
  storageTypeLabel,
  type StorageType,
} from '@/domain/inventory/storage'

const STORAGE_TYPES: StorageType[] = ['fridge', 'freezer', 'pantry', 'cabinet', 'other']

export default function StorageManagementPage() {
  const { activeHousehold, activeHouseholdId, loading: householdLoading } = useHousehold()
  const dashboard = useDashboardV2(activeHouseholdId)
  const [name, setName] = useState('')
  const [type, setType] = useState<StorageType>('pantry')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createStorage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeHousehold) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Napiš název místa.')
      return
    }

    setCreating(true)
    setError(null)
    const { error: insertError } = await supabaseV2Browser().from('storage_units').insert({
      household_id: activeHousehold.id,
      name: trimmed,
      type,
    })

    if (insertError) {
      setError('Místo se nepodařilo přidat.')
      setCreating(false)
      return
    }

    setName('')
    setType('pantry')
    await dashboard.refresh()
    toast.success(`Přidáno místo ${trimmed}`)
    setCreating(false)
  }

  const renameStorage = async (storageId: string) => {
    if (!activeHousehold) return

    const trimmed = editingName.trim()
    if (!trimmed) {
      setError('Název místa nesmí být prázdný.')
      return
    }

    setSavingId(storageId)
    setError(null)
    const { error: updateError } = await supabaseV2Browser()
      .from('storage_units')
      .update({ name: trimmed })
      .eq('id', storageId)
      .eq('household_id', activeHousehold.id)

    if (updateError) {
      setError('Místo se nepodařilo přejmenovat.')
      setSavingId(null)
      return
    }

    await dashboard.refresh()
    setEditingId(null)
    setEditingName('')
    setSavingId(null)
    toast.success('Název místa je uložený.')
  }

  const deleteStorage = async (storageId: string, storageName: string) => {
    if (!activeHousehold) return

    const referencedBatchCount = dashboard.batches.filter(
      (batch) => batch.storage_unit_id === storageId
    ).length
    const blockReason = storageDeletionBlockReason({
      totalStorageUnits: dashboard.storageUnits.length,
      referencedBatchCount,
    })

    if (blockReason) {
      setError(blockReason)
      return
    }

    setDeletingId(storageId)
    setError(null)
    const { error: deleteError } = await supabaseV2Browser()
      .from('storage_units')
      .delete()
      .eq('id', storageId)
      .eq('household_id', activeHousehold.id)

    if (deleteError) {
      setError('Místo se nepodařilo smazat. Pokud už bylo použité, raději ho přejmenuj.')
      setDeletingId(null)
      return
    }

    await dashboard.refresh()
    setDeletingId(null)
    toast.success(`Smazáno místo ${storageName}`)
  }

  if (householdLoading || dashboard.loading) return <StorageSkeleton />

  if (!activeHousehold) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold text-text">Nejdřív založ domácnost</h1>
        <p className="mt-2 text-sm text-text-muted">Pak můžeš přidat lednici, mrazák, spíž a další místa.</p>
        <Link href="/dashboard" className="button-primary mt-5">Zpět domů</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/more"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Zpět na Více
        </Link>
        <p className="mt-3 text-sm font-medium text-primary">{activeHousehold.name}</p>
        <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] text-text">Úložná místa</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
          Lednice, mrazák, spíž a další místa, kde máš doma jídlo.
        </p>
      </div>

      {dashboard.error || error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger" role="alert">
          {error ?? dashboard.error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Plus size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-text">Přidat místo</h2>
            <p className="text-sm text-text-muted">Třeba „Spíž“ nebo „Mrazák sklep“.</p>
          </div>
        </div>

        <form onSubmit={createStorage} className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label>
            <span className="field-label">Název</span>
            <input className="input-field" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="např. Spíž" required />
          </label>
          <label>
            <span className="field-label">Typ</span>
            <select className="input-field" value={type} onChange={(event) => setType(event.target.value as StorageType)}>
              {STORAGE_TYPES.map((storageType) => (
                <option key={storageType} value={storageType}>{storageTypeLabel(storageType)}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="button-primary" disabled={creating || !name.trim()}>
            <Plus size={17} aria-hidden="true" />
            {creating ? 'Přidávám…' : 'Přidat'}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em] text-text">Aktuální místa</h2>
          <p className="mt-1 text-sm text-text-muted">Použité místo můžeš přejmenovat, ale jeho historii nemažeme.</p>
        </div>

        {dashboard.storageUnits.map((storage) => {
          const referencedBatchCount = dashboard.batches.filter(
            (batch) => batch.storage_unit_id === storage.id
          ).length
          const deleteBlockReason = storageDeletionBlockReason({
            totalStorageUnits: dashboard.storageUnits.length,
            referencedBatchCount,
          })
          const editing = editingId === storage.id

          return (
            <article key={storage.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Warehouse size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">Nový název {storage.name}</span>
                        <input className="input-field" value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={120} autoFocus />
                      </label>
                      <button type="button" className="button-primary" disabled={savingId === storage.id || !editingName.trim()} onClick={() => void renameStorage(storage.id)}>
                        {savingId === storage.id ? 'Ukládám…' : 'Uložit'}
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={savingId === storage.id}
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                      >
                        Zrušit
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-bold text-text">{storage.name}</h3>
                        <span className="text-sm text-text-muted">{storageTypeLabel(storage.type)}</span>
                      </div>
                      <p className="mt-1 text-sm text-text-muted">
                        {referencedBatchCount === 0 ? 'Zatím nepoužité' : 'Místo už je v historii zásob'}
                      </p>
                    </>
                  )}
                </div>

                {!editing ? (
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => {
                        setEditingId(storage.id)
                        setEditingName(storage.name)
                        setError(null)
                      }}
                      aria-label={`Přejmenovat ${storage.name}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Přejmenovat
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-45"
                      onClick={() => void deleteStorage(storage.id, storage.name)}
                      disabled={Boolean(deleteBlockReason) || deletingId === storage.id}
                      title={deleteBlockReason ?? undefined}
                      aria-label={`Smazat ${storage.name}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {deletingId === storage.id ? 'Mažu…' : 'Smazat'}
                    </button>
                  </div>
                ) : null}
              </div>
              {deleteBlockReason ? <p className="mt-3 text-xs leading-5 text-text-muted">{deleteBlockReason}</p> : null}
            </article>
          )
        })}
      </section>
    </div>
  )
}

function StorageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-3" aria-busy="true">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  )
}
