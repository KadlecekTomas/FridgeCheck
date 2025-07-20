import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../auth/client';
import type { User } from '@supabase/supabase-js';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabaseBrowser().auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    getUser();
  }, []);

  return { user, loading };
};
