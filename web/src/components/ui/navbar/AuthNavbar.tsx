'use client';

import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';
import { signOut } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { Button } from '../button';

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
                <Link href="/dashboard" className="text-gray-800 hover:underline">Hlavní stránka</Link>
                <Link href="/storage" className="text-gray-800 hover:underline">Prostory</Link>
            </div>

            <div className="flex items-center space-x-4">
                {!loading && user && (
                    <>
                        <Link href="/profile" className="text-gray-800 hover:underline">{user.email}</Link>
                        <Button
                            onClick={handleLogout}
                            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                            Odhlásit se
                        </Button>
                    </>
                )}
            </div>
        </nav>
    );
}
