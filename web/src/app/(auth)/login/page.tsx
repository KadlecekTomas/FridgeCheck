'use client';

import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth/client';

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
      router.push('/foods');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Neznámá chyba při přihlášení');
      }
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Neznámá chyba při přihlášení přes Google');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-green-100 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-6">
        <h1 className="text-3xl font-extrabold text-center text-gray-800">Přihlášení</h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">
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
              <div className="space-y-1">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Field
                  id="email"
                  type="email"
                  name="email"
                  placeholder="např. uzivatel@email.com"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <ErrorMessage name="email" component="div" className="text-sm text-red-500" />
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="text-red-500">
                  Heslo
                </label>
                <Field
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <ErrorMessage name="password" component="div" className="text-sm text-red-500" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
              >
                {loading ? 'Přihlašuji...' : 'Přihlásit se'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">nebo</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full border border-gray-300 bg-white py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center space-x-2 text-sm"
        >
          <span>Přihlásit se pomocí Google</span>
        </button>
      </div>
    </div>
  );
}
