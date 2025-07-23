'use client'

import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { supabaseBrowser } from '@/lib/auth/client'
import { toast } from 'sonner'
import { useState } from 'react'

const JoinHouseholdSchema = Yup.object().shape({
    invite_code: Yup.string()
        .required('Zadej kód')
        .length(6, 'Kód musí mít 6 znaků')
        .matches(/^[A-Z0-9]{6}$/, 'Neplatný formát kódu'),
})

export function JoinHouseholdInline({ onJoined }: { onJoined?: (householdId: string) => void }) {
    const [joining, setJoining] = useState(false)

    return (
        <div className="p-4 border rounded-md bg-gray-50 shadow-sm">
            <h3 className="text-sm font-semibold mb-2">Připojit se k domácnosti</h3>
            <Formik
                initialValues={{ invite_code: '' }}
                validationSchema={JoinHouseholdSchema}
                onSubmit={async (values, { resetForm }) => {
                    setJoining(true)
                    const supabase = supabaseBrowser()
                    const { data: { session } } = await supabase.auth.getSession()
                    const userId = session?.user?.id

                    if (!userId) {
                        toast.error('Nepřihlášený uživatel')
                        setJoining(false)
                        return
                    }

                    const code = values.invite_code.toUpperCase()

                    // 1. Najdi domácnost
                    const { data: household, error: codeError } = await supabase
                        .from('households')
                        .select('id')
                        .eq('invite_code', code)
                        .single()

                    if (codeError || !household) {
                        toast.error('Neplatný kód domácnosti.')
                        setJoining(false)
                        return
                    }

                    // 2. Zkontroluj, jestli už je členem
                    const { data: existing } = await supabase
                        .from('household_members')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('household_id', household.id)
                        .maybeSingle()

                    if (existing) {
                        toast.error('Už jsi členem této domácnosti.')
                        setJoining(false)
                        return
                    }

                    // 3. Počet členů
                    const { count } = await supabase
                        .from('household_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('household_id', household.id)

                    // 4. Zjisti jestli má premium
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_premium')
                        .eq('id', userId)
                        .single()

                    const limit = profile?.is_premium ? 999 : 5

                    if ((count ?? 0) >= limit) {
                        toast.error(`Tato domácnost je plná (${count}/${limit})`)
                        setJoining(false)
                        return
                    }

                    // 5. Vlož nového člena
                    const { error: insertError } = await supabase
                        .from('household_members')
                        .insert({
                            household_id: household.id,
                            user_id: userId,
                            role: 'member',
                            joined_at: new Date().toISOString(),
                        })

                    if (insertError) {
                        toast.error('Nepodařilo se připojit. Zkus to znovu.')
                    } else {
                        toast.success('Úspěšně připojeno k domácnosti! 🎉')
                        resetForm()
                        onJoined?.(household.id)
                    }

                    setJoining(false)
                }}
            >
                {({ isSubmitting }) => (
                    <Form className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                            <Field
                                type="text"
                                name="invite_code"
                                placeholder="Kód domácnosti"
                                className="w-full px-3 py-2 border rounded"
                            />
                            <ErrorMessage
                                name="invite_code"
                                component="div"
                                className="text-sm text-red-600 mt-1"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
                            disabled={isSubmitting || joining}
                        >
                            {joining ? 'Připojuji...' : 'Připojit se'}
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    )
}
