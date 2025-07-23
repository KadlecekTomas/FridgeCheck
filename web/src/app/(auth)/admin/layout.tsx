'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function AdminClientLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkRole = async () => {
            const { data: { session } } = await supabaseBrowser().auth.getSession()

            if (!session) {
                toast.error('Nejsi přihlášený!')
                return router.replace('/dashboard')
            }

            const { data: profile, error } = await supabaseBrowser()
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()

            if (error || profile?.role !== 'admin') {
                toast.error('Nemáš oprávnění k přístupu 🛑')
                return router.replace('/dashboard')
            }

            setLoading(false)
        }

        checkRole()
    }, [router])


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    <p className="text-sm text-gray-600">Načítání oprávnění...</p>
                </div>
            </div>
        )
    }


    return <>{children}</>
}
