import Link from 'next/link'
import {
  ArrowRight,
  Barcode,
  Check,
  CheckCircle2,
  Clock3,
  PackageOpen,
  Refrigerator,
  ShoppingBasket,
  Sparkles,
  Users,
} from 'lucide-react'
import { InteractiveProductDemo } from '@/components/marketing/InteractiveProductDemo'
import {
  HouseholdPreview,
  PriorityPreview,
  ScannerPreview,
  ShoppingPreview,
} from '@/components/marketing/MarketingStoryPreviews'
import { getCurrentUserV2 } from '@/lib/auth/v2-server'

const benefits = [
  { icon: Barcode, label: 'Rychlé skenování' },
  { icon: Clock3, label: 'Méně plýtvání' },
  { icon: ShoppingBasket, label: 'Chytřejší nákup' },
  { icon: Users, label: 'Jedna domácnost' },
]

const capabilities = [
  'Čárový kód místo opisování',
  'Více expirací stejného produktu',
  'Cílová zásoba podle vaší domácnosti',
  'Nákupní seznam z toho, co opravdu chybí',
]

export default async function LandingPage() {
  const user = await getCurrentUserV2()
  const primaryHref = user ? '/dashboard' : '/register'
  const primaryLabel = user ? 'Otevřít můj přehled' : 'Vyzkoušet HlídačJídla'

  return (
    <main className="min-h-dvh overflow-hidden bg-canvas text-text">
      <header className="relative z-50 border-b border-border/80 bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="HlídačJídla – domů"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-primary text-white shadow-sm">
              <Refrigerator size={20} aria-hidden="true" />
            </span>
            <span className="text-[1.05rem] font-bold tracking-[-0.025em]">HlídačJídla</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-text-muted md:flex" aria-label="Hlavní navigace">
            <a className="transition-colors hover:text-text" href="#funkce">Funkce</a>
            <a className="transition-colors hover:text-text" href="#jak-to-funguje">Jak to funguje</a>
            <a className="transition-colors hover:text-text" href="#ukazka">Ukázka</a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? null : (
              <Link href="/login" className="hidden min-h-11 items-center justify-center px-3 text-sm font-semibold text-text-muted transition-colors hover:text-text sm:inline-flex">
                Přihlásit se
              </Link>
            )}
            <Link href={primaryHref} className="button-primary rounded-xl px-4">
              <span className="hidden sm:inline">{user ? 'Otevřít aplikaci' : 'Začít zdarma'}</span>
              <span className="sm:hidden">{user ? 'Otevřít' : 'Začít'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(circle at 8% 16%, rgba(227,239,232,.95), transparent 30%), radial-gradient(circle at 88% 25%, rgba(222,234,215,.8), transparent 27%), linear-gradient(180deg, #F8F9F5 0%, #F6F7F2 100%)',
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -left-28 top-40 h-72 w-72 rounded-full border border-primary/10 bg-primary-soft/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-primary-soft/55 blur-3xl" aria-hidden="true" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20 xl:grid-cols-[0.78fr_1.22fr] xl:gap-14 xl:pb-28 xl:pt-24">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur">
              <Sparkles size={14} aria-hidden="true" />
              Přehled domácnosti bez tabulek a chaosu
            </div>

            <h1 className="mt-6 text-[2.75rem] font-bold leading-[0.98] tracking-[-0.06em] text-text sm:text-6xl xl:text-[4.65rem]">
              Mějte doma pořádek v jídle.
              <span className="mt-2 block text-primary">Bez chaosu. Bez plýtvání.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
              Zásoby, expirace a nákup na jednom místě. Přidejte jídlo během chvilky, sledujte skutečné množství a hned víte, co sníst dřív a co dokoupit.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="button-primary min-h-12 rounded-xl px-5 text-[0.95rem] shadow-[0_12px_28px_rgba(23,77,58,0.18)]">
                {primaryLabel}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a href="#ukazka" className="button-secondary min-h-12 rounded-xl bg-white/80 px-5 text-[0.95rem] backdrop-blur">
                Prohlédnout produkt
              </a>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
              {benefits.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border/80 bg-white/70 px-3.5 text-xs font-semibold text-text shadow-sm backdrop-blur sm:text-sm">
                  <Icon size={16} className="text-primary" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <InteractiveProductDemo />
        </div>
      </section>

      <section className="border-y border-border/80 bg-white/80">
        <div className="mx-auto grid max-w-7xl gap-px px-4 py-2 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
          {capabilities.map((capability) => (
            <div key={capability} className="flex items-center gap-2.5 px-3 py-4 text-sm font-semibold text-text-muted">
              <CheckCircle2 size={17} className="shrink-0 text-primary" aria-hidden="true" />
              {capability}
            </div>
          ))}
        </div>
      </section>

      <section id="funkce" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold text-primary">Od nákupu po poslední balení</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-text sm:text-5xl">
            Jedna aplikace. Čtyři momenty, kdy konečně nemusíte přemýšlet, co je doma.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted sm:text-lg">
            HlídačJídla není další seznam na vyplňování. Každá část má zkrátit cestu k odpovědi, kterou potřebujete právě teď.
          </p>
        </div>

        <div id="ukazka" className="mt-16 space-y-10 md:mt-20 md:space-y-14">
          <StoryCard
            eyebrow="01 · Přidání"
            title="Naskenuj. Ulož. Hotovo."
            description="Čárový kód urychlí vyplnění produktu. Vy zadáte množství a podle potřeby rozdělíte stejný nákup do více expirací."
            points={['Počet balení bez ručního přepočítávání', 'Ruční zadání zůstává vždy po ruce', 'Každá expirace patří ke konkrétní zásobě']}
            visual={<ScannerPreview />}
          />

          <StoryCard
            reverse
            eyebrow="02 · Přehled"
            title="Nejdřív vidíte to, co potřebuje pozornost."
            description="Blížící se expirace a nízké zásoby nejsou schované v tabulce. Přehled je vytáhne dopředu a zbytek nechá v klidu."
            points={['Co sníst dřív', 'Co už dochází', 'Kolik je doma celkem']}
            visual={<PriorityPreview />}
          />

          <StoryCard
            eyebrow="03 · Nákup"
            title="Nakupujte rozdíl. Ne pocit."
            description="Nastavíte minimum a cílové množství. HlídačJídla spočítá, kolik chybí, a doporučení můžete převést do nákupního seznamu."
            points={['Doporučené množství podle cíle', 'Vlastní položky kdykoli navíc', 'Jeden přehled pro celý nákup']}
            visual={<ShoppingPreview />}
          />

          <StoryCard
            reverse
            eyebrow="04 · Domácnost"
            title="Jedno místo pro zásoby celé domácnosti."
            description="Lednice, mrazák i další místa jsou součástí jednoho pohledu. Nemusíte otevírat několik seznamů, abyste zjistili, co skutečně máte."
            points={['Zásoby napříč místy', 'Stejný produkt může mít více balení', 'Přehled zůstává srozumitelný i na mobilu']}
            visual={<HouseholdPreview />}
          />
        </div>
      </section>

      <section id="jak-to-funguje" className="relative border-y border-border bg-[#112E24] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 78% 25%, rgba(100,163,127,.25), transparent 33%)' }} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div className="max-w-xl">
              <p className="text-sm font-bold text-[#A7D6B8]">Jak to funguje</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Méně správy. Více jistoty před otevřením lednice.</h2>
              <p className="mt-5 text-base leading-7 text-white/68">Každý krok je krátký. Produkt přidáte, běžně spotřebováváte a aplikace drží přehled za vás.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DarkStep number="01" title="Přidejte" description="Naskenujte kód nebo produkt zadejte ručně." />
              <DarkStep number="02" title="Spotřebovávejte" description="Množství upravujete podle toho, co se doma opravdu děje." />
              <DarkStep number="03" title="Doplňte" description="Když zásoba klesne, hned vidíte, kolik dává smysl koupit." />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="max-w-xl">
            <p className="text-sm font-bold text-primary">Navržené pro realitu doma</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Ne další administrace. Nástroj, který musí být rychlejší než papír.</h2>
            <p className="mt-5 text-base leading-7 text-text-muted">HlídačJídla stavíme kolem jednoduchého pravidla: evidence jídla má šetřit čas a mentální energii, ne vytvářet další povinnost.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ValueCard icon={<Barcode size={20} aria-hidden="true" />} title="Rychlé zadávání" text="Čárový kód pomáhá, ale není podmínkou. Když chcete, vše zadáte ručně." />
            <ValueCard icon={<Clock3 size={20} aria-hidden="true" />} title="Expirace podle balení" text="Stejný produkt může mít různé termíny. Aplikace je neslévá do jednoho nepřesného data." />
            <ValueCard icon={<PackageOpen size={20} aria-hidden="true" />} title="Skutečné množství" text="Přehled pracuje s tím, kolik je opravdu doma, ne jen s názvem položky." />
            <ValueCard icon={<ShoppingBasket size={20} aria-hidden="true" />} title="Nákup podle potřeby" text="Minimum a cílová zásoba pomáhají rozhodnout, co doplnit a v jakém množství." />
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 md:px-6 md:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-white shadow-[0_24px_80px_rgba(23,77,58,0.2)] md:px-12 md:py-14">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
          <div className="pointer-events-none absolute right-32 top-8 h-24 w-24 rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-white/65">HlídačJídla</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">Otevřete lednici. A už předem víte, co v ní je.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">Začněte první domácností a přidejte první produkt. Bez složitého nastavování — první přehled vzniká hned s první zásobou.</p>
            </div>
            <Link href={primaryHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {primaryLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-center gap-2 font-semibold text-text">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white"><Refrigerator size={16} aria-hidden="true" /></span>
            HlídačJídla
          </div>
          <p>Co mám doma. Co sníst. Co koupit.</p>
        </div>
      </footer>
    </main>
  )
}

function StoryCard({
  eyebrow,
  title,
  description,
  points,
  visual,
  reverse = false,
}: {
  eyebrow: string
  title: string
  description: string
  points: string[]
  visual: React.ReactNode
  reverse?: boolean
}) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[0_18px_60px_rgba(23,35,29,0.07)]">
      <div className={`grid items-stretch lg:grid-cols-2 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">{eyebrow}</p>
          <h3 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-text sm:text-4xl">{title}</h3>
          <p className="mt-4 max-w-xl text-sm leading-6 text-text-muted sm:text-base sm:leading-7">{description}</p>
          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm font-semibold text-text">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-h-[350px] bg-[#F1F4EE] p-5 sm:p-8 lg:min-h-[470px] lg:p-10">{visual}</div>
      </div>
    </article>
  )
}

function DarkStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
      <span className="text-xs font-bold text-[#A7D6B8]">{number}</span>
      <h3 className="mt-7 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
    </article>
  )
}

function ValueCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">{text}</p>
    </article>
  )
}
