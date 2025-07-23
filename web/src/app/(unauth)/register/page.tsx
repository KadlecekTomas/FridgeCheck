'use client'

import { useRouter } from 'next/navigation'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { signUpWithEmail, signInWithGoogle, supabaseBrowser } from '@/lib/auth/client'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseBrowser().auth.getSession()
      if (session) {
        setAlreadyLoggedIn(true)
        toast.info('Jsi již přihlášený 👋')
        setTimeout(() => router.replace('/dashboard'), 1500)
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [])

  if (checkingSession || alreadyLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] px-6">
        <div className="text-center text-gray-600 text-lg">Jsi již přihlášený 👋 Přesměrovávám...</div>
      </div>
    )
  }

  const initialValues = {
    email: '',
    password: '',
    confirmPassword: '',
  }

  const validationSchema = Yup.object({
    email: Yup.string().email('Neplatný email').required('Email je povinný'),
    password: Yup.string().min(6, 'Minimálně 6 znaků').required('Heslo je povinné'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Hesla se musí shodovat')
      .required('Potvrzení hesla je povinné'),
  })

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    setLoading(true)
    try {
      await signUpWithEmail(values.email, values.password)
      toast.success('Registrace proběhla úspěšně 🎉')
      router.replace('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Neznámá chyba při registraci')
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }

  const handleGoogleRegister = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Chyba při registraci přes Google')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-10 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Vytvoř si účet 🧊</h1>
          <p className="text-gray-500 text-base">Zaregistruj se a měj lednici pod kontrolou</p>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          validateOnBlur={true}
          validateOnChange={false}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Field
                  id="email"
                  type="email"
                  name="email"
                  placeholder="např. uzivatel@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
                />
                <ErrorMessage name="email" component="div" className="text-sm text-red-500 mt-1" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                <Field
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
                />
                <ErrorMessage name="password" component="div" className="text-sm text-red-500 mt-1" />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Potvrzení hesla</label>
                <Field
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
                />
                <ErrorMessage name="confirmPassword" component="div" className="text-sm text-red-500 mt-1" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 transition"
              >
                {loading ? 'Registruji...' : 'Zaregistrovat se'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-gray-400">nebo</span></div>
        </div>

        <button
          onClick={handleGoogleRegister}
          className="w-full py-3 border border-gray-300 bg-white rounded-xl flex justify-center items-center text-sm hover:bg-gray-50 transition"
        >
          Registrovat přes Google
        </button>

        <div className="text-center text-sm text-gray-500 pt-4">
          Už máš účet? <Link href="/login" className="text-green-600 hover:underline font-medium">Přihlas se</Link>
        </div>
      </div>
    </div>
  )
}
