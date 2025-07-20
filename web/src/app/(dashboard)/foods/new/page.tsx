'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

export default function NewFoodPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fridgeId = searchParams?.get('fridgeId')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [fridgeAccessVerified, setFridgeAccessVerified] = useState(false)

  useEffect(() => {
    const verifyAccess = async () => {
      if (!fridgeId) {
        return (
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">Neplatný odkaz – nebyla specifikována lednice.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-green-600 hover:underline"
            >
              ← Zpět na hlavní stránku
            </button>
          </div>
        )
      }


      const supabase = supabaseBrowser()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      const currentUser = userData?.user

      if (!currentUser || userError) {
        setError('Nepodařilo se získat informace o uživateli.')
        return
      }

      setUserId(currentUser.id)

      // Check if user is owner
      const { data: fridge, error: fridgeError } = await supabase
        .from('fridges')
        .select('*')
        .eq('id', fridgeId)
        .single()

      if (fridgeError || !fridge) {
        setError('Lednice nenalezena.')
        return
      }

      const isOwner = fridge.owner_id === currentUser.id

      if (isOwner) {
        setFridgeAccessVerified(true)
        return
      }

      // Otherwise check if user is member
      const { data: membership } = await supabase
        .from('fridge_members')
        .select('*')
        .eq('fridge_id', fridgeId)
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (membership) {
        setFridgeAccessVerified(true)
      } else {
        setError('Nemáš přístup k této lednici.')
      }
    }

    verifyAccess()
  }, [fridgeId])

  const initialValues = {
    name: '',
    expiration_date: '',
  }

  const validationSchema = Yup.object({
    name: Yup.string().required('Název je povinný'),
    expiration_date: Yup.string().required('Datum expirace je povinné'),
  })

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    setError(null)
    setLoading(true)

    try {
      if (!fridgeId || !userId) {
        setError('Chybí ID lednice nebo uživatele.')
        return
      }

      const supabase = supabaseBrowser()
      const { error } = await supabase.from('foods').insert({
        name: values.name,
        expiration_date: values.expiration_date,
        fridge_id: fridgeId,
        added_by_user: userId,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push(`/fridge/${fridgeId}`)
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Neznámá chyba při ukládání')
    } finally {
      setSubmitting(false)
      setLoading(false)
    }
  }

  if (!fridgeId) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">Neplatný odkaz – nebyla specifikována lednice.</p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-green-600 hover:underline"
        >
          ← Zpět na hlavní stránku
        </button>
      </div>
    )
  }

  if (!fridgeAccessVerified && !error) {
    return (
      <div className="p-6 text-center text-gray-500">
        Ověřuji přístup k lednici...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Přidat potravinu</h1>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-100 p-2 rounded">
            {error}
          </div>
        )}

        {fridgeAccessVerified && (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Název</label>
                  <Field
                    type="text"
                    name="name"
                    className="w-full border p-2 rounded"
                    placeholder="Např. Mléko"
                  />
                  <ErrorMessage name="name" component="div" className="text-sm text-red-500" />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Datum expirace</label>
                  <Field
                    type="date"
                    name="expiration_date"
                    className="w-full border p-2 rounded"
                  />
                  <ErrorMessage
                    name="expiration_date"
                    component="div"
                    className="text-sm text-red-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  {loading ? 'Ukládání...' : 'Přidat potravinu'}
                </button>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  )
}
