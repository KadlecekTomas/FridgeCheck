'use client'

import { useEffect, useState } from 'react'

type SectionType = 'fridge' | 'freezer' | string

type Section = {
  id: string
  name: string
  type: SectionType
}

type Props = {
  householdId: string
  selectedId: string | null
  onSelect: (id: string) => void
  units: Section[]
}

export default function FridgeSelector({
  householdId,
  selectedId,
  onSelect,
  units,
}: Props) {
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    const saved = localStorage.getItem(`active_fridge_${householdId}`)
    const defaultId = saved || selectedId || units?.[0]?.id || ''
    setSelected(defaultId)
    onSelect(defaultId)
  }, [householdId, selectedId, units])

  const handleSelect = (id: string) => {
    setSelected(id)
    localStorage.setItem(`active_fridge_${householdId}`, id)
    onSelect(id)
  }

  const sectionLabels: Record<SectionType, string> = {
    fridge: '🧊 Lednice',
    freezer: '❄️ Mrazák',
    pantry: '📦 Spíž',
  }

  const grouped = units.reduce<Record<SectionType, Section[]>>((acc, section) => {
    if (!acc[section.type]) acc[section.type] = []
    acc[section.type].push(section)
    return acc
  }, {})

  return (
    <div className="mb-4">
      <label className="block font-medium mb-2">Vyber sekci</label>
      {Object.entries(grouped).map(([type, units]) => (
        <div key={type} className="mb-3">
          <h2 className="text-md font-semibold mb-1">
            {sectionLabels[type as SectionType] || '🗂️ Jiná sekce'}
          </h2>
          <div className="grid gap-2">
            {units.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`border p-2 rounded text-left ${selected === s.id ? 'bg-blue-100 border-blue-500' : ''}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
