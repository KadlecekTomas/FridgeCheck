'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'

export default function TransferOwnershipPage() {
    const params = useParams()!
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    const router = useRouter()
    const [members, setMembers] = useState<any[]>([])

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabaseBrowser()
                .from('household_members')
                .select('user_id, user:users(email)')
                .eq('household_id', id)

            setMembers(data || [])
        }

        fetch()
    }, [id])

    const handleTransfer = async (newOwnerId: string) => {
        await supabaseBrowser()
            .from('households')
            .update({ owner_id: newOwnerId })
            .eq('id', id)

        router.push('/profile')
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-4">Převést vlastnictví</h1>
            <p className="text-sm text-gray-600 mb-6">
                Vyber nového vlastníka z aktuálních členů domácnosti:
            </p>

            {members.map((m) => (
                <div key={m.user_id} className="flex justify-between items-center mb-3">
                    <span>{m.user.email}</span>
                    <button
                        className="bg-blue-500 text-white px-4 py-1 rounded"
                        onClick={() => handleTransfer(m.user_id)}
                    >
                        Předat vlastnictví
                    </button>
                </div>
            ))}
        </div>
    )
}
