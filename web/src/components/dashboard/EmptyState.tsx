import Link from 'next/link'

export default function EmptyState({
  title = 'Nic tu zatím není',
  description = 'Přidej si první potraviny, ať můžeš začít sledovat expirace.',
  actionText = 'Přidat potraviny',
  actionHref = '/dashboard/add-fridge',
  fridgeId,
}: {
  title?: string
  description?: string
  actionText?: string
  actionHref?: string
  fridgeId?: string // ← tohle je nový řádek
}) {
  return (
    <div className="text-center border border-dashed rounded p-8 bg-gray-50">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <Link
        href={actionHref}
        className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
      >
        {actionText}
      </Link>
      {fridgeId && (
        <p className="text-xs text-gray-400 mt-4">
          fridgeId: <code>{fridgeId}</code>
        </p>
      )}
    </div>
  )
}
