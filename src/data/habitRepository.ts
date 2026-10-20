import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/client';
import { newId } from '@/lib/date';
import { addDays } from '@/domain/rules';
import type { HabitSchedule, PauseRange, ScheduleType } from '@/domain/schedule';
import type { HabitValues } from '@/domain/habitValidation';
import { enqueueOp } from '@/sync/outbox';

export type HabitRecord = HabitSchedule & {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  reminderTime: string | null;
  archived: boolean;
};

type HabitRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
  schedule_type: string;
  weekdays: string | null;
  interval_days: number | null;
  start_date: string;
  end_date: string | null;
  reminder_time: string | null;
  status: string;
  pauses: string;
  updated_at: string;
};

const nowIso = () => new Date().toISOString();

function rowToHabit(r: HabitRow): HabitRecord {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    icon: r.icon ?? '✨',
    color: r.color ?? '#2EE6C5',
    category: r.category ?? 'General',
    scheduleType: r.schedule_type as ScheduleType,
    weekdays: r.weekdays ? (JSON.parse(r.weekdays) as number[]) : [],
    intervalDays: r.interval_days,
    startDate: r.start_date,
    endDate: r.end_date,
    pauses: JSON.parse(r.pauses) as PauseRange[],
    reminderTime: r.reminder_time,
    archived: r.status === 'archived',
  };
}

/** Queues the full current state of a habit. Full state keeps ops idempotent. */
async function enqueueHabit(db: SQLiteDatabase, id: string): Promise<void> {
  const r = await db.getFirstAsync<HabitRow>('SELECT * FROM habits WHERE id = ?', [id]);
  if (!r) return;
  await enqueueOp(db, 'habit.upsert', {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    icon: r.icon ?? '✨',
    color: r.color ?? '#2EE6C5',
    category: r.category ?? 'General',
    schedule_type: r.schedule_type,
    weekdays: r.weekdays ?? '[]',
    interval_days: r.interval_days,
    start_date: r.start_date,
    end_date: r.end_date,
    reminder_time: r.reminder_time,
    status: r.status,
    pauses: r.pauses,
    updated_at: r.updated_at,
  });
}

async function enqueueCompletion(db: SQLiteDatabase, habitId: string, date: string): Promise<void> {
  const r = await db.getFirstAsync<{ completed: number; updated_at: string }>(
    'SELECT completed, updated_at FROM completions WHERE habit_id = ? AND date = ?',
    [habitId, date],
  );
  if (!r) return;
  await enqueueOp(db, 'completion.set', {
    habit_id: habitId,
    date,
    completed: r.completed === 1,
    updated_at: r.updated_at,
  });
}

export async function listHabits(): Promise<HabitRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HabitRow>('SELECT * FROM habits ORDER BY name COLLATE NOCASE');
  return rows.map(rowToHabit);
}

export async function listCompletions(): Promise<{ habitId: string; date: string }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ habit_id: string; date: string }>(
    'SELECT habit_id, date FROM completions WHERE completed = 1',
  );
  return rows.map((r) => ({ habitId: r.habit_id, date: r.date }));
}

export async function saveHabit(values: HabitValues, id?: string): Promise<string> {
  const db = await getDb();
  const now = nowIso();
  const habitId = id ?? newId();
  const fields = [
    values.name,
    values.description,
    values.icon,
    values.color,
    values.category,
    values.scheduleType,
    JSON.stringify(values.weekdays),
    values.intervalDays,
    values.startDate,
    values.endDate,
    values.reminderTime,
    now,
  ];

  await db.withTransactionAsync(async () => {
    if (id) {
      await db.runAsync(
        `UPDATE habits SET name=?, description=?, icon=?, color=?, category=?, schedule_type=?,
          weekdays=?, interval_days=?, start_date=?, end_date=?, reminder_time=?, updated_at=?
         WHERE id=?`,
        [...fields, habitId],
      );
    } else {
      await db.runAsync(
        `INSERT INTO habits (id, name, description, icon, color, category, schedule_type, weekdays,
          interval_days, start_date, end_date, reminder_time, updated_at, xp_reward, status, pauses)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, 'active', '[]')`,
        [habitId, ...fields],
      );
    }
    await enqueueHabit(db, habitId);
  });
  return habitId;
}

/** Pausing opens a range from today; resuming closes it so past days are untouched. */
export async function setPaused(id: string, paused: boolean, today: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ pauses: string }>('SELECT pauses FROM habits WHERE id = ?', [id]);
    if (!row) throw new Error('Habit not found');
    const pauses = JSON.parse(row.pauses) as PauseRange[];
    const openIndex = pauses.findIndex((p) => p.to === null);
    if (paused && openIndex === -1) pauses.push({ from: today, to: null });
    if (!paused && openIndex !== -1) pauses[openIndex] = { ...pauses[openIndex], to: today };
    await db.runAsync('UPDATE habits SET pauses = ?, updated_at = ? WHERE id = ?', [
      JSON.stringify(pauses),
      nowIso(),
      id,
    ]);
    await enqueueHabit(db, id);
  });
}

/** Archiving ends scheduling yesterday so history stays intact. */
export async function archiveHabit(id: string, today: string): Promise<void> {
  const db = await getDb();
  const yesterday = addDays(today, -1);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE habits SET status = 'archived',
         end_date = CASE WHEN end_date IS NULL OR end_date > ? THEN ? ELSE end_date END,
         updated_at = ?
       WHERE id = ?`,
      [yesterday, yesterday, nowIso(), id],
    );
    await enqueueHabit(db, id);
  });
}

export async function setCompletion(habitId: string, date: string, completed: boolean): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO completions (id, habit_id, date, completed, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET completed = excluded.completed, updated_at = excluded.updated_at`,
      [newId(), habitId, date, completed ? 1 : 0, nowIso()],
    );
    await enqueueCompletion(db, habitId, date);
  });
}
