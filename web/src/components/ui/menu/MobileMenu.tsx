'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/auth/client';

export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabaseBrowser().auth.getSession();
            setIsLoggedIn(!!session);
        };
        checkSession();
    }, []);

    return (
        <AnimatePresence>
            {open && (
                <motion.nav
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center text-white space-y-10 text-2xl font-semibold"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-white hover:text-green-400"
                        aria-label="Zavřít menu"
                    >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <a href="#features" onClick={onClose} className="hover:text-green-400 transition">Funkce</a>
                    <a href="#pricing" onClick={onClose} className="hover:text-green-400 transition">Ceník</a>
                    <a href="#reviews" onClick={onClose} className="hover:text-green-400 transition">Recenze</a>
                    <a href="#cta" onClick={onClose} className="hover:text-green-400 transition">Začít</a>

                    {isLoggedIn ? (
                        <Link
                            href="/dashboard"
                            onClick={onClose}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
                        >
                            Pokračovat do dashboardu
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            onClick={onClose}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
                        >
                            Vyzkoušet zdarma
                        </Link>
                    )}
                </motion.nav>
            )}
        </AnimatePresence>
    );
}
