// Pure business rules. No I/O. Must mirror the StreakOS website exactly.

export const XP_PER_COMPLETION = 10;
export const PERFECT_DAY_BONUS = 50;
export const BOSS_TASK_XP = 100;
export const XP_PER_LEVEL = 500;
export const CONSISTENCY_RATIO = 0.8;

export type DayStatus = 'neutral' | 'missed' | 'partial' | 'consistent' | 'perfect';

/** Ceiling of 80% of eligible scheduled habits. */
export function requiredCompletions(eligibleCount: number): number {
  if (eligibleCount <= 0) return 0;
  return Math.ceil(eligibleCount * CONSISTENCY_RATIO);
}

/** Unscheduled days (no eligible habits) are neutral. */
export function dayStatus(eligibleCount: number, completedCount: number): DayStatus {
  if (eligibleCount <= 0) return 'neutral';
  if (completedCount <= 0) return 'missed';
  if (completedCount >= eligibleCount) return 'perfect';
  return completedCount >= requiredCompletions(eligibleCount) ? 'consistent' : 'partial';
}

/**
 * Net XP for one day. Computed from state, not accumulated, so undoing a
 * completion is reconciled by recomputing and taking the delta.
 */
export function dayXp(eligibleCount: number, completedCount: number): number {
  const status = dayStatus(eligibleCount, completedCount);
  const base = Math.max(0, completedCount) * XP_PER_COMPLETION;
  return status === 'perfect' ? base + PERFECT_DAY_BONUS : base;
}

/** XP change to apply when a day moves from old state to new state. */
export function xpDelta(
  before: { eligible: number; completed: number },
  after: { eligible: number; completed: number },
): number {
  return dayXp(after.eligible, after.completed) - dayXp(before.eligible, before.completed);
}

export function levelFromXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
}

/** Progress through the current level, 0 to 1. */
export function levelProgress(totalXp: number): number {
  return (Math.max(0, totalXp) % XP_PER_LEVEL) / XP_PER_LEVEL;
}

/** Shift an ISO date (YYYY-MM-DD) by whole days, using UTC to avoid DST drift. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Consecutive days of a qualifying status ending today, or ending yesterday
 * if today has not qualified yet. `qualifying` holds ISO dates that qualify.
 */
export function currentStreak(qualifying: Set<string>, today: string): number {
  let cursor = qualifying.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (qualifying.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** Longest run of consecutive qualifying dates in the set. */
export function longestStreak(qualifying: Set<string>): number {
  let best = 0;
  for (const date of qualifying) {
    if (qualifying.has(addDays(date, -1))) continue; // not a run start
    let run = 0;
    let cursor = date;
    while (qualifying.has(cursor)) {
      run += 1;
      cursor = addDays(cursor, 1);
    }
    best = Math.max(best, run);
  }
  return best;
}
