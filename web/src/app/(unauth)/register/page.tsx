'use client';

import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/auth/client';

export default function RegisterPage() {
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
      // 1. Vytvoření účtu
      const { error: signUpError } = await supabaseBrowser().auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (signUpError) throw new Error(signUpError.message);

      // 2. Přihlášení (pro jistotu – ne vždy Supabase rovnou přihlásí)
      const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) throw new Error(signInError.message);

      // 3. Redirect
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba při registraci');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-10 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Založ si účet 🥦</h1>
          <p className="text-gray-500 text-base">Začni hlídat expirace potravin</p>
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
                {loading ? 'Zakládám účet...' : 'Zaregistrovat se'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="text-center text-sm text-gray-500 pt-4">
          Máš už účet?{' '}
          <Link href="/login" className="text-green-600 hover:underline font-medium">
            Přihlásit se
          </Link>
        </div>
      </div>
    </div>
  );
}
