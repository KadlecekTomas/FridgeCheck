'use client'

import { useMemo, useState } from 'react'
import {
  Barcode,
  Check,
  Clock3,
  History,
  Home,
  PackageOpen,
  Plus,
  Refrigerator,
  RotateCcw,
  ShoppingBasket,
  Utensils,
} from 'lucide-react'

type DemoTab = 'overview' | 'inventory' | 'shopping' | 'history'

type DemoItem = {
  id: string
  emoji: string
  name: string
  quantity: number
  target: number
  unit: 'ks' | 'g' | 'l'
  storage: string
  expiryLabel?: string
  expiryDays?: number
}

type DemoEvent = {
  id: number
  label: string
  detail: string
}

const initialItems: DemoItem[] = [
  { id: 'milk', emoji: '🥛', name: 'Mléko', quantity: 1, target: 2, unit: 'l', storage: 'Lednice', expiryLabel: 'zítra', expiryDays: 1 },
  { id: 'eggs', emoji: '🥚', name: 'Vejce', quantity: 6, target: 10, unit: 'ks', storage: 'Lednice', expiryLabel: '2 dny', expiryDays: 2 },
  { id: 'cheese', emoji: '🧀', name: 'Eidam 30 %', quantity: 400, target: 500, unit: 'g', storage: 'Lednice', expiryLabel: '4 dny', expiryDays: 4 },
  { id: 'oats', emoji: '🌾', name: 'Ovesné vločky', quantity: 200, target: 1000, unit: 'g', storage: 'Spíž' },
  { id: 'rice', emoji: '🍚', name: 'Rýže basmati', quantity: 350, target: 1000, unit: 'g', storage: 'Spíž' },
  { id: 'yogurt', emoji: '🥣', name: 'Jogurt bílý', quantity: 1, target: 6, unit: 'ks', storage: 'Lednice' },
]

const initialEvents: DemoEvent[] = [
  { id: 1, label: 'Přidáno do zásob', detail: 'Eidam 30 % · 400 g' },
  { id: 2, label: 'Spotřebováno', detail: 'Mléko · 1 l' },
]

const addChoices: DemoItem[] = [
  { id: 'bananas', emoji: '🍌', name: 'Banány', quantity: 6, target: 6, unit: 'ks', storage: 'Kuchyň' },
  { id: 'skyr', emoji: '🥣', name: 'Skyr', quantity: 4, target: 6, unit: 'ks', storage: 'Lednice', expiryLabel: '6 dní', expiryDays: 6 },
  { id: 'chicken', emoji: '🍗', name: 'Kuřecí maso', quantity: 600, target: 1000, unit: 'g', storage: 'Lednice', expiryLabel: '3 dny', expiryDays: 3 },
]

function formatQuantity(item: DemoItem, quantity = item.quantity) {
  return `${quantity.toLocaleString('cs-CZ')} ${item.unit}`
}

function stepFor(item: DemoItem) {
  if (item.unit === 'g') return 100
  return 1
}

