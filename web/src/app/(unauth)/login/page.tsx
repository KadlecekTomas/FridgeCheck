'use client';

import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth/client';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initialValues = {
    email: '',
    password: '',
  };

  const validationSchema = Yup.object({
    email: Yup.string().email('Neplatný email').required('Email je povinný'),
    password: Yup.string().min(6, 'Minimálně 6 znaků').required('Heslo je povinné'),
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(values.email, values.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba při přihlášení');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba při přihlášení přes Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-10 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Vítej zpět 👋</h1>
          <p className="text-gray-500 text-base">Přihlas se ke své lednici</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-100 border border-red-300 p-3 rounded-md text-center">
            {error}
          </div>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Field
                  id="email"
                  type="email"
                  name="email"
                  placeholder="např. uzivatel@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm"
                />
                <ErrorMessage name="email" component="div" className="text-sm text-red-500 mt-1" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Heslo
                </label>
                <Field
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm"
                />
                <ErrorMessage name="password" component="div" className="text-sm text-red-500 mt-1" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 transition"
              >
                {loading ? 'Přihlašuji...' : 'Přihlásit se'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-400">nebo</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 border border-gray-300 bg-white rounded-xl flex justify-center items-center text-sm hover:bg-gray-50 transition"
        >
          Přihlásit se pomocí Google
        </button>
        <div className="text-center text-sm text-gray-500 pt-4">
          Nemáš účet?{' '}
          <Link href="/register" className="text-green-600 hover:underline font-medium">
            Zaregistruj se
          </Link>
        </div>
      </div>
    </div>
  );
}
