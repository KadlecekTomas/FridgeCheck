'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Food } from '@/types/types'
import { FoodStatusStats } from '@/components/fridge/FoodStatusStats'
import { FoodList } from '@/components/fridge/FoodList'
import EmptyState from '@/components/dashboard/EmptyState'

export function ClientFoodSection({
    unitName,
    createdAt,
    unitId,
    foods,
}: {
    unitName: string
    createdAt: string
    unitId: string
    foods: Food[]
}) {
    const [filter, setFilter] = useState<'expired' | 'expiring' | 'ok' | null>(null)

    const now = new Date()
    const soon = new Date(now)
    soon.setDate(now.getDate() + 3)

    const filteredFoods = foods.filter((f) => {
        const exp = new Date(f.expiration_date)
        if (filter === 'expired') return exp < now
        if (filter === 'expiring') return exp >= now && exp <= soon
        if (filter === 'ok') return exp > soon
        return true
    })

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold">Prostor: {unitName}</h1>
                {foods.length > 0 && (
                    <Link
                        href={`/foods/new?fridgeId=${unitId}`}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                    >
                        Přidat potravinu
                    </Link>
                )}
            </div>

            <p className="text-sm text-gray-500 mb-6">
                Vytvořeno:{' '}
                {createdAt ? new Date(createdAt).toLocaleString() : 'Neznámé'}
            </p>

            <FoodStatusStats
                foods={foods}
                activeFilter={filter}
                onFilterChange={setFilter}
            />

            <div className="text-sm mt-2 text-gray-600 text-center">
                
            </div>

            {filteredFoods.length === 0 ? (
                <EmptyState
                    title="Žádné potraviny"
                    description={
                        filter
                            ? 'Žádné potraviny neodpovídají vybranému filtru.'
                            : 'Přidej do lednice první potraviny a sleduj expiraci!'
                    }
                    actionText="Přidat potraviny"
                    actionHref={`/foods/new?fridgeId=${unitId}`}
                    fridgeId={unitId}
                />
            ) : (
                <FoodList foods={filteredFoods} />
            )}
        </div>
    )
}
