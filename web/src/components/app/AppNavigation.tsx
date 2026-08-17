'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  MoreHorizontal,
  PackageOpen,
  Plus,
  ShoppingBasket,
  type LucideIcon,
} from 'lucide-react'

type NavigationItem = {
  href: string
  label: string
  icon: LucideIcon
  primary?: boolean
}

const items: NavigationItem[] = [
  { href: '/dashboard', label: 'Domů', icon: Home },
  { href: '/inventory', label: 'Zásoby', icon: PackageOpen },
  { href: '/inventory/new', label: 'Přidat', icon: Plus, primary: true },
  { href: '/shopping', label: 'Nákup', icon: ShoppingBasket },
  { href: '/more', label: 'Více', icon: MoreHorizontal },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  if (href === '/inventory') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DesktopNavigation() {
  const pathname = usePathname()

  return (
    <nav aria-label="Hlavní navigace" className="hidden items-center gap-1 md:flex">
      {items.map(({ href, label, icon: Icon, primary }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={
              primary
                ? 'inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                : `inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-primary-soft text-primary'
                      : 'text-text-muted hover:bg-surface-muted hover:text-text'
                  }`
            }
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Hlavní navigace"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className="flex min-h-14 flex-col items-center justify-end gap-1 rounded-xl text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span
                className={
                  primary
                    ? 'flex h-12 w-12 -translate-y-2 items-center justify-center rounded-2xl bg-primary text-white shadow-sm'
                    : `flex h-7 w-10 items-center justify-center rounded-xl ${
                        active ? 'bg-primary-soft text-primary' : 'text-text-muted'
                      }`
                }
              >
                <Icon size={primary ? 24 : 21} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className={active ? 'text-primary' : 'text-text-muted'}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
