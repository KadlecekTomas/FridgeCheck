'use client';

import { ReactNode, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/auth/client';

export default function ClientLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseBrowser().auth.getSession();
      console.log('Client session:', data.session); 
    };

    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
