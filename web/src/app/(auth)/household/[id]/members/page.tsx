'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'

type HouseholdMemberWithUser = {
    user_id: string
    household_id: string
    role: string | null
    joined_at: string | null
    user: {
        email: string
    }
}


export default function MembersPage() {
    const params = useParams()!
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const router = useRouter()
    const [members, setMembers] = useState<HouseholdMemberWithUser[]>([])
    const [email, setEmail] = useState('')

    useEffect(() => {
        const fetchMembers = async () => {
            const { data, error } = await supabaseBrowser()
                .from('household_members')
                .select('user_id, household_id, role, joined_at, user:profiles!user_id(id)')
                .eq('household_id', id)

            if (!error && data) setMembers(data)
        }

        fetchMembers()
    }, [id])

    const handleAdd = async () => {
        const { data: userData, error } = await supabaseBrowser()
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single()

        if (error || !userData) {
            alert('Uživatel nenalezen')
            return
        }

        await supabaseBrowser().from('household_members').insert({
            household_id: id,
            user_id: userData.id,
        })

        setEmail('')
        router.refresh()
    }

    const handleRemove = async (userId: string) => {
        await supabaseBrowser()
            .from('household_members')
            .delete()
            .match({ household_id: id, user_id: userId })

        router.refresh()
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Správa členů domácnosti</h1>

            <div className="mb-6">
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email nového člena"
                    className="border px-3 py-2 rounded mr-2"
                />
                <button onClick={handleAdd} className="bg-green-500 text-white px-4 py-2 rounded">
                    Přidat
                </button>
            </div>

            {members.map((m) => (
                <div key={m.user_id} className="flex justify-between items-center mb-2">
                    <span>{m.user.email}</span>
                    <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleRemove(m.user_id)}
                    >
                        Odebrat
                    </button>
                </div>
            ))}
        </div>
    )
}
