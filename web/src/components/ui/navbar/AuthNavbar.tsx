'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { signOut } from '@/lib/auth/client'
import { Button } from '../button'
import { useEffect } from 'react'
import { useHouseholds } from '@/lib/hooks/useHouseholds'
import { useStorageUnits } from '@/lib/hooks/useStorageUnits'
import { supabaseBrowser } from '@/lib/auth/client'
import { useFoodSummary } from '@/lib/hooks/useFoodSummary';

export default function ResponsiveNavbar() {
    const router = useRouter()
    const { user, loading: userLoading } = useUser()

    const {
        households,
        activeHousehold,
        setActiveHousehold,
        refreshHouseholds,
        loading: householdsLoading,
    } = useHouseholds()

    const {
        units: storageUnits,
        selectedUnitId,
        setSelectedUnitId,
        loading: unitsLoading,
        refreshUnits,
    } = useStorageUnits(activeHousehold?.id || null)

    // ------------------------
    // REFETCH DOMÁCNOSTI + STORAGE UNITS realtime
    // ------------------------
    useEffect(() => {
        const supabase = supabaseBrowser()

        if (!user) return

        const householdChannel = supabase.channel('realtime-household-members').on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'household_members',
                filter: `user_id=eq.${user.id}`,
            },
            () => refreshHouseholds()
        )

        const storageChannel = activeHousehold
            ? supabase
                .channel('realtime-storage-units')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'storage_units',
                        filter: `household_id=eq.${activeHousehold.id}`,
                    },
                    () => refreshUnits()
                )
            : null

        householdChannel.subscribe()
        storageChannel?.subscribe()

        return () => {
            householdChannel.unsubscribe()
            storageChannel?.unsubscribe()
        }
    }, [user?.id, activeHousehold?.id, refreshHouseholds, refreshUnits])

    // ------------------------
    // Handlery
    // ------------------------
    const handleLogout = async () => {
        await signOut()
        router.push('/login')
    }

    const handleSelectHousehold = (id: string) => {
        const h = households.find((h) => h.id === id)
        if (h) {
            setActiveHousehold(h)
            localStorage.setItem('active_household', h.id)
        }
    }

    const handleSelectStorage = (id: string) => {
        setSelectedUnitId(id)
        if (activeHousehold) {
            localStorage.setItem(`active_fridge_${activeHousehold.id}`, id)
        }
    }
    const summary = useFoodSummary(selectedUnitId || null);
    const expired = summary?.expired ?? 0;
    const soon = summary?.soon ?? 0;

    console.log(expired)
    console.log(soon)
    return (
        <nav className="bg-white shadow-md px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
            <div className="text-2xl font-bold text-green-600">
                <Link href="/dashboard">Hlídač jídla</Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center text-sm">
                {/* DOMÁCNOST */}
                <div className="flex flex-col max-w-[160px] truncate">
                    <label className="text-gray-600">Domácnost</label>
                    {householdsLoading ? (
                        <span className="italic text-gray-400">Načítám…</span>
                    ) : households.length > 0 ? (
                        <select
                            value={activeHousehold?.id || ''}
                            onChange={(e) => handleSelectHousehold(e.target.value)}
                            className="border rounded px-2 py-1 w-full truncate"
                        >
                            {households.map((h) => (
                                <option key={h.id} value={h.id}>
                                    {h.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-red-500">Žádná domácnost</span>
                    )}
                </div>

                {/* STORAGE */}
                {activeHousehold && (
                    <div className="flex flex-col max-w-[160px] truncate">
                        <label className="text-gray-600">Prostor</label>
                        {unitsLoading ? (
                            <span className="italic text-gray-400">Načítám…</span>
                        ) : storageUnits.length > 0 ? (
                            <select
                                value={selectedUnitId || ''}
                                onChange={(e) => handleSelectStorage(e.target.value)}
                                className="border rounded px-2 py-1 w-full truncate"
                            >
                                {storageUnits.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-yellow-600">Žádný prostor</span>
                        )}
                    </div>
                )}

                {/* NAVIGACE */}
                {activeHousehold && selectedUnitId && (
                    <>
                        {activeHousehold && selectedUnitId && (
                            <>
                                <Link
                                    href={`/storage/${selectedUnitId}`}
                                    className="text-gray-800 hover:text-green-600 font-medium flex gap-1 items-center"
                                >
                                    Potraviny
                                    <div className="flex gap-3 ml-2 items-center text-sm">
                                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                            Prošlé: {expired ?? 0}
                                        </span>
                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                            Brzy končí: {soon ?? 0}
                                        </span>
                                    </div>
                                </Link>
                                <Link
                                    href={`/foods/new?fridgeId=${selectedUnitId}`}
                                    className="text-gray-800 hover:text-green-600 font-medium"
                                >
                                    Přidat
                                </Link>
                            </>
                        )}
                    </>
                )}

                {/* PROFIL + LOGOUT */}
                {!userLoading && user && (
                    <>
                        <Link href="/profile" className="text-gray-800 hover:underline">
                            {user.email}
                        </Link>
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
    )
}
