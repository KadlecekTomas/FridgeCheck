'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'

type Fridge = {
  id: string
  name: string
}

type Props = {
  onSelect: (fridgeId: string) => void
}

export default function FridgeSelector({ onSelect }: Props) {
  const [fridges, setFridges] = useState<Fridge[]>([])
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    const fetchFridges = async () => {
      const supabase = supabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) return

      const { data, error } = await supabase
        .from('fridges')
        .select('id, name')
        .eq('owner_id', session.user.id)

      if (error) console.error(error.message)
      else {
        setFridges(data || [])

        const saved = localStorage.getItem('active_fridge')
        const defaultId = saved || data?.[0]?.id || ''
        setSelected(defaultId)
        onSelect(defaultId)
      }
    }

    fetchFridges()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fridgeId = e.target.value
    setSelected(fridgeId)
    localStorage.setItem('active_fridge', fridgeId)
    onSelect(fridgeId)
  }

  return (
    <div className="mb-4">
      <label className="block font-medium mb-1">Vyber lednici</label>
      <select
        value={selected}
        onChange={handleChange}
        className="w-full p-2 border rounded"
      >
        {fridges.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  )
}
