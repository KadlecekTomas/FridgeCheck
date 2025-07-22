'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/auth/client'

type SectionType = 'fridge' | 'freezer'

type Section = {
  id: string
  name: string
  type: SectionType
}

type Props = {
  onSelect: (id: string) => void
  selectedId?: string | null
  householdId: string
}

export default function FridgeSelector({
  onSelect,
  householdId,
}: Props) {
  const [sections, setSections] = useState<Section[]>([])
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    const fetchSections = async () => {
      const supabase = supabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('storage_units')
        .select('id, name, type')
        .eq('household_id', householdId)

      if (error) {
        console.error('Storage units error:', error.message)
        return
      }

      const all = data as Section[]

      setSections(all)

      const saved = localStorage.getItem(`active_fridge_${householdId}`)
      const defaultId = saved || all?.[0]?.id || ''
      setSelected(defaultId)
      onSelect(defaultId)
    }

    fetchSections()
  }, [householdId])

  const handleSelect = (id: string) => {
    setSelected(id)
    localStorage.setItem(`active_fridge_${householdId}`, id)
    onSelect(id)
  }

  return (
    <div className="mb-4">
      <label className="block font-medium mb-2">Vyber sekci</label>

      {(['fridge', 'freezer'] as const).map((type) => {
        const filtered = sections.filter((s) => s.type === type)
        if (filtered.length === 0) return null

        return (
          <div key={type} className="mb-3">
            <h2 className="text-md font-semibold mb-1">
              {type === 'fridge' ? '🧊 Lednice' : '❄️ Mrazák'}
            </h2>
            <div className="grid gap-2">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className={`border p-2 rounded text-left ${
                    selected === s.id ? 'bg-blue-100 border-blue-500' : ''
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