export function InteractiveProductDemo() {
  const [activeTab, setActiveTab] = useState<DemoTab>('overview')
  const [items, setItems] = useState<DemoItem[]>(initialItems)
  const [events, setEvents] = useState<DemoEvent[]>(initialEvents)
  const [showAdd, setShowAdd] = useState(false)

  const expiring = useMemo(
    () => items.filter((item) => item.expiryDays !== undefined && item.quantity > 0).sort((a, b) => (a.expiryDays ?? 99) - (b.expiryDays ?? 99)),
    [items],
  )
  const lowStock = useMemo(() => items.filter((item) => item.quantity < item.target), [items])

  const logEvent = (label: string, detail: string) => {
    setEvents((current) => [{ id: Date.now(), label, detail }, ...current].slice(0, 8))
  }

  const consume = (id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    if (!item || item.quantity <= 0) return

    const amount = Math.min(stepFor(item), item.quantity)
    setItems((current) => current.map((candidate) => candidate.id === id ? { ...candidate, quantity: Math.max(0, candidate.quantity - amount) } : candidate))
    logEvent('Spotřebováno', `${item.name} · ${formatQuantity(item, amount)}`)
  }

  const restock = (id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    if (!item || item.quantity >= item.target) return

    const amount = item.target - item.quantity
    setItems((current) => current.map((candidate) => candidate.id === id ? { ...candidate, quantity: candidate.target } : candidate))
    logEvent('Nákup doplněn', `${item.name} · +${formatQuantity(item, amount)}`)
  }

  const addItem = (choice: DemoItem) => {
    const existing = items.find((item) => item.id === choice.id)
    if (existing) {
      setItems((current) => current.map((item) => item.id === choice.id ? { ...item, quantity: item.quantity + choice.quantity } : item))
    } else {
      setItems((current) => [...current, choice])
    }
    logEvent('Přidáno do zásob', `${choice.name} · ${formatQuantity(choice)}`)
    setShowAdd(false)
    setActiveTab('inventory')
  }

  const resetDemo = () => {
    setItems(initialItems)
    setEvents(initialEvents)
    setActiveTab('overview')
    setShowAdd(false)
  }

  return (
    <div className="relative mx-auto w-full max-w-[760px] pb-3 md:pb-10 lg:pb-14" data-testid="interactive-product-demo">
      <div className="absolute -inset-4 -z-10 rounded-[2.25rem] bg-white/55 blur-xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[1.6rem] border border-white/80 bg-white shadow-[0_30px_80px_rgba(34,59,46,0.16)] ring-1 ring-border/70">
        <div className="hidden h-10 items-center gap-3 border-b border-border bg-[#F5F6F3] px-4 md:flex">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#EF6A61]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#E9B84C]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#63B967]" />
          </div>
          <div className="mx-auto flex h-6 w-[44%] items-center justify-center rounded-md bg-white text-[9px] font-semibold text-text-muted shadow-sm">hlidacjidla.eu</div>
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3.5 md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white"><Refrigerator size={16} aria-hidden="true" /></span>
            <div><p className="text-xs font-bold">HlídačJídla</p><p className="mt-0.5 text-[9px] text-text-muted">Interaktivní ukázka</p></div>
          </div>
          <button type="button" onClick={resetDemo} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted transition hover:text-text" aria-label="Obnovit demo">
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="md:grid md:min-h-[500px] md:grid-cols-[170px_1fr]">
          <aside className="hidden border-r border-border bg-[#F9FAF7] p-4 md:block">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white"><Refrigerator size={14} aria-hidden="true" /></span>
              HlídačJídla
            </div>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-primary">Interaktivní demo</p>
            <nav className="mt-6 space-y-1.5" aria-label="Ukázka aplikace">
              <DemoNavButton icon={<Home size={14} />} label="Přehled" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
              <DemoNavButton icon={<PackageOpen size={14} />} label="Zásoby" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
              <DemoNavButton icon={<ShoppingBasket size={14} />} label="Nákup" active={activeTab === 'shopping'} onClick={() => setActiveTab('shopping')} />
              <DemoNavButton icon={<History size={14} />} label="Historie" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </nav>
            <div className="mt-8 rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] font-bold">Moje domácnost</p>
              <p className="mt-1 text-[9px] leading-4 text-text-muted">Změny v této ukázce se neukládají.</p>
            </div>
            <button type="button" onClick={resetDemo} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-bold text-text-muted transition hover:bg-white hover:text-text">
              <RotateCcw size={12} aria-hidden="true" /> Obnovit demo
            </button>
          </aside>

          <div className="min-w-0 bg-white p-4 sm:p-5 md:p-6">
            <DemoHeader activeTab={activeTab} showAdd={showAdd} onToggleAdd={() => setShowAdd((value) => !value)} />
            {showAdd ? <AddPanel onAdd={addItem} onCancel={() => setShowAdd(false)} /> : null}

            <div className={showAdd ? 'mt-4 opacity-50 transition' : 'mt-4 transition'} aria-hidden={showAdd || undefined}>
              {activeTab === 'overview' ? <OverviewView items={items} expiring={expiring} lowStock={lowStock} onConsume={consume} onNavigate={setActiveTab} /> : null}
              {activeTab === 'inventory' ? <InventoryView items={items} onConsume={consume} /> : null}
              {activeTab === 'shopping' ? <ShoppingView items={lowStock} onRestock={restock} /> : null}
              {activeTab === 'history' ? <HistoryView events={events} /> : null}
            </div>
          </div>
        </div>

        <nav className="grid grid-cols-4 border-t border-border bg-[#FAFBF8] px-2 py-2 md:hidden" aria-label="Mobilní ukázka aplikace">
          <MobileNav icon={<Home size={16} />} label="Přehled" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <MobileNav icon={<PackageOpen size={16} />} label="Zásoby" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <MobileNav icon={<ShoppingBasket size={16} />} label="Nákup" active={activeTab === 'shopping'} onClick={() => setActiveTab('shopping')} />
          <MobileNav icon={<History size={16} />} label="Historie" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </nav>
      </div>

      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-2 text-[10px] font-bold text-primary shadow-sm md:absolute md:-bottom-1 md:left-4 md:mt-0">
        <Barcode size={14} aria-hidden="true" /> Klikněte si. Demo opravdu reaguje.
      </div>
    </div>
  )
}

