import { addDays } from './rules';
import { weekdayOf } from './schedule';

export const MAX_BIG3 = 3;
/** 1 = Monday. Fixed until settings (Phase 5) let the user change it. */
export const WEEK_START_DAY = 1;
export const BOSS_SCORE = 3;
/** Each completed Big 3 task awards XP once, like the boss task. */
export const BIG3_XP = 10;
/** 7 days x 3 Big 3 tasks + boss task */
export const MAX_WEEK_SCORE = MAX_BIG3 * 7 + BOSS_SCORE;

export type WeekRank = 'Just Starting' | 'Building Momentum' | 'Consistent' | 'Unstoppable';

export function weekStartOf(date: string, startDay: number = WEEK_START_DAY): string {
  const diff = (weekdayOf(date) - startDay + 7) % 7;
  return addDays(date, -diff);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function weeklyScore(big3Completed: number, bossCompleted: boolean): number {
  return big3Completed + (bossCompleted ? BOSS_SCORE : 0);
}

/** Rank thresholds are a working assumption to confirm against the website. */
export function rankFor(score: number): WeekRank {
  if (score >= 16) return 'Unstoppable';
  if (score >= 10) return 'Consistent';
  if (score >= 5) return 'Building Momentum';
  return 'Just Starting';
}

/** Energy, focus, and mood are 1 to 5. */
export function clampScale(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}
