'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

type ConfirmDialogProps = {
    title?: string
    description?: string
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    title = 'Smazat položku',
    description = 'Opravdu chceš smazat tuto položku? Tato akce je nevratná.',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <div className="bg-red-100 p-2 rounded-full">
                                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                            <div className="mt-1 text-sm text-gray-600">
                                {description}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
                    >
                        Zrušit
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                        Odstranit
                    </button>
                </div>
            </div>
        </div>
    )
}
