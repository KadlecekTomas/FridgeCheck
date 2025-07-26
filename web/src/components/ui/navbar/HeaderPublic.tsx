'use client';
import Link from 'next/link';

export default function HeaderPublic() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white shadow-sm border-b border-gray-100">
      <Link href="/" className="text-xl font-bold text-green-600 tracking-widest">
        HLÍDAČ JÍDLA
      </Link>
      <Link
        href="/"
        className="text-sm bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-full font-semibold transition hover:scale-105"
      >
        Zpět na úvod
      </Link>
    </header>
  );
}
