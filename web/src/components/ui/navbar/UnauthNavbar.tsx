'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function UnauthNavbar() {
    const pathname = usePathname();

    const linkClass = (href: string) =>
        `hover:text-green-400 transition ${pathname === href ? 'text-green-400 font-semibold' : 'text-white'
        }`;
    return (
        <header className="w-full px-6 py-4 flex justify-between items-center bg-black shadow-md z-50">
            <Link href="/" className="text-xl font-extrabold tracking-wide text-green-400">
                HLÍDAČ JÍDLA
            </Link>
            <nav className="hidden md:flex gap-8 text-sm font-medium">
                <Link href="/#features" className={linkClass('/#features')}>Funkce</Link>
                <Link href="/#pricing" className={linkClass('/#pricing')}>Ceník</Link>
                <Link href="/#reviews" className={linkClass('/#reviews')}>Recenze</Link>
                <Link href="/#cta" className={linkClass('/#cta')}>Začít</Link>
            </nav>
            <div className="hidden md:block">
                <Link
                    href="/login"
                    className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded-full font-semibold shadow-md transition hover:scale-105 text-white"
                >
                    Vyzkoušet zdarma
                </Link>
            </div>
        </header>

    );
}
