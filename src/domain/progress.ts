import {
  addDays,
  currentStreak,
  dayStatus,
  dayXp,
  longestStreak,
  type DayStatus,
} from './rules';
import { isScheduledOn, type HabitSchedule } from './schedule';

export type Scheduled = HabitSchedule & { id: string };
/** date -> set of habit ids completed on that date */
export type CompletionMap = Map<string, Set<string>>;
export type CompletionRow = { habitId: string; date: string };

export type DaySummary = {
  date: string;
  eligible: number;
  completed: number;
  status: DayStatus;
  xp: number;
};

export type History = {
  days: Map<string, DaySummary>;
  totalXp: number;
  consistencyStreak: number;
  longestConsistency: number;
};

export function toCompletionMap(rows: CompletionRow[]): CompletionMap {
  const map: CompletionMap = new Map();
  for (const { habitId, date } of rows) {
    let set = map.get(date);
    if (!set) {
      set = new Set();
      map.set(date, set);
    }
    set.add(habitId);
  }
  return map;
}

export function datesForHabit(map: CompletionMap, habitId: string): Set<string> {
  const dates = new Set<string>();
  for (const [date, ids] of map) if (ids.has(habitId)) dates.add(date);
  return dates;
}

/** Counts only habits that are eligible on that date. */
export function summarizeDay(habits: Scheduled[], completions: CompletionMap, date: string): DaySummary {
  const done = completions.get(date) ?? new Set<string>();
  let eligible = 0;
  let completed = 0;
  for (const h of habits) {
    if (!isScheduledOn(h, date)) continue;
    eligible += 1;
    if (done.has(h.id)) completed += 1;
  }
  return {
    date,
    eligible,
    completed,
    status: dayStatus(eligible, completed),
    xp: dayXp(eligible, completed),
  };
}

/** Recomputes everything from state, so undo reconciles XP automatically. */
export function buildHistory(habits: Scheduled[], completions: CompletionMap, today: string): History {
  const days = new Map<string, DaySummary>();
  const qualifying = new Set<string>();
  let totalXp = 0;

  let start = today;
  for (const h of habits) if (h.startDate < start) start = h.startDate;

  for (let date = start; date <= today; date = addDays(date, 1)) {
    const s = summarizeDay(habits, completions, date);
    if (s.eligible === 0) continue; // unscheduled days are neutral
    days.set(date, s);
    totalXp += s.xp;
    if (s.status === 'consistent' || s.status === 'perfect') qualifying.add(date);
  }

  return {
    days,
    totalXp,
    consistencyStreak: currentStreak(qualifying, today),
    longestConsistency: longestStreak(qualifying),
  };
}
