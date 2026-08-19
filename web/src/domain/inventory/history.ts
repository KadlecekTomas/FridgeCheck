export type InventoryHistoryEventType =
  | 'purchase'
  | 'consume'
  | 'discard'
  | 'correction'
  | 'move'
  | 'open'

const EVENT_LABELS: Record<InventoryHistoryEventType, string> = {
  purchase: 'Nákup',
  consume: 'Spotřeba',
  discard: 'Vyhození',
  correction: 'Oprava stavu',
  move: 'Přesun',
  open: 'Otevření',
}

const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 3 })

export function inventoryEventLabel(type: InventoryHistoryEventType) {
  return EVENT_LABELS[type]
}

export function formatInventoryEventQuantity(delta: number | null, unit: string | null) {
  if (delta === null || unit === null) return null

  const normalizedUnit = unit === 'pcs' ? 'ks' : unit
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  return `${sign}${numberFormatter.format(Math.abs(delta))} ${normalizedUnit}`
}

export function inventoryEventDirection(delta: number | null) {
  if (delta === null || delta === 0) return 'neutral' as const
  return delta > 0 ? ('increase' as const) : ('decrease' as const)
}
