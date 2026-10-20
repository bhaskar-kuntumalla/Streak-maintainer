import * as Network from 'expo-network';
import { supabase } from '@/auth/supabase';
import { getDb } from '@/db/client';
import { applyPull } from './apply';
import { nextDelayMs } from './backoff';
import { ackOps, bumpAttempts, countPending, listPending } from './outbox';
import { pullSchema, pushResultSchema } from './schema';
import { setStatus } from './status';

const BATCH = 50;

let inFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let onApplied: (() => void) | null = null;

export function setOnApplied(fn: () => void): void {
  onApplied = fn;
}

/** Single-flight: concurrent callers share one run. */
export function runSync(): Promise<void> {
  if (!inFlight) {
    inFlight = doSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function isOnline(): Promise<boolean> {
  const s = await Network.getNetworkStateAsync();
  return s.isConnected !== false && s.isInternetReachable !== false;
}

async function doSync(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const db = await getDb();
  if (!session.session) {
    setStatus({ state: 'signed_out', pending: await countPending(db) });
    return;
  }
  if (!(await isOnline())) {
    setStatus({ state: 'offline', pending: await countPending(db) });
    return;
  }

  setStatus({ state: 'syncing', pending: await countPending(db) });
  try {
    await pushPending();
    await pullChanges();
    failures = 0;
    setStatus({
      state: 'synced',
      pending: await countPending(db),
      lastSyncedAt: new Date().toISOString(),
    });
    onApplied?.();
  } catch (err) {
    failures += 1;
    setStatus({
      state: 'error',
      pending: await countPending(db),
      message: err instanceof Error ? err.message : 'Sync failed',
    });
    scheduleRetry();
  }
}

function scheduleRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void runSync();
  }, nextDelayMs(failures));
}

async function pushPending(): Promise<void> {
  const db = await getDb();
  for (;;) {
    const ops = await listPending(db, BATCH);
    if (ops.length === 0) return;

    const { data, error } = await supabase.rpc('sync_push', {
      ops: ops.map((o) => ({ opId: o.opId, kind: o.kind, payload: o.payload })),
    });
    if (error) {
      await bumpAttempts(db, ops.map((o) => o.opId));
      throw new Error(error.message);
    }
    const result = pushResultSchema.parse(data);
    if (result.acked.length === 0) throw new Error('Server acknowledged no operations');
    // Acked ops are removed. Ops the server reported as conflicts are still acked:
    // the server kept its newer row, and the next pull brings that row down.
    await ackOps(db, result.acked);
  }
}

async function pullChanges(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'sync_cursor'");
  const cursor = Number(row?.value ?? 0);
  const { data, error } = await supabase.rpc('sync_pull', { p_cursor: cursor });
  if (error) throw new Error(error.message);
  await applyPull(db, pullSchema.parse(data));
}
