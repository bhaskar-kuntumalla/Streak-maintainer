import { addDays } from './rules';
import { isScheduledOn, type HabitSchedule } from './schedule';
import type { CompletionMap, DaySummary, Scheduled } from './progress';

export function rangeDates(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** YYYY-MM -> every date in that month */
export function monthDates(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthStats(days: Map<string, DaySummary>, dates: string[]) {
  let eligible = 0;
  let completed = 0;
  let perfectDays = 0;
  for (const d of dates) {
    const s = days.get(d);
    if (!s) continue;
    eligible += s.eligible;
    completed += s.completed;
    if (s.status === 'perfect') perfectDays += 1;
  }
  return {
    eligible,
    completed,
    perfectDays,
    percent: eligible ? Math.round((completed / eligible) * 100) : 0,
  };
}

export type CategoryStat = { category: string; eligible: number; completed: number; percent: number };

export function categoryProgress(
  habits: (Scheduled & { category: string })[],
  completions: CompletionMap,
  dates: string[],
): CategoryStat[] {
  const acc = new Map<string, { eligible: number; completed: number }>();
  for (const date of dates) {
    const done = completions.get(date) ?? new Set<string>();
    for (const h of habits) {
      if (!isScheduledOn(h as HabitSchedule, date)) continue;
      const e = acc.get(h.category) ?? { eligible: 0, completed: 0 };
      e.eligible += 1;
      if (done.has(h.id)) e.completed += 1;
      acc.set(h.category, e);
    }
  }
  return Array.from(acc, ([category, v]) => ({
    category,
    eligible: v.eligible,
    completed: v.completed,
    percent: v.eligible ? Math.round((v.completed / v.eligible) * 100) : 0,
  })).sort((a, b) => b.percent - a.percent || a.category.localeCompare(b.category));
}

/** Mean of non-null values, rounded to one decimal. */
export function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Percent of scheduled days this month (up to today) that were completed. */
export function habitMonthPercent(h: HabitSchedule, done: Set<string>, today: string): number {
  let scheduled = 0;
  let completed = 0;
  for (const d of monthDates(today.slice(0, 7))) {
    if (d > today) break;
    if (!isScheduledOn(h, d)) continue;
    scheduled += 1;
    if (done.has(d)) completed += 1;
  }
  return scheduled ? Math.round((completed / scheduled) * 100) : 0;
}
