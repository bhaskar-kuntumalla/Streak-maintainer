import type { SQLiteDatabase } from 'expo-sqlite';
import { newId } from '@/lib/date';
import type { OpKind } from './schema';
import { requestSync } from './trigger';

export type PendingOp = { opId: string; kind: OpKind; payload: Record<string, unknown>; attempts: number };

/** Must be called inside the same transaction as the local write it describes. */
export async function enqueueOp(db: SQLiteDatabase, kind: OpKind, payload: Record<string, unknown>): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_queue (op_id, kind, payload, attempts, created_at) VALUES (?, ?, ?, 0, ?)',
    [newId(), kind, JSON.stringify(payload), new Date().toISOString()],
  );
  requestSync();
}

export async function listPending(db: SQLiteDatabase, limit: number): Promise<PendingOp[]> {
  const rows = await db.getAllAsync<{ op_id: string; kind: OpKind; payload: string; attempts: number }>(
    'SELECT op_id, kind, payload, attempts FROM sync_queue ORDER BY rowid LIMIT ?',
    [limit],
  );
  return rows.map((r) => ({
    opId: r.op_id,
    kind: r.kind,
    payload: JSON.parse(r.payload) as Record<string, unknown>,
    attempts: r.attempts,
  }));
}

export async function ackOps(db: SQLiteDatabase, opIds: string[]): Promise<void> {
  if (opIds.length === 0) return;
  const marks = opIds.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM sync_queue WHERE op_id IN (${marks})`, opIds);
}

export async function bumpAttempts(db: SQLiteDatabase, opIds: string[]): Promise<void> {
  if (opIds.length === 0) return;
  const marks = opIds.map(() => '?').join(',');
  await db.runAsync(`UPDATE sync_queue SET attempts = attempts + 1 WHERE op_id IN (${marks})`, opIds);
}

export async function countPending(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_queue');
  return row?.n ?? 0;
}
