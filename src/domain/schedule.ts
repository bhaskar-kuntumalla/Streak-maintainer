import { addDays } from './rules';

export type ScheduleType = 'daily' | 'weekdays' | 'every_n_days';
export type PauseRange = { from: string; to: string | null };

export type HabitSchedule = {
  scheduleType: ScheduleType;
  weekdays: number[];
  intervalDays: number | null;
  startDate: string;
  endDate: string | null;
  pauses: PauseRange[];
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 0 = Sunday through 6 = Saturday. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Pause ranges are [from, to): paused from `from`, active again on `to`. */
export function isPausedOn(h: HabitSchedule, date: string): boolean {
  return h.pauses.some((p) => date >= p.from && (p.to === null || date < p.to));
}

export function isScheduledOn(h: HabitSchedule, date: string): boolean {
  if (date < h.startDate) return false;
  if (h.endDate !== null && date > h.endDate) return false;
  if (isPausedOn(h, date)) return false;
  switch (h.scheduleType) {
    case 'daily':
      return true;
    case 'weekdays':
      return h.weekdays.includes(weekdayOf(date));
    case 'every_n_days':
      return h.intervalDays !== null && daysBetween(h.startDate, date) % h.intervalDays === 0;
  }
}

export function describeSchedule(h: HabitSchedule): string {
  switch (h.scheduleType) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return [...h.weekdays].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(', ');
    case 'every_n_days':
      return `Every ${h.intervalDays} days`;
  }
}

/**
 * Consecutive scheduled days completed, ending today or yesterday. Today is
 * skipped while it is still open. Unscheduled days do not break the streak.
 */
export function habitStreak(h: HabitSchedule, completed: Set<string>, today: string): number {
  let count = 0;
  let cursor = today;
  while (cursor >= h.startDate) {
    if (isScheduledOn(h, cursor)) {
      if (completed.has(cursor)) count += 1;
      else if (cursor !== today) break;
    }
    cursor = addDays(cursor, -1);
  }
  return count;
}
