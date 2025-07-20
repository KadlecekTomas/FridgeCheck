'use client'

import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'

export function EmptyState({ fridgeId }: { fridgeId: string }) {
  const router = useRouter()

  return (
    <div className="text-center py-16">
      <h2 className="text-xl font-semibold mb-2">Lednice je prázdná</h2>
      <p className="text-gray-500 mb-4">Zatím tu nejsou žádné potraviny. Přidej první!</p>
      <Button onClick={() => router.push(`/add?fridgeId=${fridgeId}`)}>
        Přidat potravinu
      </Button>
    </div>
  )
}
