import { getDb } from '@/db/client';
import { getSettings } from '@/settings/store';
import { buildExportPayload } from '@/domain/exportData';

export async function collectExport(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const [habits, completions, dailyTasks, checkIns, weeklyPlans, rewards] = await Promise.all([
    db.getAllAsync('SELECT * FROM habits'),
    db.getAllAsync('SELECT * FROM completions'),
    db.getAllAsync('SELECT * FROM daily_tasks'),
    db.getAllAsync('SELECT * FROM daily_check_ins'),
    db.getAllAsync('SELECT * FROM weekly_plans'),
    db.getAllAsync('SELECT * FROM reward_ledger'),
  ]);
  return buildExportPayload({
    exportedAt: new Date().toISOString(),
    habits,
    completions,
    dailyTasks,
    checkIns,
    weeklyPlans,
    rewards,
    settings: getSettings(),
  });
}
