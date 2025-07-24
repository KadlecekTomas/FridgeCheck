'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { BrowserMultiFormatReader } from '@zxing/browser';
import Image from 'next/image';
import { toast } from 'sonner';

interface OpenFoodProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  image_url?: string;
}

export default function NewFoodPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageUnitId = searchParams?.get('fridgeId');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [fridgeAccessVerified, setFridgeAccessVerified] = useState(false);
  const [ean, setEan] = useState('');
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState<OpenFoodProduct | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!storageUnitId) return setError('Neplatný odkaz – chybí ID lednice.');

      const supabase = supabaseBrowser();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const currentUser = userData?.user;
      if (!currentUser || userError) return setError('Nepodařilo se získat informace o uživateli.');
      setUserId(currentUser.id);

      const { data: unit, error: unitError } = await supabase
        .from('storage_units')
        .select('id, household_id, owner_id')
        .eq('id', storageUnitId)
        .single();
      if (unitError || !unit) return setError('Úložiště nenalezeno.');
      if (!unit.household_id) return setError('Úložiště nemá přiřazenou domácnost.');

      setHouseholdId(unit.household_id);

      if (unit.owner_id === currentUser.id) return setFridgeAccessVerified(true);

      const { data: membership } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', unit.household_id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (membership) setFridgeAccessVerified(true);
      else setError('Nemáš přístup k tomuto úložišti.');
    };

    verifyAccess();
  }, [storageUnitId]);

  const fetchProduct = async (eanCode: string) => {
    setApiLoading(true);
    setError(null);
    setProduct(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_OPENFOOD_API || 'https://world.openfoodfacts.org';
      const response = await fetch(`${API_URL}/api/v0/product/${eanCode}.json`);
      const data = await response.json();
      if (data.status === 1) {
        setProduct(data.product);
        toast.success('Produkt byl úspěšně načten.');
      } else {
        setError('Produkt nebyl nalezen v databázi.');
        toast.error('Produkt nebyl nalezen v databázi.');
      }
    } catch {
      setError('Chyba při načítání produktu z API.');
      toast.error('Chyba při načítání produktu.');
    } finally {
      setApiLoading(false);
    }
  };

  const handleManualEanLookup = () => {
    if (ean) fetchProduct(ean);
  };

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const codeReader = new BrowserMultiFormatReader();
      const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      const selectedDeviceId = videoDevices[0]?.deviceId;
      if (!selectedDeviceId) throw new Error('Nebyla nalezena žádná kamera.');

      const result = await codeReader.decodeOnceFromVideoDevice(selectedDeviceId, 'video-preview');
      setEan(result.getText());
      fetchProduct(result.getText());
      (codeReader as unknown as { reset?: () => void }).reset?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Nepodařilo se načíst kód.';
      setError(message);
      toast.error(message);
    } finally {
      setScanning(false);
    }
  };

  const initialValues = useMemo(() => ({
    name: product?.product_name || '',
    expiration_date: '',
    brand: product?.brands || '',
    category: product?.categories_tags?.[0] || product?.categories?.split(',')[0] || '',
    image_url: product?.image_url || '',
    ean_code: ean || '',
  }), [product, ean]);

  const validationSchema = Yup.object({
    name: Yup.string().required('Název je povinný'),
    expiration_date: Yup.string().required('Datum expirace je povinné'),
  });

  const handleSubmit = async (values: typeof initialValues, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    setError(null);
    setLoading(true);
    try {
      if (!storageUnitId || !userId || !householdId) {
        toast.error('Chybí ID lednice, domácnosti nebo uživatele.');
        return setError('Chybí některé ID.');
      }

      const supabase = supabaseBrowser();
      const { error } = await supabase.from('foods').insert({
        name: values.name,
        expiration_date: values.expiration_date,
        brand: values.brand,
        category: values.category,
        image_url: values.image_url,
        ean_code: values.ean_code,
        storage_unit_id: storageUnitId,
        household_id: householdId,
        added_by_user: userId,
      });


      if (error) {
        toast.error('Chyba při ukládání: ' + error.message);
        setError(error.message);
      } else {
        toast.success('Potravina byla úspěšně přidána.');
        router.push(`/storage/${storageUnitId}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Nepodařilo se načíst kód.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  if (!storageUnitId) return <div className="p-6 text-center">Chybí ID lednice.</div>;
  if (!fridgeAccessVerified && !error) return <div className="p-6 text-center">Ověřuji přístup…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Přidat potravinu</h1>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-2 rounded">{error}</div>}

        <div className="mb-4">
          <label className="block font-medium mb-1">Zadej nebo naskenuj EAN kód</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ean}
              onChange={(e) => setEan(e.target.value)}
              placeholder="EAN kód"
              className="flex-1 border p-2 rounded"
            />
            <button
              onClick={handleManualEanLookup}
              disabled={!ean || apiLoading}
              className="bg-blue-600 text-white px-3 py-2 rounded"
            >
              Ověřit
            </button>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="bg-gray-600 text-white px-3 py-2 rounded"
            >
              {scanning ? 'Skenuji…' : '📷'}
            </button>
          </div>
          {scanning && <video id="video-preview" width={250} height={180} autoPlay muted playsInline className="rounded border my-2" />}
          {apiLoading && <p className="text-sm text-gray-500 mt-2">Načítám produkt…</p>}
        </div>

        {product && (
          <div className="mb-4 border p-2 rounded bg-gray-50">
            <div className="flex gap-2 items-center">
              {product.image_url && <Image
                src={product.image_url}
                alt="obrázek"
                width={64}
                height={64}
                className="h-16 w-16 object-cover rounded"
              />
              }
              <div>
                <p className="font-semibold">{product.product_name}</p>
                <p className="text-xs text-gray-500">{product.brands}</p>
              </div>
            </div>
          </div>
        )}

        <Formik
          enableReinitialize
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
                <Field as="select" name="category" className="w-full border p-2 rounded">
                  {product?.categories_tags?.slice(0, 3).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="">Jiná / nezadáno</option>
                </Field>
              </div>
              {!product?.image_url && (
                <div>
                  <label className="block font-medium mb-1">Obrázek (URL)</label>
                  <Field type="text" name="image_url" className="w-full border p-2 rounded" />
                </div>
              )}
              <div>
                <label className="block font-medium mb-1">Datum expirace</label>
                <Field type="date" name="expiration_date" className="w-full border p-2 rounded" />
                <ErrorMessage name="expiration_date" component="div" className="text-sm text-red-500" />
              </div>
              <button type="submit" disabled={isSubmitting || loading} className="w-full bg-green-600 text-white py-2 rounded">
                {loading ? 'Ukládání…' : 'Přidat potravinu'}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
