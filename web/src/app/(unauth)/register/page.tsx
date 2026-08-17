'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Refrigerator } from 'lucide-react'
import { supabaseV2Browser } from '@/lib/auth/v2-client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabaseV2Browser().auth.getSession()

      if (!mounted) return
      if (session) {
        router.replace('/dashboard')
        return
      }
      setCheckingSession(false)
    }

    void checkSession()
    return () => {
      mounted = false
    }
  }, [router])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků.')
      return
    }
    if (password !== confirmPassword) {
      setError('Hesla se neshodují.')
      return
    }

    setSubmitting(true)
    const normalizedEmail = email.trim()
    const { data, error: signUpError } = await supabaseV2Browser().auth.signUp({
      email: normalizedEmail,
      password,
    })

    if (signUpError) {
      setError('Účet se nepodařilo vytvořit. E-mail může být už použitý.')
      setSubmitting(false)
      return
    }

    if (data.session) {
      router.replace('/dashboard')
      router.refresh()
      return
    }

    setConfirmationEmail(normalizedEmail)
    setSubmitting(false)
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="h-10 w-40 animate-pulse rounded-2xl bg-surface-muted" aria-label="Ověřuji přihlášení" />
      </main>
    )
  }

  if (confirmationEmail) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8">
        <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <CheckCircle2 size={23} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-[-0.02em] text-text">Zkontroluj e-mail</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Pokud projekt vyžaduje potvrzení adresy, poslali jsme odkaz na{' '}
            <strong className="font-semibold text-text">{confirmationEmail}</strong>.
          </p>
          <Link href="/login" className="button-primary mt-6 w-full">
            Přejít na přihlášení
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100dvh-6rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden max-w-xl lg:block">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <Refrigerator size={23} aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-semibold text-primary">HlídačJídla</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight tracking-[-0.04em] text-text">
            Začni tím, co máš opravdu doma.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-text-muted">
            Po registraci založíš domácnost, dostaneš výchozí Lednici a můžeš hned přidat první balení.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="lg:hidden">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <Refrigerator size={19} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-bold text-text">HlídačJídla</p>
          </div>

          <h2 className="mt-6 text-[28px] font-bold tracking-[-0.03em] text-text lg:mt-0">
            Vytvořit účet
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Stačí e-mail a heslo. Další údaje po tobě teď nepotřebujeme.
          </p>

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

            <label className="block">
              <span className="field-label">Heslo</span>
              <div className="relative">
                <input
                  className="input-field pr-12"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="mt-1.5 block text-xs text-text-muted">Alespoň 8 znaků.</span>
            </label>

            <label className="block">
              <span className="field-label">Heslo znovu</span>
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            {error ? (
              <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            ) : null}

            <button type="submit" className="button-primary w-full" disabled={submitting}>
              {submitting ? 'Vytvářím účet…' : 'Vytvořit účet'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Už účet máš?{' '}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Přihlásit se
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
