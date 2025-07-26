'use client';

import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { signInWithEmail, signInWithGoogle, supabaseBrowser } from '@/lib/auth/client';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (session) {
        setAlreadyLoggedIn(true);
        toast.info('Jsi již přihlášený 👋');
        setTimeout(() => router.replace('/dashboard'), 1500);
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  if (checkingSession || alreadyLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-green-50 px-6">
        <div className="text-center text-gray-600 text-lg">Jsi již přihlášený 👋 Přesměrovávám...</div>
      </div>
    );
  }

  const initialValues = { email: '', password: '' };

  const validationSchema = Yup.object({
    email: Yup.string().email('Neplatný email').required('Email je povinný'),
    password: Yup.string().min(6, 'Minimálně 6 znaků').required('Heslo je povinné'),
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    setLoading(true);
    try {
      await signInWithEmail(values.email, values.password);
      toast.success('Přihlášení proběhlo úspěšně 🎉');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Neznámá chyba při přihlášení');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Chyba při přihlášení přes Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-green-50 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 space-y-6 border border-green-100"
      >
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Vítej zpět 👋</h1>
          <p className="text-gray-500 text-base">Přihlas se ke své lednici</p>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          validateOnBlur
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <ErrorMessage name="email" component="div" className="text-sm text-red-500 mt-1" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
                <div className="relative">
                  <Field
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <ErrorMessage name="password" component="div" className="text-sm text-red-500 mt-1" />
              </div>

              <div className="text-right text-sm">
                <Link href="/forgot-password" className="text-green-600 hover:underline">Zapomenuté heslo?</Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-95"
              >
                {loading ? 'Přihlašuji...' : 'Přihlásit se'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gray-400">nebo</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 border border-gray-300 bg-white rounded-xl flex justify-center items-center text-sm font-medium hover:bg-gray-50 transition-transform hover:scale-[1.01] active:scale-95"
        >
          Přihlásit se pomocí Google
        </button>

        <div className="text-center text-sm text-gray-500 pt-4">
          Nemáš účet?{' '}
          <Link href="/register" className="text-green-600 hover:underline font-semibold">
            Zaregistruj se
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
