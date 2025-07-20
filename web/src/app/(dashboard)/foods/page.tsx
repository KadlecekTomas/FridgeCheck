'use client';

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { Database } from '@/types/supabase';

type Food = Database['public']['Tables']['foods']['Row'];

export default function FoodListPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFoods = async () => {
            setLoading(true);

            const { data, error } = await supabase
                .from('foods')
                .select('*')
                .order('expiration_date', { ascending: true });

            if (error) console.error(error);
            else setFoods(data);

            setLoading(false);
        };
        fetchFoods();
    }, []);


    if (loading) return <div className="p-4">Načítání...</div>;

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-bold">Potraviny</h1>
            {foods.map((food) => (
                <div
                    key={food.id}
                    className="p-4 border rounded shadow-sm flex justify-between items-center"
                >
                    <div>
                        <p className="font-semibold">{food.name}</p>
                        <p className="text-sm text-gray-500">
                            Expirace: {format(new Date(food.expiration_date), 'dd.MM.yyyy')}
                        </p>
                    </div>
                    <StatusBadge expirationDate={food.expiration_date} />
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ expirationDate }: { expirationDate: string }) {
    const daysLeft =
        (new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);

    if (daysLeft < 0) return <span className="text-red-600 font-bold">Prošlé</span>;
    if (daysLeft < 3) return <span className="text-yellow-600 font-bold">Brzy</span>;
    return <span className="text-green-600 font-bold">OK</span>;
}