function DemoHeader({ activeTab, showAdd, onToggleAdd }: { activeTab: DemoTab; showAdd: boolean; onToggleAdd: () => void }) {
  const titles: Record<DemoTab, { eyebrow: string; title: string }> = {
    overview: { eyebrow: 'Dobrý den 👋', title: 'Co potřebuje pozornost?' },
    inventory: { eyebrow: 'Moje domácnost', title: 'Zásoby' },
    shopping: { eyebrow: 'Podle aktuálních zásob', title: 'Nákup' },
    history: { eyebrow: 'Poslední změny', title: 'Historie' },
  }
  const copy = titles[activeTab]

  return (
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold text-text-muted sm:text-xs">{copy.eyebrow}</p><h2 className="mt-1 text-lg font-bold tracking-[-0.03em] sm:text-xl">{copy.title}</h2></div>
      <button type="button" onClick={onToggleAdd} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-[10px] font-bold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-expanded={showAdd}>
        <Plus size={12} aria-hidden="true" /> {showAdd ? 'Zavřít' : 'Přidat'}
      </button>
    </div>
  )
}

function AddPanel({ onAdd, onCancel }: { onAdd: (item: DemoItem) => void; onCancel: () => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-primary/15 bg-primary-soft/45 p-3.5" data-testid="demo-add-panel">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold">Vyzkoušejte přidání</p><p className="mt-0.5 text-[9px] text-text-muted">Demo data se neukládají.</p></div>
        <Barcode size={17} className="text-primary" aria-hidden="true" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {addChoices.map((choice) => (
          <button key={choice.id} type="button" onClick={() => onAdd(choice)} className="rounded-xl border border-border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm">
            <span className="text-xl" aria-hidden="true">{choice.emoji}</span>
            <p className="mt-2 text-[10px] font-bold">{choice.name}</p>
            <p className="mt-0.5 text-[9px] text-text-muted">+ {formatQuantity(choice)}</p>
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel} className="mt-3 text-[9px] font-bold text-text-muted underline-offset-2 hover:underline">Zrušit</button>
    </div>
  )
}

function OverviewView({ items, expiring, lowStock, onConsume, onNavigate }: { items: DemoItem[]; expiring: DemoItem[]; lowStock: DemoItem[]; onConsume: (id: string) => void; onNavigate: (tab: DemoTab) => void }) {
  return (
    <div data-testid="demo-overview">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricButton label="Sněz dřív" value={String(expiring.length)} tone="warning" onClick={() => onNavigate('inventory')} />
        <MetricButton label="Dochází" value={String(lowStock.length)} tone="primary" onClick={() => onNavigate('inventory')} />
        <MetricButton label="Na nákup" value={String(lowStock.length)} tone="neutral" onClick={() => onNavigate('shopping')} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-2xl border border-border p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold sm:text-sm">Sněz nejdřív</p><p className="mt-0.5 text-[9px] text-text-muted">Kliknutím odečtete běžnou porci.</p></div><Clock3 size={15} className="text-warning" aria-hidden="true" /></div>
          <div className="mt-3 space-y-2">
            {expiring.slice(0, 3).map((item) => <AttentionRow key={item.id} item={item} onConsume={onConsume} />)}
            {expiring.length === 0 ? <EmptyMini text="Nic urgentního. Paráda." /> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold sm:text-sm">Dochází</p><ShoppingBasket size={15} className="text-primary" aria-hidden="true" /></div>
          <div className="mt-3 space-y-3">
            {lowStock.slice(0, 3).map((item) => <StockLine key={item.id} item={item} />)}
            {lowStock.length === 0 ? <EmptyMini text="Vše je doplněné." /> : null}
          </div>
        </div>
      </div>

      <button type="button" onClick={() => onNavigate('shopping')} className="mt-3 flex w-full items-center justify-between rounded-xl bg-primary-soft/70 p-3.5 text-left transition hover:bg-primary-soft sm:p-4">
        <span className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary"><ShoppingBasket size={15} aria-hidden="true" /></span><span><span className="block text-[11px] font-bold sm:text-xs">Nákup připravený podle zásob</span><span className="mt-0.5 block text-[9px] text-text-muted sm:text-[10px]">{lowStock.length} položek můžete doplnit na cílové množství.</span></span></span>
        <span className="text-[10px] font-bold text-primary">Otevřít</span>
      </button>
      <p className="sr-only">Celkem {items.length} produktů.</p>
    </div>
  )
}

function InventoryView({ items, onConsume }: { items: DemoItem[]; onConsume: (id: string) => void }) {
  return (
    <div className="space-y-2" data-testid="demo-inventory">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-lg" aria-hidden="true">{item.emoji}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold">{item.name}</p><p className="mt-0.5 text-[9px] text-text-muted">{item.storage}{item.expiryLabel ? ` · ${item.expiryLabel}` : ''}</p></div>
          <div className="text-right"><p className="text-[11px] font-bold">{formatQuantity(item)}</p><button type="button" disabled={item.quantity <= 0} onClick={() => onConsume(item.id)} className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-primary disabled:cursor-not-allowed disabled:opacity-35"><Utensils size={10} aria-hidden="true" /> Spotřebovat</button></div>
        </div>
      ))}
    </div>
  )
}

