import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../auth/client';
import type { User, Session } from '@supabase/supabase-js';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabaseBrowser().auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  return { user, session, loading };
};
