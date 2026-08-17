'use client'

import clsx from 'clsx'
import { classifyExpiryDate, resolveExpiringDays } from '@/domain/expiry/expiry'

type Props = {
    foods: {
        id: string
        name: string
        expiration_date: string
    }[]
    onFilterChange?: (status: 'ok' | 'expiring' | 'expired' | null) => void
    activeFilter?: 'ok' | 'expiring' | 'expired' | null
}

export function FoodStatusStats({ foods, onFilterChange, activeFilter }: Props) {
    const now = new Date()
    const expiringDays = resolveExpiringDays(process.env.NEXT_PUBLIC_EXPIRING_DAYS)

    let ok = 0
    let expiring = 0
    let expired = 0

    for (const food of foods) {
        const status = classifyExpiryDate(food.expiration_date, expiringDays, now)
        if (status === 'expired') expired++
        else if (status === 'expiring') expiring++
        else ok++
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-center">
            {/* OK */}
            <div className="bg-green-50 rounded-lg p-4">
                <p className="text-2xl font-bold">{ok}</p>
                <p className="text-sm text-gray-700">OK</p>
                {onFilterChange && (
                    <button
                        onClick={() => onFilterChange(activeFilter === 'ok' ? null : 'ok')}
                        className={clsx(
                            'mt-3 px-3 py-1 text-xs font-medium rounded-full transition-colors',
                            activeFilter === 'ok'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                        )}
                    >
                        {activeFilter === 'ok' ? 'Zrušit filtr' : 'Filtrovat'}
                    </button>
                )}
            </div>

            {/* Brzy končí */}
            <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-2xl font-bold">{expiring}</p>
                <p className="text-sm text-gray-700">Brzy končí</p>
                {onFilterChange && (
                    <button
                        onClick={() => onFilterChange(activeFilter === 'expiring' ? null : 'expiring')}
                        className={clsx(
                            'mt-3 px-3 py-1 text-xs font-medium rounded-full transition-colors',
                            activeFilter === 'expiring'
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        )}
                    >
                        {activeFilter === 'expiring' ? 'Zrušit filtr' : 'Filtrovat'}
                    </button>
                )}
            </div>

            {/* Prošlé */}
            <div className="bg-red-50 rounded-lg p-4">
                <p className="text-2xl font-bold">{expired}</p>
                <p className="text-sm text-gray-700">Prošlé</p>
                {onFilterChange && (
                    <button
                        onClick={() => onFilterChange(activeFilter === 'expired' ? null : 'expired')}
                        className={clsx(
                            'mt-3 px-3 py-1 text-xs font-medium rounded-full transition-colors',
                            activeFilter === 'expired'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                        )}
                    >
                        {activeFilter === 'expired' ? 'Zrušit filtr' : 'Filtrovat'}
                    </button>
                )}
            </div>
        </div>
    )
}
