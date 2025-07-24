'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/auth/client'
import { format } from 'date-fns'
import { useState } from 'react'
import { Food } from '@/types/types'
import { ConfirmDialog } from '../ui/confirmDialog/ConfirmDialog'
import Link from 'next/link'

const EXPIRING_DAYS = parseInt(process.env.NEXT_PUBLIC_EXPIRING_DAYS || '3', 10)
const COLOR_OK = process.env.NEXT_PUBLIC_COLOR_OK
const COLOR_SOON = process.env.NEXT_PUBLIC_COLOR_SOON
const COLOR_EXPIRED = process.env.NEXT_PUBLIC_COLOR_EXPIRED

export function FoodList({ foods }: { foods: Food[] }) {
  const router = useRouter()
  const now = new Date()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)

  const handleDelete = async () => {
    if (!selectedFood) return

    const supabase = supabaseBrowser()
    const { error } = await supabase.from('foods').delete().eq('id', selectedFood.id)

    if (error) {
      toast.error('Chyba při mazání.')
    } else {
      toast.success(`"${selectedFood.name}" bylo odstraněno.`)
      router.refresh()
    }

    setConfirmOpen(false)
    setSelectedFood(null)
  }

  return (
    <div className="space-y-4">
      {foods.map((food) => {
        const expires = new Date(food.expiration_date)
        const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        let bg = COLOR_OK
        if (diffDays < 0) bg = COLOR_EXPIRED
        else if (diffDays <= EXPIRING_DAYS) bg = COLOR_SOON

        return (
          <div key={food.id} className={`p-4 rounded shadow flex justify-between items-center ${bg}`}>
            <div>
              <p className="font-semibold text-black">{food.name}</p>
              <p className="text-sm text-gray-600">Expirace: {format(expires, 'd. M. yyyy')}</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link
                href={`/foods/edit/${food.id}`}
                className="px-3 py-1 rounded text-white bg-blue-600 hover:bg-blue-700"
              >
                Upravit
              </Link>
              <button
                onClick={() => {
                  setSelectedFood(food)
                  setConfirmOpen(true)
                }}
                className="px-3 py-1 rounded text-white bg-red-600 hover:bg-red-700"
              >
                Odebrat
              </button>
            </div>
          </div>
        )
      })}

      {confirmOpen && selectedFood && (
        <ConfirmDialog
          title={`Odebrat "${selectedFood.name}"?`}
          description="Opravdu chceš tuto položku trvale odstranit?"
          onConfirm={handleDelete}
          onCancel={() => {
            setConfirmOpen(false)
            setSelectedFood(null)
          }}
        />
      )}
    </div>
  )
}