function ShoppingView({ items, onRestock }: { items: DemoItem[]; onRestock: (id: string) => void }) {
  return (
    <div data-testid="demo-shopping">
      {items.length === 0 ? <div className="rounded-2xl border border-border bg-surface-muted p-6 text-center"><Check className="mx-auto text-primary" size={22} aria-hidden="true" /><p className="mt-2 text-xs font-bold">Nákup je hotový</p><p className="mt-1 text-[10px] text-text-muted">Demo zásoby jsou na cílovém množství.</p></div> : (
        <div className="space-y-2">
          {items.map((item) => {
            const missing = item.target - item.quantity
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-lg" aria-hidden="true">{item.emoji}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold">{item.name}</p><p className="mt-0.5 text-[9px] text-text-muted">Doma {formatQuantity(item)} · cíl {item.target.toLocaleString('cs-CZ')} {item.unit}</p></div>
                <button type="button" onClick={() => onRestock(item.id)} className="shrink-0 rounded-lg bg-primary-soft px-2.5 py-2 text-[9px] font-bold text-primary transition hover:bg-primary hover:text-white">Koupeno +{missing.toLocaleString('cs-CZ')} {item.unit}</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HistoryView({ events }: { events: DemoEvent[] }) {
  return (
    <div className="space-y-2" data-testid="demo-history">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3 rounded-xl border border-border p-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><History size={13} aria-hidden="true" /></span>
          <div><p className="text-[10px] font-bold">{event.label}</p><p className="mt-0.5 text-[9px] text-text-muted">{event.detail}</p><p className="mt-1 text-[8px] text-text-muted/70">{index === 0 ? 'právě teď' : 'dříve'}</p></div>
        </div>
      ))}
    </div>
  )
}

function AttentionRow({ item, onConsume }: { item: DemoItem; onConsume: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface-muted/55 p-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base" aria-hidden="true">{item.emoji}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold sm:text-[11px]">{item.name}</p><p className="text-[8px] text-text-muted sm:text-[9px]">{formatQuantity(item)}</p></div>
      <button type="button" onClick={() => onConsume(item.id)} className="rounded-lg bg-[#FFF1EE] px-2 py-1.5 text-[8px] font-bold text-danger transition hover:brightness-95" aria-label={`Spotřebovat ${item.name}`}>{item.expiryLabel}</button>
    </div>
  )
}

function StockLine({ item }: { item: DemoItem }) {
  const percent = item.target > 0 ? Math.min(100, Math.round((item.quantity / item.target) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between gap-2 text-[9px] sm:text-[10px]"><span className="truncate font-bold">{item.name}</span><span className="shrink-0 text-text-muted">{formatQuantity(item)} / {item.target.toLocaleString('cs-CZ')} {item.unit}</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-warning transition-[width] duration-300" style={{ width: `${percent}%` }} /></div>
    </div>
  )
}

function MetricButton({ label, value, tone, onClick }: { label: string; value: string; tone: 'warning' | 'primary' | 'neutral'; onClick: () => void }) {
  const toneClass = tone === 'warning' ? 'text-warning bg-[#FFF6E8]' : tone === 'primary' ? 'text-primary bg-primary-soft' : 'text-text bg-surface-muted'
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm sm:p-3.5">
      <span className={`inline-flex rounded-md px-1.5 py-1 text-[8px] font-bold sm:text-[9px] ${toneClass}`}>{label}</span>
      <p className="mt-2 text-xl font-bold tracking-[-0.04em] sm:text-2xl">{value}</p><p className="text-[8px] text-text-muted sm:text-[9px]">položky</p>
    </button>
  )
}

function DemoNavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${active ? 'bg-primary-soft text-primary' : 'text-text-muted hover:bg-white hover:text-text'}`} aria-pressed={active}><span aria-hidden="true">{icon}</span>{label}</button>
}

function MobileNav({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-[8px] font-bold transition ${active ? 'bg-primary-soft/70 text-primary' : 'text-text-muted'}`} aria-pressed={active}><span aria-hidden="true">{icon}</span>{label}</button>
}

function EmptyMini({ text }: { text: string }) {
  return <p className="rounded-xl bg-surface-muted p-3 text-center text-[9px] font-semibold text-text-muted">{text}</p>
}
