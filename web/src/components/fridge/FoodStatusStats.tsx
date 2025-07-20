'use client'

export function FoodStatusStats({ foods }: { foods: any[] }) {
    const now = new Date()
    const soon = new Date(now)
    soon.setDate(now.getDate() + 3)

    const expired = foods.filter(f => new Date(f.expiration_date) < now)
    const expiring = foods.filter(f => {
        const expDate = new Date(f.expiration_date)
        return expDate >= now && expDate <= soon
    })
    const ok = foods.length - expired.length - expiring.length

    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            <StatBox label="OK" count={ok} color="bg-green-100" />
            <StatBox label="Brzy končí" count={expiring.length} color="bg-yellow-100" />
            <StatBox label="Prošlé" count={expired.length} color="bg-red-100" />
        </div>
    )
}

function StatBox({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <div className={`rounded p-4 shadow text-center ${color}`}>
            <div className="text-xl font-bold">{count}</div>
            <div className="text-sm">{label}</div>
        </div>
    )
}
