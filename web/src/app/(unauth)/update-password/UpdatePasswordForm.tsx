'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { supabaseV2Browser } from '@/lib/auth/v2-client'

export function UpdatePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Nové heslo musí mít alespoň 8 znaků.')
      return
    }
    if (password !== confirmPassword) {
      setError('Hesla se neshodují.')
      return
    }

    setSubmitting(true)
    const supabase = supabaseV2Browser()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Heslo se nepodařilo změnit. Pošli si nový odkaz pro obnovu a zkus to znovu.')
      setSubmitting(false)
      return
    }

    await supabase.auth.signOut()
    setCompleted(true)
    setSubmitting(false)
  }

  if (completed) {
    return (
      <main className="min-h-dvh bg-canvas px-4 py-8 sm:py-12">
        <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md items-center">
          <section className="w-full rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <CheckCircle2 size={24} aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-[28px] font-bold tracking-[-0.03em] text-text">Heslo je změněné</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Recovery session jsme ukončili. Přihlas se znovu svým novým heslem.
            </p>
            <Link href="/login" className="button-primary mt-6 w-full">
              Přejít na přihlášení
            </Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-primary">HlídačJídla</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-text">Nastavit nové heslo</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Odkaz pro obnovu tě bezpečně přihlásil jen pro tuto změnu. Zvol nové heslo k účtu.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="recovery-password" className="field-label">Nové heslo</label>
              <div className="relative">
                <input
                  id="recovery-password"
                  className="input-field pr-12"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  autoFocus
                  aria-describedby="recovery-password-help"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              <p id="recovery-password-help" className="mt-1.5 text-xs text-text-muted">Alespoň 8 znaků.</p>
            </div>

            <label className="block">
              <span className="field-label">Nové heslo znovu</span>
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>

            {error ? (
              <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            ) : null}

            <button type="submit" className="button-primary w-full" disabled={submitting}>
              {submitting ? 'Ukládám…' : 'Uložit nové heslo'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
