'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'

export default function AdminPage() {
  const [stats, setStats] = useState({ users: 0, households: 0, foods: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: userCount }, { count: householdCount }, { count: foodCount }] = await Promise.all([
        supabaseBrowser().from('profiles').select('*', { count: 'exact', head: true }),
        supabaseBrowser().from('households').select('*', { count: 'exact', head: true }),
        supabaseBrowser().from('foods').select('*', { count: 'exact', head: true }),
      ])
      setStats({ users: userCount ?? 0, households: householdCount ?? 0, foods: foodCount ?? 0 })
    }

    fetchStats()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin dashboard</h1>
      <div className="space-y-2">
        <p>👤 Uživatelé: {stats.users}</p>
        <p>🏠 Domácnosti: {stats.households}</p>
        <p>🥫 Položky v lednicích: {stats.foods}</p>
      </div>
    </div>
  )
}
