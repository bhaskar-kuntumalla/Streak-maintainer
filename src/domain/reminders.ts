import { addDays } from './rules';
import { isScheduledOn, type HabitSchedule } from './schedule';
import type { NotificationSettings } from './settings';

/** iOS allows 64 scheduled local notifications per app. Stay under it. */
export const MAX_SCHEDULED = 60;

export type ReminderHabit = HabitSchedule & {
  id: string;
  name: string;
  icon: string;
  reminderTime: string | null;
  archived: boolean;
};

export type PlannedReminder =
  | { key: string; kind: 'habit'; title: string; body: string; trigger: { type: 'date'; date: string; time: string } }
  | { key: string; kind: 'checkin' | 'review'; title: string; body: string; trigger: { type: 'daily'; time: string } }
  | { key: string; kind: 'weekly'; title: string; body: string; trigger: { type: 'weekly'; weekday: number; time: string } };

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Quiet hours may cross midnight, e.g. 22:00 to 07:00. */
export function inQuietHours(hhmm: string, quiet: NotificationSettings['quietHours']): boolean {
  if (!quiet) return false;
  const t = toMinutes(hhmm);
  const start = toMinutes(quiet.start);
  const end = toMinutes(quiet.end);
  if (start === end) return false;
  return start < end ? t >= start && t < end : t >= start || t < end;
}

export type PlanInput = {
  today: string;
  nowMinutes: number;
  habits: ReminderHabit[];
  completedToday: Set<string>;
  settings: NotificationSettings;
  horizonDays?: number;
  maxTotal?: number;
};

/**
 * Builds the full reminder set. The caller cancels everything the app scheduled
 * and schedules this list, so repeated runs never duplicate and archived habits
 * drop out automatically. Priority: weekly planning, check-in, review, then habits.
 */
export function buildReminderPlan(input: PlanInput): PlannedReminder[] {
  const { today, nowMinutes, habits, completedToday, settings } = input;
  const horizon = input.horizonDays ?? 7;
  const maxTotal = input.maxTotal ?? MAX_SCHEDULED;
  if (!settings.enabled) return [];

  const plan: PlannedReminder[] = [];
  const q = settings.quietHours;

  if (settings.weeklyPlanning.enabled && !inQuietHours(settings.weeklyPlanning.time, q)) {
    plan.push({
      key: 'weekly:planning',
      kind: 'weekly',
      title: 'Plan your week',
      body: "Pick this week's boss task and three priorities.",
      trigger: { type: 'weekly', weekday: settings.weeklyPlanning.weekday, time: settings.weeklyPlanning.time },
    });
  }
  if (settings.checkIn.enabled && !inQuietHours(settings.checkIn.time, q)) {
    plan.push({
      key: 'daily:checkin',
      kind: 'checkin',
      title: 'Quick check-in',
      body: 'How are your energy, focus, and mood today?',
      trigger: { type: 'daily', time: settings.checkIn.time },
    });
  }
  if (settings.eveningReview.enabled && !inQuietHours(settings.eveningReview.time, q)) {
    plan.push({
      key: 'daily:review',
      kind: 'review',
      title: 'Evening review',
      body: 'Close the day. Review your Big 3 and reflect.',
      trigger: { type: 'daily', time: settings.eveningReview.time },
    });
  }

  if (settings.habitReminders) {
    for (let i = 0; i < horizon && plan.length < maxTotal; i++) {
      const date = addDays(today, i);
      for (const h of habits) {
        if (plan.length >= maxTotal) break;
        if (h.archived || !h.reminderTime) continue;
        if (!isScheduledOn(h, date)) continue;
        if (i === 0) {
          if (completedToday.has(h.id)) continue;
          if (toMinutes(h.reminderTime) <= nowMinutes) continue;
        }
        if (inQuietHours(h.reminderTime, q)) continue;
        plan.push({
          key: `habit:${h.id}:${date}`,
          kind: 'habit',
          title: 'Habit reminder',
          body: `${h.icon} ${h.name}`,
          trigger: { type: 'date', date, time: h.reminderTime },
        });
      }
    }
  }
  return plan;
}
