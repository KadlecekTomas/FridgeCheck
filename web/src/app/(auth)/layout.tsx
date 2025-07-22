// app/dashboard/layout.tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { LayoutProvider } from '@/context/LayoutContext';
import Navbar from '@/components/ui/Navbar';
import ProtectedRoute from '../ProtectedRoute';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }
  return (
    <LayoutProvider layout="auth">
      <ProtectedRoute>
        <Navbar />
        {children}
      </ProtectedRoute>
    </LayoutProvider>
  )
}
