import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageOpen,
  Refrigerator,
  ShoppingBasket,
} from 'lucide-react'
import { getCurrentUserV2 } from '@/lib/auth/v2-server'

export default async function LandingPage() {
  const user = await getCurrentUserV2()
  const primaryHref = user ? '/dashboard' : '/register'
  const primaryLabel = user ? 'Otevřít můj přehled' : 'Začít zdarma'

  return (
    <main className="min-h-dvh bg-canvas text-text">
      <header className="border-b border-border bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Refrigerator size={19} aria-hidden="true" />
            </span>
            <span className="font-bold tracking-[-0.01em]">HlídačJídla</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Navigace webu">
            {user ? null : (
              <Link href="/login" className="button-secondary">
                Přihlásit se
              </Link>
            )}
            <Link href={primaryHref} className="button-primary">
              <span className="hidden sm:inline">{primaryLabel}</span>
              <span className="sm:hidden">{user ? 'Otevřít' : 'Začít'}</span>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1fr_0.9fr] lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Osobní systém pro jídlo doma</p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.06] tracking-[-0.045em] text-text sm:text-5xl lg:text-6xl">
            Co mám doma. Co sníst. Co koupit.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-text-muted sm:text-lg">
            HlídačJídla drží zásoby po skutečných baleních, hlídá jejich data a z cílové zásoby ukáže, co dochází. Bez tabulek a bez přepínání mezi lednicemi jen proto, abys zjistil, co je potřeba dnes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={primaryHref} className="button-primary px-5">
              {primaryLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a href="#jak-to-funguje" className="button-secondary px-5">
              Jak to funguje
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" aria-hidden="true" />
              Ruční přidání funguje vždy
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" aria-hidden="true" />
              Data oddělená po domácnostech
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-primary-soft/60" aria-hidden="true" />
          <div className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Příklad přehledu</p>
                <p className="mt-1 font-bold text-text">Dnešek doma</p>
              </div>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">Moje domácnost</span>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <Clock3 size={18} className="text-primary" aria-hidden="true" />
                  <h2 className="font-bold text-text">Sněz nejdřív</h2>
                </div>
                <div className="mt-3 rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">Vejce</p>
                      <p className="mt-1 text-sm text-text-muted">6 ks · Lednice</p>
                    </div>
                    <span className="text-sm font-semibold text-warning">zítra</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Dochází</p>
                  <p className="mt-2 font-semibold">Ovesné vločky</p>
                  <p className="mt-1 text-sm text-text-muted">Doma 200 g · cíl 1 kg</p>
                  <p className="mt-2 text-sm font-semibold text-primary">Koupit 800 g</p>
                </div>
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Nákup</p>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.03em]">3</p>
                  <p className="mt-1 text-sm text-text-muted">položky k nákupu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3 md:px-6 md:py-18">
          <Feature
            icon={<Clock3 size={21} aria-hidden="true" />}
            title="Sněz nejdřív"
            description="Datum patří konkrétnímu balení. Dvě stejné potraviny tak mohou mít dvě různé expirace a systém je nezamění."
          />
          <Feature
            icon={<PackageOpen size={21} aria-hidden="true" />}
            title="Vím, co je doma"
            description="Produkt není balení. Vidíš skutečné množství napříč lednicí, mrazákem a dalšími místy v jedné domácnosti."
          />
          <Feature
            icon={<ShoppingBasket size={21} aria-hidden="true" />}
            title="Koupím jen chybějící"
            description="Nastavíš minimum a cílovou zásobu. HlídačJídla dopočítá rozdíl, ale finální nákupní seznam zůstává tvoje rozhodnutí."
          />
        </div>
      </section>

      <section id="jak-to-funguje" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Jednoduchý denní loop</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-text">Méně správy, víc odpovědí.</h2>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <Step number="1" title="Přidej jídlo" description="Název, množství, místo a případně datum. Ruční cesta je vždy dostupná." />
          <Step number="2" title="Spotřebovávej podle reality" description="Dashboard vytáhne nejbližší data a zásoby pod minimem bez nutnosti vybírat jednu lednici." />
          <Step number="3" title="Nakup rozdíl" description="Doporučení můžeš jedním rozhodnutím převést na nákupní položku a ručně doplnit cokoli dalšího." />
        </div>
      </section>

      <section className="mx-4 mb-16 rounded-[1.5rem] bg-primary px-5 py-10 text-white md:mx-auto md:max-w-7xl md:px-10 md:py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-[-0.02em]">Začni vlastní domácností.</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              V dev fázi stavíme nejdřív rychlý a spolehlivý základ. Žádné falešné premium plány ani funkce, které ještě nemají důkaz.
            </p>
          </div>
          <Link href={primaryHref} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {primaryLabel}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-sm text-text-muted md:px-6">
        HlídačJídla · FridgeCheck
      </footer>
    </main>
  )
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <article>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</span>
      <h3 className="mt-4 text-lg font-bold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
    </article>
  )
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">{number}</span>
      <h3 className="mt-4 font-bold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
    </article>
  )
}
