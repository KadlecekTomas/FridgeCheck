'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'

type Stats = {
  okFoods: number
  expiringFoods: number
  expiredFoods: number
}

export default function StatsOverview({ fridgeId }: { fridgeId: string }) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = supabaseBrowser()

      const { data: foods, error: foodError } = await supabase
        .from('foods')
        .select('expiration_date')
        .eq('storage_unit_id', fridgeId)

      if (foodError) {
        console.error('Chyba při načítání potravin:', foodError.message)
        return
      }

      const now = new Date()
      const soon = new Date()
      soon.setDate(now.getDate() + 3)

      let ok = 0,
        expiring = 0,
        expired = 0

      foods?.forEach((food) => {
        const exp = new Date(food.expiration_date)
        if (exp < now) expired++
        else if (exp <= soon) expiring++
        else ok++
      })

      setStats({
        okFoods: ok,
        expiringFoods: expiring,
        expiredFoods: expired,
      })
    }

    fetchStats()
  }, [fridgeId])

  if (!stats) return <p>Načítání statistik...</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <StatCard title="Lednice" value={1} color="bg-blue-100" icon="🧊" />
      <StatCard title="Potraviny OK" value={stats.okFoods} color="bg-green-100" icon="🟢" />
      <StatCard title="Brzy končí" value={stats.expiringFoods} color="bg-yellow-100" icon="🟡" />
      <StatCard title="Prošlé" value={stats.expiredFoods} color="bg-red-100" icon="🔴" />
    </div>
  )
}

function StatCard({
  title,
  value,
  color,
  icon,
}: {
  title: string
  value: number
  color: string
  icon: string
}) {
  return (
    <div className={`p-4 rounded shadow ${color}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
