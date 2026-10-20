import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/client';
import { newId } from '@/lib/date';
import { BIG3_XP, MAX_BIG3 } from '@/domain/planning';
import { enqueueOp } from '@/sync/outbox';

export type DailyTask = {
  id: string;
  date: string;
  title: string;
  durationMinutes: number | null;
  completed: boolean;
};

export type CheckIn = {
  date: string;
  energy: number | null;
  focus: number | null;
  mood: number | null;
  review: string;
};

export type WeekPlan = { weekStart: string; bossTitle: string; bossCompleted: boolean };

const BOSS_REWARD_XP = 100;
const nowIso = () => new Date().toISOString();

type TaskRow = {
  id: string;
  date: string;
  title: string;
  duration_minutes: number | null;
  completed: number;
  position: number;
  updated_at: string;
};
type CheckInRow = {
  date: string;
  energy: number | null;
  focus: number | null;
  mood: number | null;
  review: string | null;
  updated_at: string;
};
type PlanRow = { week_start: string; boss_title: string | null; boss_completed: number; updated_at: string };

async function enqueueTask(db: SQLiteDatabase, id: string): Promise<void> {
  const r = await db.getFirstAsync<TaskRow>('SELECT * FROM daily_tasks WHERE id = ?', [id]);
  if (!r) return;
  await enqueueOp(db, 'task.upsert', {
    id: r.id,
    date: r.date,
    title: r.title,
    duration_minutes: r.duration_minutes,
    completed: r.completed === 1,
    position: r.position,
    updated_at: r.updated_at,
  });
}

async function enqueueCheckIn(db: SQLiteDatabase, date: string): Promise<void> {
  const r = await db.getFirstAsync<CheckInRow>('SELECT * FROM daily_check_ins WHERE date = ?', [date]);
  if (!r) return;
  await enqueueOp(db, 'checkin.upsert', {
    date: r.date,
    energy: r.energy,
    focus: r.focus,
    mood: r.mood,
    review: r.review ?? '',
    updated_at: r.updated_at,
  });
}

async function enqueueWeekPlan(db: SQLiteDatabase, weekStart: string): Promise<void> {
  const r = await db.getFirstAsync<PlanRow>('SELECT * FROM weekly_plans WHERE week_start = ?', [weekStart]);
  if (!r) return;
  await enqueueOp(db, 'weekplan.upsert', {
    week_start: r.week_start,
    boss_title: r.boss_title ?? '',
    boss_completed: r.boss_completed === 1,
    updated_at: r.updated_at,
  });
}

export async function listTasks(start: string, end: string): Promise<DailyTask[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM daily_tasks WHERE date BETWEEN ? AND ? ORDER BY date, position',
    [start, end],
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    title: r.title,
    durationMinutes: r.duration_minutes,
    completed: r.completed === 1,
  }));
}

export async function addTask(date: string, title: string, durationMinutes: number | null): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM daily_tasks WHERE date = ?', [date]);
    const count = row?.n ?? 0;
    if (count >= MAX_BIG3) throw new Error(`Only ${MAX_BIG3} Big 3 tasks per day`);
    const id = newId();
    await db.runAsync(
      'INSERT INTO daily_tasks (id, date, title, duration_minutes, completed, position, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
      [id, date, title, durationMinutes, count, nowIso()],
    );
    await enqueueTask(db, id);
  });
}

export async function updateTask(id: string, title: string, durationMinutes: number | null): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE daily_tasks SET title = ?, duration_minutes = ?, updated_at = ? WHERE id = ?', [
      title,
      durationMinutes,
      nowIso(),
      id,
    ]);
    await enqueueTask(db, id);
  });
}

