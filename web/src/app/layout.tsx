import { Inter, Roboto_Mono } from 'next/font/google'
import '@/styles/globals.css'
import LayoutClientWrapper from './LayoutClientWrapper'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

const mono = Roboto_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: { title: string; description?: string } = {
  title: 'Hlídač jídla',
  description: 'Hlídač jídla',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>
      </body>
    </html>
  )
}
