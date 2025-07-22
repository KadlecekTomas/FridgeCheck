'use client';

import Link from 'next/link';

export default function UnauthNavbar() {
    return (
        <nav className="bg-white shadow p-4 flex justify-between items-center mb-6">
            <div className="flex space-x-4">
                <Link href="/" className="text-gray-800 hover:underline">Domů</Link>
                <Link href="/login" className="text-gray-800 hover:underline">Přihlášení</Link>
            </div>
        </nav>
    );
}
