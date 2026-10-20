import { getDb } from '@/db/client';

const TABLES = ['habits', 'completions', 'daily_tasks', 'daily_check_ins', 'weekly_plans', 'reward_ledger', 'sync_queue'];

/** Clears account data and sync state. User settings in meta are kept across accounts. */
export async function clearLocalData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of TABLES) await db.runAsync(`DELETE FROM ${t}`);
    await db.runAsync("DELETE FROM meta WHERE key <> 'settings'");
  });
}

/** Local data belongs to one account. Switching accounts on a device clears it first. */
export async function ensureLocalOwner(userId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'owner_id'");
  if (row && row.value !== userId) await clearLocalData();
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES ('owner_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [userId],
  );
}
