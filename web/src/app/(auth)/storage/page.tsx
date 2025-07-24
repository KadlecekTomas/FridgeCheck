'use client'

import { useHouseholds } from '@/lib/hooks/useHouseholds';
import { useStorageUnits } from '@/lib/hooks/useStorageUnits';
import Link from 'next/link';

export default function StoragePage() {
  const {
    households,
    activeHousehold,
    setActiveHousehold,
    loading: householdsLoading,
  } = useHouseholds();
  const {
    units: storageUnits,
    loading: unitsLoading,
  } = useStorageUnits(activeHousehold?.id || null);

  const loading = householdsLoading || unitsLoading;

  if (loading) return <div className="p-6">Načítání...</div>;

  if (!households.length) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">Nemáš žádnou domácnost.</p>
        <Link
          href="/dashboard/new-household"
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Vytvořit domácnost
        </Link>
      </div>
    );
  }

  if (!activeHousehold) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">Vyber domácnost pro zobrazení lednic:</p>
        <select
          className="border border-gray-300 rounded-md px-4 py-2"
          onChange={e => {
            const h = households.find(h => h.id === e.target.value) || null;
            setActiveHousehold(h);
          }}
          value={''}
        >
          <option value="" disabled>Vyber domácnost</option>
          {households.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="relative p-6">
      {/* Overlay loader */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600" />
        </div>
      )}
      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Lednice pro domácnost: {activeHousehold.name}</h1>
            <label htmlFor="household-select" className="text-sm font-medium mr-2">Změnit domácnost:</label>
            <select
              id="household-select"
              className="border border-gray-300 rounded-md px-4 py-2"
              value={activeHousehold.id}
              onChange={e => {
                const h = households.find(h => h.id === e.target.value) || null;
                setActiveHousehold(h);
              }}
            >
              {households.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <Link
            href="/storage/new"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Přidat lednici
          </Link>
        </div>

        {storageUnits.length === 0 ? (
          <p>Nemáš žádné lednice v této domácnosti. Přidej si první!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storageUnits.map((unit) => (
              <Link
                key={unit.id}
                href={`/storage/${unit.id}`}
                className="border rounded p-4 hover:shadow-md transition"
              >
                <h2 className="text-lg font-semibold">{unit.name}</h2>
                <p className="text-sm text-gray-600">Klikni pro detaily</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
