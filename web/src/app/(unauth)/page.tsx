'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import ReactFullpage from '@fullpage/react-fullpage';
import 'fullpage.js/dist/fullpage.css';
import './global.css';
import { useEffect, useState } from 'react';

export default function LandingPage() {
    const [isSmallScreen, setIsSmallScreen] = useState(false);

    useEffect(() => {
        const checkSize = () => {
            if (typeof window !== 'undefined') {
                setIsSmallScreen(window.innerWidth < 1024);
            }
        };

        checkSize();
        window.addEventListener('resize', checkSize);

        return () => window.removeEventListener('resize', checkSize);
    }, []);

    const plans = [
        {
            title: 'Zdarma',
            price: '0 Kč',
            features: ['1 lednice', 'Limit 50 potravin', 'Základní funkce']
        },
        {
            title: 'Pro domácnost',
            price: '59 Kč/měs.',
            features: ['Až 3 lednice', '200+ položek', 'Notifikace & sdílení']
        },
        {
            title: 'Premium',
            price: '119 Kč/měs.',
            features: ['Neomezeně', 'Export, analýzy', 'Prioritní podpora']
        }
    ];

    const reviews = [
        {
            name: 'Petra K.',
            text: 'Super aplikace! Přestali jsme vyhazovat jídlo a konečně máme přehled, co v lednici máme.'
        },
        {
            name: 'Martin D.',
            text: 'Skvělý nápad. Notifikace mi několikrát zachránily večeři. Doporučuju!'
        }
    ];

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-black/80 backdrop-blur-md shadow-lg border-b border-white/10">
                <a href="#hero" className="text-2xl font-extrabold tracking-widest text-green-400">HLÍDAČ JÍDLA</a>
                <nav className="hidden md:flex gap-8 text-sm font-medium text-white">
                    <a href="#features" className="hover:text-green-400 transition">Funkce</a>
                    <a href="#pricing" className="hover:text-green-400 transition">Ceník</a>
                    <a href="#reviews" className="hover:text-green-400 transition">Recenze</a>
                    <a href="#cta" className="hover:text-green-400 transition">Začít</a>
                </nav>
                <Link
                    href="/login"
                    className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded-full font-semibold shadow-md transition hover:scale-105 text-white"
                >
                    Vyzkoušet zdarma
                </Link>
            </header>

            {isSmallScreen ? (
                <div className="text-white bg-black font-sans">
                    {/* HERO sekce */}
                    <section id="hero" className="relative min-h-screen w-full flex items-center justify-center text-center px-6 py-16">
                        <Image
                            src="/images/fridge-hero.jpg"
                            alt="Lednice background"
                            fill
                            className="object-cover object-center z-0 opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 z-10" />
                        <div className="relative z-20">
                            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                                Uklidni si lednici.<br />
                                <span className="text-green-400">Navždy bez prošlých potravin.</span>
                            </h1>
                            <p className="mt-6 text-base sm:text-lg max-w-2xl mx-auto text-gray-300">
                                Aplikace, která ti pomůže mít přehled o tom, co máš doma – a kdy to sníst. Ušetři peníze, čas i planetu.
                            </p>
                            <div className="mt-10">
                                <Link
                                    href="/login"
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
                                >
                                    Začít zdarma
                                </Link>
                            </div>
                        </div>
                    </section>

                    {/* FUNKCE sekce */}
                    <section id="features" className="py-24 px-6 text-center">
                        <h2 className="text-4xl font-bold mb-8 text-green-400">Co všechno umíme?</h2>
                        <p className="max-w-3xl text-lg text-gray-300 mx-auto">
                            Hlídač jídla automaticky sleduje expiraci potravin, posílá notifikace, umožňuje sdílení domácnosti a nabízí přehledné statistiky o spotřebě.
                            Ušetři ročně až 12 000 Kč a pomoz planetě snížením plýtvání jídlem.
                        </p>
                    </section>

                    {/* CENÍK sekce */}
                    <section id="pricing" className="bg-gradient-to-b from-white to-green-50 py-28 px-6 text-gray-900">
                        <h2 className="text-4xl font-bold mb-12 text-center">Ceník</h2>
                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {plans.map((plan, i) => (
                                <div
                                    key={i}
                                    className={`p-8 rounded-2xl shadow-xl ${i === 1 ? 'bg-green-100 border-2 border-green-500' : 'bg-white'}`}
                                >
                                    <h3 className="text-2xl font-bold">{plan.title}</h3>
                                    <p className="text-3xl font-bold text-green-600 my-4">{plan.price}</p>
                                    <ul className="text-zinc-700 space-y-2">
                                        {plan.features.map((f, j) => (
                                            <li key={j}>✓ {f}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* RECENZE sekce */}
                    <section id="reviews" className="bg-gradient-to-b from-green-50 to-white py-28 px-6 text-gray-900">
                        <h2 className="text-4xl font-bold mb-12 text-center">Co říkají uživatelé?</h2>
                        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            {reviews.map((review, i) => (
                                <div key={i} className="bg-white p-6 rounded-xl shadow-md text-left">
                                    <p className="text-gray-700 mb-4">“{review.text}”</p>
                                    <p className="font-semibold text-green-600">{review.name}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* CTA sekce */}
                    <section id="cta" className="bg-green-600 py-20 px-6 text-center text-white">
                        <h2 className="text-4xl font-bold mb-6">Připraven začít?</h2>
                        <p className="text-lg mb-10">Vytvoř si účet během 30 vteřin. Je to zdarma a bez závazků.</p>
                        <Link
                            href="/app"
                            className="bg-white text-green-600 font-bold px-8 py-4 rounded-full shadow-lg hover:scale-105 transition-transform"
                        >
                            Vytvořit účet
                        </Link>
                    </section>
                </div>
            ) : (
                <ReactFullpage
                    licenseKey={'OPEN-SOURCE-GPLV3-LICENSE'}
                    scrollingSpeed={900}
                    anchors={['hero', 'features', 'pricing', 'reviews', 'cta']}
                    navigation
                    navigationTooltips={['Úvod', 'Funkce', 'Ceník', 'Recenze', 'Začít']}
                    showActiveTooltip
                    credits={{ enabled: false }}
                    afterLoad={(origin, destination) => {
                        const tooltips = document.querySelectorAll('.fp-tooltip');
                        tooltips.forEach((t) => {
                            if (t instanceof HTMLElement) {
                                // Barva podle sekce (0 a 1 bílé pozadí, zbytek černé)
                                t.style.color = destination.index <= 1 ? '#fff' : '#111';
                            }
                        });
                    }}
                    render={() => (
                        <>
                            <div id="fullpage" className="text-white bg-black font-sans [&_.fp-watermark]:hidden">
                                {/* HERO SECTION */}
                                <div className="section">
                                    <section className="relative h-screen w-full">
                                        <Image
                                            src="/images/fridge-hero.jpg"
                                            alt="Lednice background"
                                            fill
                                            className="object-cover object-center z-0 opacity-30"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 z-10" />
                                        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
                                            <motion.h1
                                                initial={{ opacity: 0, y: 50 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 1 }}
                                                className="text-5xl md:text-6xl font-extrabold leading-tight"
                                            >
                                                Uklidni si lednici.<br />
                                                <span className="text-green-400">Navždy bez prošlých potravin.</span>
                                            </motion.h1>
                                            <motion.p
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3, duration: 1 }}
                                                className="mt-6 text-lg max-w-2xl text-gray-300"
                                            >
                                                Aplikace, která ti pomůže mít přehled o tom, co máš doma – a kdy to sníst. Ušetři peníze, čas i planetu.
                                            </motion.p>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.6, duration: 0.8 }}
                                                className="mt-10"
                                            >
                                                <Link
                                                    href="/login"
                                                    className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold px-8 py-4 rounded-full shadow-lg transition-transform hover:scale-105"
                                                >
                                                    Začít zdarma
                                                </Link>
                                            </motion.div>
                                            <motion.div
                                                animate={{ y: [0, 10, 0] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="absolute bottom-10 cursor-pointer"
                                            >
                                                <a href="#features" aria-label="Scroll down">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-8 h-8 text-green-400 animate-bounce"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </a>
                                            </motion.div>
                                        </div>
                                    </section>
                                </div>

                                {/* FUNKCE SECTION */}
                                <div className="section">
                                    <section className="min-h-screen bg-black py-24 px-6 flex flex-col items-center justify-center text-center">
                                        <h2 className="text-4xl font-bold mb-8 text-green-400">Co všechno umíme?</h2>
                                        <p className="max-w-3xl text-lg text-gray-300 mb-12">
                                            Hlídač jídla automaticky sleduje expiraci potravin, posílá notifikace, umožňuje sdílení domácnosti a nabízí přehledné statistiky o spotřebě.
                                            Ušetři ročně až 12 000 Kč a pomoz planetě snížením plýtvání jídlem.
                                        </p>
                                    </section>
                                </div>

                                {/* CENÍK SECTION */}
                                <div className="section">
                                    <section className="min-h-screen bg-gradient-to-b from-white to-green-50 py-28 px-6 flex flex-col justify-center text-gray-900">
                                        <h2 className="text-4xl font-bold mb-12 text-center">Ceník</h2>
                                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                                            {plans.map((plan, i) => (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ scale: 1.05 }}
                                                    className={`p-8 rounded-2xl shadow-xl ${i === 1 ? 'bg-green-100 border-2 border-green-500' : 'bg-white'}`}
                                                >
                                                    <h3 className="text-2xl font-bold text-zinc-800">{plan.title}</h3>
                                                    <p className="text-3xl font-bold text-green-600 my-4">{plan.price}</p>
                                                    <ul className="text-zinc-700 space-y-2">
                                                        {plan.features.map((f, j) => (
                                                            <li key={j}>✓ {f}</li>
                                                        ))}
                                                    </ul>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                </div>

                                {/* RECENZE SECTION */}
                                <div className="section">
                                    <section className="min-h-screen bg-gradient-to-b from-green-50 to-white py-28 px-6 text-gray-900 flex flex-col justify-center">
                                        <h2 className="text-4xl font-bold mb-12 text-center">Co říkají uživatelé?</h2>
                                        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                                            {reviews.map((review, i) => (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ scale: 1.03 }}
                                                    className="bg-white p-6 rounded-xl shadow-md text-left"
                                                >
                                                    <p className="text-gray-700 mb-4">“{review.text}”</p>
                                                    <p className="font-semibold text-green-600">{review.name}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                </div>

                                {/* CTA SECTION */}
                                <div className="section">
                                    <section className="bg-green-600 py-20 px-6 text-center text-white">
                                        <h2 className="text-4xl font-bold mb-6">Připraven začít?</h2>
                                        <p className="text-lg mb-10">Vytvoř si účet během 30 vteřin. Je to zdarma a bez závazků.</p>
                                        <Link
                                            href="/app"
                                            className="bg-white text-green-600 font-bold px-8 py-4 rounded-full shadow-lg hover:scale-105 transition-transform"
                                        >
                                            Vytvořit účet
                                        </Link>
                                    </section>
                                </div>

                            </div>
                        </>
                    )}
                />
            )}
        </>
    );
}
