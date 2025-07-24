'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

type UserHouseholdView = {
    id: string | null
    name: string | null
    invite_code: string | null
    created_at: string | null
    owner_id: string | null
    role: 'owner' | 'member' | null
    user_id: string | null
}


export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null)
    const [households, setHouseholds] = useState<UserHouseholdView[] | null>(null)
    const router = useRouter()

    useEffect(() => {
        const loadData = async () => {
            const { data: { user }, error: userError } = await supabaseBrowser().auth.getUser();

            if (userError || !user) {
                console.error("Chyba při získávání uživatele:", userError);
                setUser(null);
                setHouseholds([]);
                return;
            }

            setUser(user);

            const { data, error } = await supabaseBrowser()
                .from('user_households_view')
                .select('*')
                .eq('user_id', user.id);

            if (error || !data) {
                console.error("Chyba při načítání domácností:", error);
                setHouseholds([]);
                return;
            }

            // Filtrovat a přetypovat záznamy
            const validEntries = data.filter(
                (entry): entry is UserHouseholdView =>
                    entry.id !== null &&
                    (entry.role === 'owner' || entry.role === 'member' || entry.role === null)
            );

            const uniqueMap = new Map<string, UserHouseholdView>();

            for (const entry of validEntries) {
                const existing = uniqueMap.get(entry.id!);
                if (!existing || (entry.role === 'owner' && existing.role !== 'owner')) {
                    uniqueMap.set(entry.id!, entry);
                }
            }

            setHouseholds(Array.from(uniqueMap.values()));
        };

        loadData();
    }, []);




    const handleLeaveHousehold = async (householdId: string, ownerId: string) => {
        if (!user) return

        if (user.id === ownerId) {
            alert('Jako vlastník nemůžeš domácnost opustit. Nejdřív převeď vlastnictví nebo ji smaž.')
            return
        }

        await supabaseBrowser()
            .from('household_members')
            .delete()
            .match({ household_id: householdId, user_id: user.id })

        router.refresh()
    }

    const handleDeleteHousehold = async (householdId: string) => {
        if (!confirm('Opravdu chceš smazat tuto domácnost?')) return

        await supabaseBrowser()
            .from('households')
            .delete()
            .match({ id: householdId })

        router.refresh()
    }

    if (!user || households === null) {
        return (
            <div className="max-w-4xl mx-auto py-10 px-4 text-gray-600">
                Načítám údaje...
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-6">Profil uživatele</h1>

            <div className="bg-white shadow rounded p-6 mb-10">
                <p className="text-sm text-gray-500">Email:</p>
                <p className="text-lg font-medium text-gray-800">{user.email}</p>
            </div>

            <h2 className="text-2xl font-semibold mb-4">Moje domácnosti</h2>

            {households.length === 0 ? (
                <p className="text-gray-500">Nejsi členem žádné domácnosti.</p>
            ) : (
                households.map((h) => (
                    <div key={`${h.id}-${h.role}`} className="bg-gray-50 border rounded shadow-sm p-5 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800">{h.name}</h3>
                                <p className="text-sm text-gray-500">Role: {h.role === 'owner' ? 'Vlastník' : 'Člen'}</p>
                            </div>

                            <div className="space-x-2 flex flex-wrap">
                                {h.role === 'owner' ? (
                                    <>
                                        <Link
                                            href={`/household/${h.id}/members`}
                                            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
                                        >
                                            Spravovat členy
                                        </Link>
                                        <Link
                                            href={`/household/${h.id}/transfer`}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded"
                                        >
                                            Převést vlastnictví
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteHousehold(h.id!)}
                                            className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                                        >
                                            Smazat domácnost
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleLeaveHousehold(h.id!, h.owner_id!)}
                                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                                    >
                                        Opustit domácnost
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}
