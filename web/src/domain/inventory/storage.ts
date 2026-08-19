export type StorageType = 'fridge' | 'freezer' | 'pantry' | 'cabinet' | 'other'

const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  fridge: 'Lednice',
  freezer: 'Mrazák',
  pantry: 'Spíž',
  cabinet: 'Skříňka',
  other: 'Jiné',
}

export function storageTypeLabel(type: StorageType) {
  return STORAGE_TYPE_LABELS[type]
}

export function storageDeletionBlockReason({
  totalStorageUnits,
  referencedBatchCount,
}: {
  totalStorageUnits: number
  referencedBatchCount: number
}) {
  if (totalStorageUnits <= 1) {
    return 'Domácnost musí mít alespoň jedno místo pro jídlo.'
  }

  if (referencedBatchCount > 0) {
    return 'Tohle místo už je v historii zásob. Můžeš ho přejmenovat, ale ne smazat.'
  }

  return null
}
