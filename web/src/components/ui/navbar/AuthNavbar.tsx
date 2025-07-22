'use client';

import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';
import { signOut } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export default function AuthNavbar() {
    const { user, loading } = useUser();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <nav className="bg-white shadow p-4 flex justify-between items-center mb-6">
            <div className="flex space-x-4">
                <Link href="/dashboard" className="text-gray-800 hover:underline">dashboard</Link>
                <Link href="/storage" className="text-gray-800 hover:underline">Fridge</Link>
            </div>

            <div className="flex items-center space-x-4">
                {!loading && user && (
                    <>
                        <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
                        <button
                            onClick={handleLogout}
                            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                            Odhlásit se
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
