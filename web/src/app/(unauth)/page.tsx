'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function LandingPage() {
    return (
        <div className="scroll-smooth">
            {/* HERO */}
            <div className="min-h-screen bg-gradient-to-b from-white to-[#f7fafc] flex flex-col items-center px-6 pt-20 pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl text-center space-y-8"
                >
                    <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                        Uklidni si lednici.
                        <br />
                        <span className="text-green-600">Navždy bez prošlých potravin.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                        FridgeCheck ti pomůže sledovat expiraci jídla. Přidej se zdarma a měj přehled o tom, co máš doma.
                    </p>

                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link
                            href="/login"
                            className="bg-green-600 hover:bg-green-700 text-white text-base font-medium px-8 py-3 rounded-xl transition"
                        >
                            Začít hned
                        </Link>
                        <Link
                            href="#jak-to-funguje"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-base font-medium px-8 py-3 rounded-xl transition"
                        >
                            Jak to funguje?
                        </Link>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="mt-16 w-full max-w-4xl"
                >
                    <Image
                        src="/images/fridge-illustration.svg"
                        alt="Ilustrace lednice"
                        width={800} // nebo jakýkoli přibližný rozměr
                        height={600}
                        className="w-full h-auto"
                    />
                </motion.div>
            </div>

            {/* SECTION: JAK TO FUNGUJE */}
            <section
                id="jak-to-funguje"
                className="bg-white py-28 px-6 text-center"
            >
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="text-4xl font-bold text-gray-800 mb-12"
                >
                    Jak to funguje?
                </motion.h2>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-6xl mx-auto"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    <div className="bg-gray-50 rounded-2xl shadow p-6">
                        <h3 className="text-xl font-semibold text-green-600 mb-2">1. Přidej potravinu</h3>
                        <p className="text-gray-600 text-sm">
                            Vyfoť nebo napiš, co jsi dal do lednice. Přidej datum spotřeby nebo expirace.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl shadow p-6">
                        <h3 className="text-xl font-semibold text-green-600 mb-2">2. My tě upozorníme</h3>
                        <p className="text-gray-600 text-sm">
                            FridgeCheck ti pošle notifikaci včas – dřív, než to začne smrdět.
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl shadow p-6">
                        <h3 className="text-xl font-semibold text-green-600 mb-2">3. Neplývej, užívej</h3>
                        <p className="text-gray-600 text-sm">
                            Sleduj, co máš doma. Zlepši spotřebu, šetři peníze a životní prostředí.
                        </p>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
