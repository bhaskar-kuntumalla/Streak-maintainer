import { buildReminderPlan, inQuietHours, MAX_SCHEDULED, type ReminderHabit } from './reminders';
import type { NotificationSettings } from './settings';
import { settingsSchema } from './settings';

const enabled: NotificationSettings = settingsSchema.parse({ notifications: { enabled: true } }).notifications;

const gym: ReminderHabit = {
  id: 'g', name: 'Gym', icon: '💪', reminderTime: '18:00', archived: false,
  scheduleType: 'weekdays', weekdays: [1, 3, 5], intervalDays: null,
  startDate: '2026-10-01', endDate: null, pauses: [],
};

describe('inQuietHours', () => {
  it('handles windows that cross midnight', () => {
    const q = { start: '22:00', end: '07:00' };
    expect(inQuietHours('23:30', q)).toBe(true);
    expect(inQuietHours('06:59', q)).toBe(true);
    expect(inQuietHours('07:00', q)).toBe(false);
    expect(inQuietHours('12:00', q)).toBe(false);
  });
  it('handles same-day windows', () => {
    expect(inQuietHours('13:00', { start: '12:00', end: '14:00' })).toBe(true);
  });
  it('is off when no window is set', () => {
    expect(inQuietHours('23:00', null)).toBe(false);
  });
});

describe('buildReminderPlan', () => {
  const base = { today: '2026-10-19', nowMinutes: 600, habits: [gym], completedToday: new Set<string>() };

  it('schedules nothing when notifications are disabled', () => {
    const off = { ...enabled, enabled: false };
    expect(buildReminderPlan({ ...base, settings: off })).toEqual([]);
  });

  it('schedules habit reminders only on scheduled days', () => {
    const plan = buildReminderPlan({ ...base, settings: enabled });
    const habitDates = plan.filter((p) => p.kind === 'habit').map((p) => (p.kind === 'habit' ? p.trigger.date : ''));
    // 2026-10-19 is Monday, 10-21 Wed, 10-23 Fri in the next 7 days
    expect(habitDates).toEqual(['2026-10-19', '2026-10-21', '2026-10-23']);
  });

  it('skips today when the habit is already done or its time has passed', () => {
    const done = buildReminderPlan({ ...base, settings: enabled, completedToday: new Set(['g']) });
    expect(done.some((p) => p.kind === 'habit' && p.trigger.date === '2026-10-19')).toBe(false);
    const late = buildReminderPlan({ ...base, settings: enabled, nowMinutes: 19 * 60 });
    expect(late.some((p) => p.kind === 'habit' && p.trigger.date === '2026-10-19')).toBe(false);
  });

  it('drops archived habits and habits without a reminder time', () => {
    const plan = buildReminderPlan({
      ...base,
      settings: enabled,
      habits: [{ ...gym, archived: true }, { ...gym, id: 'n', reminderTime: null }],
    });
    expect(plan.filter((p) => p.kind === 'habit')).toHaveLength(0);
  });

  it('never exceeds the scheduling cap', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...gym, id: `h${i}`, scheduleType: 'daily' as const, weekdays: [] }));
    const plan = buildReminderPlan({ ...base, settings: enabled, habits: many });
    expect(plan.length).toBeLessThanOrEqual(MAX_SCHEDULED);
  });

  it('keys are unique so rescheduling cannot duplicate', () => {
    const plan = buildReminderPlan({ ...base, settings: enabled });
    expect(new Set(plan.map((p) => p.key)).size).toBe(plan.length);
  });

  it('respects quiet hours for daily reminders', () => {
    const quiet = { ...enabled, quietHours: { start: '07:00', end: '09:00' } };
    const plan = buildReminderPlan({ ...base, settings: quiet });
    expect(plan.some((p) => p.kind === 'checkin')).toBe(false); // default check-in is 08:00
    expect(plan.some((p) => p.kind === 'review')).toBe(true);
  });
});
