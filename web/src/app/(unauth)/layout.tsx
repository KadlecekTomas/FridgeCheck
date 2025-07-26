import { ReactNode } from 'react'
import { LayoutProvider } from '@/context/LayoutContext'

export default function UnauthLayout({ children }: { children: ReactNode }) {
    return (
        <LayoutProvider layout="unauth">
            {children}
        </LayoutProvider>
    )
}
