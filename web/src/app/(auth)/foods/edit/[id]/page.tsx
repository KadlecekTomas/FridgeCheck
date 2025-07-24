'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/auth/client'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { toast } from 'sonner'

export default function EditFoodPage() {
    const router = useRouter()
    const params = useParams()
    const foodId = params?.id as string

    const [loading, setLoading] = useState(true)
    const [initialValues, setInitialValues] = useState({
        name: '',
        expiration_date: '',
        brand: '',
        category: '',
        image_url: '',
        ean_code: '',
    })

    useEffect(() => {
        const fetchFood = async () => {
            const supabase = supabaseBrowser()
            const { data, error } = await supabase
                .from('foods')
                .select('*')
                .eq('id', foodId)
                .single()

            if (error || !data) {
                toast.error('Chyba při načítání potraviny.')
                router.push('/')
                return
            }

            setInitialValues({
                name: data.name || '',
                expiration_date: data.expiration_date || '',
                brand: data.brand || '',
                category: data.category || '',
                image_url: data.image_url || '',
                ean_code: data.ean_code || '',
            })
            setLoading(false)
        }

        if (foodId) fetchFood()
    }, [foodId])

    const validationSchema = Yup.object({
        name: Yup.string().required('Název je povinný'),
        expiration_date: Yup.string().required('Datum expirace je povinné'),
    })

    const handleSubmit = async (
        values: typeof initialValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
    ) => {
        try {
            const supabase = supabaseBrowser()
            const { error } = await supabase
                .from('foods')
                .update({
                    name: values.name,
                    expiration_date: values.expiration_date,
                    brand: values.brand,
                    category: values.category,
                    image_url: values.image_url,
                })
                .eq('id', foodId)

            if (error) {
                toast.error('Chyba při ukládání: ' + error.message)
            } else {
                toast.success('Změny byly uloženy.')
                router.push(`/storage`)
            }
        } catch (err) {
            const error = err as Error
            toast.error(error.message || 'Neznámá chyba při ukládání')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-6 text-center">Načítám data…</div>

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white p-6 rounded shadow">
                <h1 className="text-2xl font-bold mb-4 text-center">Upravit potravinu</h1>

                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ isSubmitting }) => (
                        <Form className="space-y-4">
                            <div>
                                <label className="block font-medium mb-1">Název</label>
                                <Field type="text" name="name" className="w-full border p-2 rounded" />
                                <ErrorMessage name="name" component="div" className="text-sm text-red-500" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Značka</label>
                                <Field type="text" name="brand" className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Kategorie</label>
                                <Field type="text" name="category" className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Obrázek (URL)</label>
                                <Field type="text" name="image_url" className="w-full border p-2 rounded" />
                            </div>
                            <div>
                                <label className="block font-medium mb-1">Datum expirace</label>
                                <Field type="date" name="expiration_date" className="w-full border p-2 rounded" />
                                <ErrorMessage name="expiration_date" component="div" className="text-sm text-red-500" />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-green-600 text-white py-2 rounded"
                            >
                                {isSubmitting ? 'Ukládání…' : 'Uložit změny'}
                            </button>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    )
}
