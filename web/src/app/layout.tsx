import type { Metadata, Viewport } from 'next'
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

export const viewport: Viewport = {
  themeColor: '#174D3A',
  colorScheme: 'light',
}

export const metadata: Metadata = {
  applicationName: 'HlídačJídla',
  manifest: '/manifest.webmanifest',
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
    icon: [
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'HlídačJídla',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
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
