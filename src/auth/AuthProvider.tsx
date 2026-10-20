import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { clearLocalData } from '@/data/resetLocal';
import { supabaseConfigured } from '@/lib/env';
import { countPending } from '@/sync/outbox';
import { runSync } from '@/sync/engine';
import { getDb } from '@/db/client';
import { supabase } from './supabase';

type AuthValue = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);
export const RESET_REDIRECT = 'streakos://auth/update-password';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));

    // PKCE links (password reset, email confirmation) arrive as ?code=...
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const code = Linking.parse(url).queryParams?.code;
      if (typeof code === 'string') await supabase.auth.exchangeCodeForSession(code);
    };
    void Linking.getInitialURL().then(handleUrl);
    const linkSub = Linking.addEventListener('url', (e) => void handleUrl(e.url));

    return () => {
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const value: AuthValue = {
    session,
    loading,
    configured: supabaseConfigured,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { needsConfirmation: data.session === null };
    },
    signOut: async () => {
      // Refuse to sign out while local changes are unsynced, or they would be lost.
      await runSync();
      const db = await getDb();
      if ((await countPending(db)) > 0) {
        throw new Error('Some changes have not synced yet. Connect to the internet and try again.');
      }
      await clearLocalData();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    requestPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT });
      if (error) throw error;
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
