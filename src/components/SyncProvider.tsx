import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { ensureLocalOwner } from '@/data/resetLocal';
import { runSync, setOnApplied } from '@/sync/engine';
import { registerSyncHandler } from '@/sync/trigger';

const INTERVAL_MS = 30_000;

/** Runs sync on sign-in, on app foreground, on a timer, and after local changes. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    setOnApplied(() => {
      void qc.invalidateQueries();
    });
    registerSyncHandler(() => {
      void runSync();
    });
  }, [qc]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await ensureLocalOwner(userId);
      if (!cancelled) void runSync();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runSync();
    });
    const timer = setInterval(() => void runSync(), INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  return <>{children}</>;
}
