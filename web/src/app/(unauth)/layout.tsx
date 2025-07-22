import { ReactNode } from 'react'
import { LayoutProvider } from '@/context/LayoutContext'
import Navbar from '@/components/ui/Navbar'

export default function UnauthLayout({ children }: { children: ReactNode }) {
    return (
        <LayoutProvider layout="unauth">
            <Navbar />
            {children}
        </LayoutProvider>
    )
}
