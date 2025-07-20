'use client';

import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/auth/client';

export default function NewFoodPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initialValues = {
    name: '',
    expiration_date: '',
  };

  const validationSchema = Yup.object({
    name: Yup.string().required('Název je povinný'),
    expiration_date: Yup.string().required('Datum expirace je povinné'),
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    setError(null);
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from('foods').insert({
        name: values.name,
        expiration_date: values.expiration_date,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/foods');
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Neznámá chyba při ukládání');
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Přidat potravinu</h1>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-100 p-2 rounded">
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
      </div>
    </div>
  );
}
