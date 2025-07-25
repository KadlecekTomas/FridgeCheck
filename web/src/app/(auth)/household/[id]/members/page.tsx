'use client'

import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import { useEffect, useState, useCallback } from 'react'

type HouseholdMemberWithUser = {
    user_id: string
    household_id: string
    role: 'owner' | 'member' | null
    joined_at: string | null
    user: {
        email: string
    }
}

type HouseholdMemberRowFromView = {
    user_id: string | null
    household_id: string | null
    role: string | null
    joined_at: string | null
    email: string | null
}

export default function MembersPage() {
    const params = useParams()!
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const [members, setMembers] = useState<HouseholdMemberWithUser[]>([])
    const [email, setEmail] = useState('')

    const fetchMembers = useCallback(async () => {
        const { data, error } = await supabaseBrowser()
            .from('household_members_with_email')
            .select('*')
            .eq('household_id', id)

        if (error) {
            console.error('Chyba při načítání členů:', error)
            return
        }

        if (data) {
            const transformed: HouseholdMemberWithUser[] = (data as HouseholdMemberRowFromView[]).map((item) => ({
                user_id: item.user_id ?? '',
                household_id: item.household_id ?? '',
                role: item.role === 'owner' || item.role === 'member' ? item.role : null,
                joined_at: item.joined_at ?? null,
                user: {
                    email: item.email ?? '',
                },
            }))
            setMembers(transformed)
        }
    }, [id])


    useEffect(() => {
        fetchMembers()
    }, [fetchMembers])

    const handleAdd = async () => {
        if (!email.trim()) return alert('Zadej email')

        // 🔁 Oprava: hledáme v `profiles`, ale nejprve potřebujeme rozšířit `profiles` o sloupec `email`
        const { data: userData, error: userError } = await supabaseBrowser()
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (userError || !userData) {
            alert('Uživatel nenalezen')
            return
        }

        const alreadyExists = members.some((m) => m.user_id === userData.id)
        if (alreadyExists) {
            alert('Uživatel je již členem')
            return
        }

        const { error: insertError } = await supabaseBrowser()
            .from('household_members')
            .insert({
                household_id: id,
                user_id: userData.id,
                role: 'member',
            })

        if (insertError) {
            alert('Chyba při přidání člena')
            return
        }

        setEmail('')
        fetchMembers()
    }


    const handleRemove = async (userId: string) => {
        const member = members.find((m) => m.user_id === userId)
        if (member?.role === 'owner') {
            alert('Nelze odebrat vlastníka domácnosti')
            return
        }

        const { error } = await supabaseBrowser()
            .from('household_members')
            .delete()
            .match({ household_id: id, user_id: userId })

        if (error) {
            alert('Chyba při odstraňování člena')
            return
        }

        fetchMembers()
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Správa členů domácnosti</h1>

            <div className="mb-6">
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email nového člena"
                    className="border px-3 py-2 rounded mr-2 w-full max-w-xs"
                />
                <button onClick={handleAdd} className="bg-green-500 text-white px-4 py-2 rounded mt-2">
                    Přidat
                </button>
            </div>

            <div className="space-y-2">
                {members.map((m) => (
                    <div key={m.user_id} className="flex justify-between items-center">
                        <span>{m.user.email}</span>
                        <button
                            className="text-red-600 hover:underline text-sm"
                            onClick={() => handleRemove(m.user_id)}
                        >
                            Odebrat
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
