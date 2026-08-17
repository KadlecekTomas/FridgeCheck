import { Inter, Roboto_Mono } from 'next/font/google'
import '@/styles/globals.css'
import LayoutClientWrapper from './LayoutClientWrapper'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
})

const mono = Roboto_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'latin-ext'],
})

export const metadata = {
  title: {
    default: 'HlídačJídla',
    template: '%s · HlídačJídla',
  },
  description:
    'Přehled zásob, expirací a nákupu pro domácnost. Vědět, co mám doma, co sníst a co koupit.',
  keywords: [
    'hlídač jídla',
    'zásoby doma',
    'expirace potravin',
    'nákupní seznam',
    'fridge tracker',
  ],
  icons: {
    icon: '/warehouse.png',
    shortcut: '/warehouse.png',
  },
  openGraph: {
    title: 'HlídačJídla',
    description: 'Co mám doma. Co sníst. Co koupit.',
    url: 'https://hlidacjidla.eu',
    siteName: 'HlídačJídla',
    locale: 'cs_CZ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <LayoutClientWrapper>{children}</LayoutClientWrapper>
      </body>
    </html>
  )
}
