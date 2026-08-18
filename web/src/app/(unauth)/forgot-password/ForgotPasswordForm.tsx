'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { ArrowLeft, Mail, Refrigerator } from 'lucide-react'
import { supabaseV2Browser } from '@/lib/auth/v2-client'

export function ForgotPasswordForm({ invalidLink = false }: { invalidLink?: boolean }) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail) return

    setSubmitting(true)
    setError(null)

    const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`
    const { error: resetError } = await supabaseV2Browser().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    })

    if (resetError) {
      setError('Odkaz se teď nepodařilo odeslat. Zkus to prosím za chvíli znovu.')
      setSubmitting(false)
      return
    }

    setSent(true)
    setSubmitting(false)
  }

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Zpět na přihlášení
          </Link>

          <span className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <Refrigerator size={20} aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-primary">HlídačJídla</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-text">Obnovit heslo</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Zadej e-mail k účtu. Pokud účet existuje, pošleme na něj bezpečný odkaz pro nastavení nového hesla.
          </p>

          {invalidLink ? (
            <div className="mt-5 rounded-xl bg-warning/10 px-4 py-3 text-sm leading-5 text-text" role="alert">
              Odkaz pro obnovu je neplatný nebo už vypršel. Pošli si nový.
            </div>
          ) : null}

          {sent ? (
            <div className="mt-6 rounded-2xl bg-primary-soft p-5" role="status">
              <div className="flex gap-3">
                <Mail size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-text">Zkontroluj e-mail</p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    Pokud k adrese účet existuje, dorazí odkaz pro změnu hesla. Kvůli bezpečnosti stav účtu neprozrazujeme.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="field-label">E-mail</span>
                <input
                  className="input-field"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ty@email.cz"
                  required
                  autoFocus
                />
              </label>

              {error ? (
                <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="button-primary w-full" disabled={submitting}>
                {submitting ? 'Odesílám…' : 'Poslat odkaz pro obnovu'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
