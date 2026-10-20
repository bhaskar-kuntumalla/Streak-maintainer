import type { SQLiteDatabase } from 'expo-sqlite';
import { newId } from '@/lib/date';
import { isRemoteNewer } from './conflict';
import type {
  CheckInRow,
  CompletionRow,
  HabitRow,
  PlanRow,
  PullResponse,
  RewardRow,
  TaskRow,
} from './schema';

async function localStamp(db: SQLiteDatabase, sql: string, params: (string | number)[]): Promise<string | null> {
  const row = await db.getFirstAsync<{ updated_at: string }>(sql, params);
  return row?.updated_at ?? null;
}

async function applyHabit(db: SQLiteDatabase, h: HabitRow) {
  const local = await localStamp(db, 'SELECT updated_at FROM habits WHERE id = ?', [h.id]);
  if (!isRemoteNewer(h.updated_at, local)) return;
  await db.runAsync(
    `INSERT INTO habits (id, name, description, icon, color, category, schedule_type, weekdays,
       interval_days, start_date, end_date, reminder_time, status, pauses, xp_reward, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, icon=excluded.icon,
       color=excluded.color, category=excluded.category, schedule_type=excluded.schedule_type,
       weekdays=excluded.weekdays, interval_days=excluded.interval_days, start_date=excluded.start_date,
       end_date=excluded.end_date, reminder_time=excluded.reminder_time, status=excluded.status,
       pauses=excluded.pauses, updated_at=excluded.updated_at`,
    [
      h.id, h.name, h.description ?? '', h.icon ?? '✨', h.color ?? '#2EE6C5', h.category ?? 'General',
      h.schedule_type, h.weekdays, h.interval_days, h.start_date, h.end_date, h.reminder_time,
      h.status, h.pauses, h.updated_at,
    ],
  );
}

async function applyCompletion(db: SQLiteDatabase, c: CompletionRow) {
  const local = await localStamp(db, 'SELECT updated_at FROM completions WHERE habit_id = ? AND date = ?', [c.habit_id, c.date]);
  if (!isRemoteNewer(c.updated_at, local)) return;
  await db.runAsync(
    `INSERT INTO completions (id, habit_id, date, completed, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(habit_id, date) DO UPDATE SET completed=excluded.completed, updated_at=excluded.updated_at`,
    [newId(), c.habit_id, c.date, c.completed ? 1 : 0, c.updated_at],
  );
}

async function applyTask(db: SQLiteDatabase, t: TaskRow) {
  const local = await localStamp(db, 'SELECT updated_at FROM daily_tasks WHERE id = ?', [t.id]);
  if (!isRemoteNewer(t.updated_at, local)) return;
  if (t.deleted) {
    await db.runAsync('DELETE FROM daily_tasks WHERE id = ?', [t.id]);
    return;
  }
  await db.runAsync(
    `INSERT INTO daily_tasks (id, date, title, duration_minutes, completed, position, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET date=excluded.date, title=excluded.title,
       duration_minutes=excluded.duration_minutes, completed=excluded.completed,
       position=excluded.position, updated_at=excluded.updated_at`,
    [t.id, t.date, t.title, t.duration_minutes, t.completed ? 1 : 0, t.position, t.updated_at],
  );
}

async function applyCheckIn(db: SQLiteDatabase, k: CheckInRow) {
  const local = await localStamp(db, 'SELECT updated_at FROM daily_check_ins WHERE date = ?', [k.date]);
  if (!isRemoteNewer(k.updated_at, local)) return;
  await db.runAsync(
    `INSERT INTO daily_check_ins (date, energy, focus, mood, review, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET energy=excluded.energy, focus=excluded.focus, mood=excluded.mood,
       review=excluded.review, updated_at=excluded.updated_at`,
    [k.date, k.energy, k.focus, k.mood, k.review ?? '', k.updated_at],
  );
}

async function applyPlan(db: SQLiteDatabase, p: PlanRow) {
  const local = await localStamp(db, 'SELECT updated_at FROM weekly_plans WHERE week_start = ?', [p.week_start]);
  if (!isRemoteNewer(p.updated_at, local)) return;
  await db.runAsync(
    `INSERT INTO weekly_plans (week_start, boss_title, boss_completed, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(week_start) DO UPDATE SET boss_title=excluded.boss_title,
       boss_completed=excluded.boss_completed, updated_at=excluded.updated_at`,
    [p.week_start, p.boss_title, p.boss_completed ? 1 : 0, p.updated_at],
  );
}

/** Rewards are immutable by event_id; a revoke removes the local row. */
async function applyReward(db: SQLiteDatabase, r: RewardRow) {
  if (r.revoked) {
    await db.runAsync('DELETE FROM reward_ledger WHERE event_id = ?', [r.event_id]);
    return;
  }
  await db.runAsync(
    'INSERT INTO reward_ledger (event_id, kind, amount, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(event_id) DO NOTHING',
    [r.event_id, r.kind, r.amount, r.updated_at],
  );
}

export async function applyPull(db: SQLiteDatabase, data: PullResponse): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const h of data.habits) await applyHabit(db, h);
    for (const c of data.completions) await applyCompletion(db, c);
    for (const t of data.daily_tasks) await applyTask(db, t);
    for (const k of data.daily_check_ins) await applyCheckIn(db, k);
    for (const p of data.weekly_plans) await applyPlan(db, p);
    for (const r of data.reward_ledger) await applyReward(db, r);
    await db.runAsync(
      "INSERT INTO meta (key, value) VALUES ('sync_cursor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [String(data.cursor)],
    );
  });
}
