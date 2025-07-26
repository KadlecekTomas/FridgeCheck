import { Inter, Roboto_Mono } from 'next/font/google';
import '@/styles/globals.css';
import LayoutClientWrapper from './LayoutClientWrapper';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = Roboto_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

// ✅ SEO, favicony, OG, Twitter
export const metadata = {
  title: 'Hlídač jídla',
  description: 'Sleduj expiraci potravin ve své lednici a nikdy nic nevyhazuj. Mobilní a webová aplikace zdarma!',
  keywords: ['hlídač jídla', 'expirace potravin', 'sledování jídla', 'fridge tracker', 'app pro lednici'],
  icons: {
    icon: '/warehouse.png',
    shortcut: '/warehouse.png',
  },
  openGraph: {
    title: 'Hlídač jídla',
    description: 'Nikdy více prošlé potraviny. Sleduj si lednici pohodlně z mobilu nebo webu.',
    url: 'https://hlidacjidla.eu',
    siteName: 'Hlídač jídla',
    locale: 'cs_CZ',
    type: 'website',
    images: [
      {
        url: '/warehouse.png',
        width: 800,
        height: 600,
        alt: 'Ikona Hlídač jídla',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hlídač jídla',
    description: 'Webová aplikace pro sledování expirace potravin.',
    images: ['/fridge-icon-transparent.png'],
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <LayoutClientWrapper>{children}</LayoutClientWrapper>
      </body>
    </html>
  );
}
