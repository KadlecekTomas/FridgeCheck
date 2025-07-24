'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

export default function NewFoodPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const storageUnitId = searchParams?.get('fridgeId')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [fridgeAccessVerified, setFridgeAccessVerified] = useState(false)

  useEffect(() => {
    const verifyAccess = async () => {
      if (!storageUnitId) {
        setError('Neplatný odkaz – nebyla specifikována lednice.')
        return
      }

      const supabase = supabaseBrowser()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      const currentUser = userData?.user

      if (!currentUser || userError) {
        setError('Nepodařilo se získat informace o uživateli.')
        return
      }

      setUserId(currentUser.id)

      // Získání storage jednotky
      const { data: unit, error: unitError } = await supabase
        .from('storage_units')
        .select('id, household_id, owner_id')
        .eq('id', storageUnitId)
        .single()

      if (unitError || !unit) {
        setError('Úložiště nenalezeno.')
        return
      }

      if (!unit.household_id) {
        setError('Úložiště nemá přiřazenou domácnost.')
        return
      }

      setHouseholdId(unit.household_id)

      const isOwner = unit.owner_id === currentUser.id

      // Nová správná logika: uživatel je buď owner, nebo člen household
      if (isOwner) {
        setFridgeAccessVerified(true)
        return
      }

      console.log(unit.household_id);

      const { data: householdMembership } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', unit.household_id)
        .eq('user_id', currentUser.id)
        .maybeSingle()


      if (householdMembership) {
        setFridgeAccessVerified(true)
      } else {
        setError('Nemáš přístup k tomuto úložišti.')
      }
    }

    verifyAccess()
  }, [storageUnitId])

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
      if (!storageUnitId || !userId || !householdId) {
        setError('Chybí ID lednice, domácnosti nebo uživatele.')
        return
      }

      const supabase = supabaseBrowser()
      const { error } = await supabase.from('foods').insert({
        name: values.name,
        expiration_date: values.expiration_date,
        storage_unit_id: storageUnitId,
        household_id: householdId,
        added_by_user: userId,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push(`/storage/${storageUnitId}`)
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Neznámá chyba při ukládání')
    } finally {
      setSubmitting(false)
      setLoading(false)
    }
  }

  if (!storageUnitId) {
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
