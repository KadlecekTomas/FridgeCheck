import { Barcode, CheckCircle2, Clock3, PackageOpen, ShoppingBasket } from 'lucide-react'

export function ScannerPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_50px_rgba(23,35,29,0.10)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div><p className="text-xs font-bold">Přidat jídlo</p><p className="mt-0.5 text-[9px] text-text-muted">Kód → produkt → množství</p></div>
          <span className="rounded-full bg-primary-soft px-2 py-1 text-[8px] font-bold text-primary">1 / 3</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl bg-[#173F31] p-4 text-white">
            <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-[#285844]">
              <div className="absolute inset-x-6 top-1/2 h-px bg-[#A7E3B9] shadow-[0_0_12px_rgba(167,227,185,1)]" aria-hidden="true" />
              <Barcode size={86} strokeWidth={1.2} aria-hidden="true" />
            </div>
            <p className="mt-3 text-center text-[10px] font-semibold">Namiřte kameru na čárový kód</p>
          </div>
          <div className="flex flex-col rounded-xl border border-border p-4">
            <span className="w-fit rounded-lg bg-primary-soft px-2 py-1 text-[8px] font-bold text-primary">Produkt rozpoznán</span>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF5D8] text-2xl" aria-hidden="true">🧀</span>
              <div><p className="text-sm font-bold">Eidam 30 %</p><p className="text-[10px] text-text-muted">100 g / balení</p></div>
            </div>
            <div className="mt-5 rounded-xl bg-surface-muted p-3">
              <p className="text-[9px] font-semibold text-text-muted">Kolik balení přidáváte?</p>
              <div className="mt-2 flex items-center justify-between"><span className="text-xl font-bold">24</span><span className="text-[10px] font-semibold text-text-muted">2,4 kg celkem</span></div>
            </div>
            <div className="mt-auto pt-4"><div className="flex min-h-9 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-white">Přidat do zásob</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PriorityPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="grid w-full max-w-[560px] gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Sněz dřív</p><Clock3 size={16} className="text-warning" aria-hidden="true" /></div>
          <p className="mt-1 text-[9px] text-text-muted">Podle nejbližší expirace</p>
          <div className="mt-4 space-y-3">
            <FoodRow emoji="🥛" name="Mléko" detail="1 l" badge="zítra" />
            <FoodRow emoji="🥚" name="Vejce" detail="6 ks" badge="2 dny" />
            <FoodRow emoji="🥬" name="Špenát" detail="150 g" badge="3 dny" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Dochází</p><PackageOpen size={16} className="text-primary" aria-hidden="true" /></div>
          <p className="mt-1 text-[9px] text-text-muted">Pod vaším minimem</p>
          <div className="mt-4 space-y-4">
            <StaticStockLine name="Rýže" amount="350 g" width="35%" />
            <StaticStockLine name="Vločky" amount="200 g" width="20%" />
            <StaticStockLine name="Jogurt" amount="1 ks" width="17%" />
          </div>
        </div>
        <div className="rounded-2xl bg-primary p-4 text-white shadow-sm sm:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold">Priorita bez hledání</p><p className="mt-1 text-[9px] text-white/65">Otevřete přehled a nejdůležitější položky jsou nahoře.</p></div>
            <CheckCircle2 size={24} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ShoppingPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-[560px] rounded-2xl border border-border bg-white p-5 shadow-[0_20px_50px_rgba(23,35,29,0.10)]">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Nákup</p><p className="mt-1 text-[9px] text-text-muted">Doporučení podle aktuálních zásob</p></div><span className="rounded-lg bg-primary px-2.5 py-2 text-[9px] font-bold text-white">+ Přidat</span></div>
        <div className="mt-5 space-y-2.5">
          <ShoppingRow name="Ovesné vločky" current="200 g doma" target="doplnit 800 g" />
          <ShoppingRow name="Rýže basmati" current="350 g doma" target="doplnit 650 g" />
          <ShoppingRow name="Jogurt bílý" current="1 ks doma" target="doplnit 5 ks" />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary-soft p-3 text-[9px] font-semibold text-primary"><CheckCircle2 size={14} aria-hidden="true" /> Doporučení zůstává na vás — do seznamu se přidá až po potvrzení.</div>
      </div>
    </div>
  )
}

export function HouseholdPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_50px_rgba(23,35,29,0.10)]">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div><p className="text-sm font-bold">Moje zásoby</p><p className="mt-1 text-[9px] text-text-muted">Všechna místa v jedné domácnosti</p></div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[8px] font-bold text-primary">18 produktů</span>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-3">
          <StorageCard emoji="🧊" title="Lednice" value="9 produktů" />
          <StorageCard emoji="❄️" title="Mrazák" value="4 produkty" />
          <StorageCard emoji="🥫" title="Spíž" value="5 produktů" />
        </div>
        <div className="mx-4 mb-4 rounded-xl border border-border">
          <InventoryRow emoji="🧀" name="Eidam 30 %" detail="4 balení · 2 expirace" amount="400 g" />
          <InventoryRow emoji="🥚" name="Vejce" detail="Lednice" amount="6 ks" border />
          <InventoryRow emoji="🍚" name="Rýže basmati" detail="Spíž" amount="350 g" border />
        </div>
      </div>
    </div>
  )
}

function FoodRow({ emoji, name, detail, badge }: { emoji: string; name: string; detail: string; badge: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-sm" aria-hidden="true">{emoji}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold sm:text-[11px]">{name}</p><p className="text-[8px] text-text-muted sm:text-[9px]">{detail}</p></div>
      <span className="rounded-md bg-[#FFF1EE] px-1.5 py-1 text-[8px] font-bold text-danger">{badge}</span>
    </div>
  )
}

function StaticStockLine({ name, amount, width }: { name: string; amount: string; width: string }) {
  return (
    <div>
      <div className="flex justify-between gap-2 text-[9px] sm:text-[10px]"><span className="font-bold">{name}</span><span className="text-text-muted">{amount}</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-warning" style={{ width }} /></div>
    </div>
  )
}

function ShoppingRow({ name, current, target }: { name: string; current: string; target: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-white" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{name}</p><p className="mt-0.5 text-[8px] text-text-muted">{current}</p></div>
      <span className="text-right text-[9px] font-bold text-primary">{target}</span>
    </div>
  )
}

function StorageCard({ emoji, title, value }: { emoji: string; title: string; value: string }) {
  return <div className="rounded-xl bg-surface-muted p-3"><span className="text-lg" aria-hidden="true">{emoji}</span><p className="mt-2 text-[10px] font-bold">{title}</p><p className="mt-0.5 text-[8px] text-text-muted">{value}</p></div>
}

function InventoryRow({ emoji, name, detail, amount, border = false }: { emoji: string; name: string; detail: string; amount: string; border?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 ${border ? 'border-t border-border' : ''}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-base" aria-hidden="true">{emoji}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{name}</p><p className="mt-0.5 text-[8px] text-text-muted">{detail}</p></div>
      <span className="text-[10px] font-bold">{amount}</span>
    </div>
  )
}