/** Grants or revokes a one-time reward. Only queues an op when the local row changed. */
async function setReward(db: SQLiteDatabase, eventId: string, kind: string, amount: number, grant: boolean): Promise<void> {
  if (grant) {
    const res = await db.runAsync(
      'INSERT OR IGNORE INTO reward_ledger (event_id, kind, amount, created_at) VALUES (?, ?, ?, ?)',
      [eventId, kind, amount, nowIso()],
    );
    if (res.changes === 1) {
      await enqueueOp(db, 'reward.grant', { event_id: eventId, kind, amount, updated_at: nowIso() });
    }
  } else {
    const res = await db.runAsync('DELETE FROM reward_ledger WHERE event_id = ?', [eventId]);
    if (res.changes > 0) {
      await enqueueOp(db, 'reward.revoke', { event_id: eventId, updated_at: nowIso() });
    }
  }
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE daily_tasks SET completed = ?, updated_at = ? WHERE id = ?', [
      completed ? 1 : 0,
      nowIso(),
      id,
    ]);
    await enqueueTask(db, id);
    await setReward(db, `big3:${id}`, 'big3_task', BIG3_XP, completed);
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM daily_tasks WHERE id = ?', [id]);
    await enqueueOp(db, 'task.delete', { id, updated_at: nowIso() });
    await setReward(db, `big3:${id}`, 'big3_task', BIG3_XP, false);
  });
}

export async function listCheckIns(start: string, end: string): Promise<CheckIn[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CheckInRow>('SELECT * FROM daily_check_ins WHERE date BETWEEN ? AND ?', [
    start,
    end,
  ]);
  return rows.map((r) => ({
    date: r.date,
    energy: r.energy,
    focus: r.focus,
    mood: r.mood,
    review: r.review ?? '',
  }));
}

export async function saveCheckIn(
  date: string,
  patch: Partial<Pick<CheckIn, 'energy' | 'focus' | 'mood' | 'review'>>,
): Promise<void> {
  const db = await getDb();
  const existing = (await listCheckIns(date, date))[0] ?? { date, energy: null, focus: null, mood: null, review: '' };
  const next = { ...existing, ...patch };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO daily_check_ins (date, energy, focus, mood, review, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET energy=excluded.energy, focus=excluded.focus,
         mood=excluded.mood, review=excluded.review, updated_at=excluded.updated_at`,
      [date, next.energy, next.focus, next.mood, next.review, nowIso()],
    );
    await enqueueCheckIn(db, date);
  });
}

export async function getWeekPlan(weekStart: string): Promise<WeekPlan> {
  const db = await getDb();
  const row = await db.getFirstAsync<PlanRow>('SELECT * FROM weekly_plans WHERE week_start = ?', [weekStart]);
  return {
    weekStart,
    bossTitle: row?.boss_title ?? '',
    bossCompleted: row?.boss_completed === 1,
  };
}

export async function saveBossTitle(weekStart: string, title: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO weekly_plans (week_start, boss_title, boss_completed, updated_at) VALUES (?, ?, 0, ?)
       ON CONFLICT(week_start) DO UPDATE SET boss_title=excluded.boss_title, updated_at=excluded.updated_at`,
      [weekStart, title, nowIso()],
    );
    await enqueueWeekPlan(db, weekStart);
  });
}

/**
 * Completing the boss task grants its reward once per week (event_id = boss:<week>).
 * Undoing it revokes that reward. Both are queued only when the local row actually changed.
 */
export async function setBossCompleted(weekStart: string, completed: boolean): Promise<void> {
  const db = await getDb();
  const eventId = `boss:${weekStart}`;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO weekly_plans (week_start, boss_title, boss_completed, updated_at) VALUES (?, '', ?, ?)
       ON CONFLICT(week_start) DO UPDATE SET boss_completed=excluded.boss_completed, updated_at=excluded.updated_at`,
      [weekStart, completed ? 1 : 0, nowIso()],
    );
    await enqueueWeekPlan(db, weekStart);

    if (completed) {
      const res = await db.runAsync(
        'INSERT OR IGNORE INTO reward_ledger (event_id, kind, amount, created_at) VALUES (?, ?, ?, ?)',
        [eventId, 'boss_task', BOSS_REWARD_XP, nowIso()],
      );
      if (res.changes === 1) {
        await enqueueOp(db, 'reward.grant', {
          event_id: eventId,
          kind: 'boss_task',
          amount: BOSS_REWARD_XP,
          updated_at: nowIso(),
        });
      }
    } else {
      const res = await db.runAsync('DELETE FROM reward_ledger WHERE event_id = ?', [eventId]);
      if (res.changes > 0) {
        await enqueueOp(db, 'reward.revoke', { event_id: eventId, updated_at: nowIso() });
      }
    }
  });
}

export async function totalRewardXp(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ xp: number }>('SELECT COALESCE(SUM(amount), 0) AS xp FROM reward_ledger');
  return row?.xp ?? 0;
}
