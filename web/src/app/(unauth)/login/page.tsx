'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Refrigerator } from 'lucide-react'
import { supabaseV2Browser } from '@/lib/auth/v2-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabaseV2Browser().auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError('Přihlášení se nepodařilo. Zkontroluj e-mail a heslo.')
      setSubmitting(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="h-10 w-40 animate-pulse rounded-2xl bg-surface-muted" aria-label="Ověřuji přihlášení" />
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
            Vědět, co sníst. Vědět, co koupit.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-text-muted">
            Zásoby, expirace a nákup v jednom klidném přehledu. Bez tabulek, které musíš celý večer spravovat.
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
            Přihlásit se
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Pokračuj do své domácnosti a dnešního přehledu.
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

            <div className="block">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="field-label mb-0">
                  Heslo
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Zapomenuté heslo?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  className="input-field pr-12"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            ) : null}

            <button type="submit" className="button-primary w-full" disabled={submitting}>
              {submitting ? 'Přihlašuji…' : 'Přihlásit se'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Ještě nemáš účet?{' '}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Vytvořit účet
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
