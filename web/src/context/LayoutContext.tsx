'use client'

import { createContext, useContext, ReactNode } from 'react'

type LayoutType = 'auth' | 'unauth'

const LayoutContext = createContext<{ layout: LayoutType }>({ layout: 'unauth' })

export const useLayout = () => useContext(LayoutContext)

export function LayoutProvider({
  children,
  layout,
}: {
  children: ReactNode
  layout: LayoutType
}) {
  return (
    <LayoutContext.Provider value={{ layout }}>
      {children}
    </LayoutContext.Provider>
  )
}
