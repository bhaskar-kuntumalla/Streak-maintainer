import { describeSchedule, habitStreak, isScheduledOn, weekdayOf, type HabitSchedule } from './schedule';

const base: HabitSchedule = {
  scheduleType: 'daily',
  weekdays: [],
  intervalDays: null,
  startDate: '2026-10-01',
  endDate: null,
  pauses: [],
};

describe('weekdays', () => {
  it('computes weekday without timezone drift', () => {
    expect(weekdayOf('2026-10-19')).toBe(1); // Monday
    expect(weekdayOf('2026-10-25')).toBe(0); // Sunday
  });
});

describe('isScheduledOn', () => {
  it('daily runs every day from the start date', () => {
    expect(isScheduledOn(base, '2026-09-30')).toBe(false);
    expect(isScheduledOn(base, '2026-10-01')).toBe(true);
  });
  it('selected weekdays only', () => {
    const h = { ...base, scheduleType: 'weekdays' as const, weekdays: [1, 3, 5] };
    expect(isScheduledOn(h, '2026-10-05')).toBe(true); // Mon
    expect(isScheduledOn(h, '2026-10-06')).toBe(false); // Tue
  });
  it('every N days anchors to the start date', () => {
    const h = { ...base, scheduleType: 'every_n_days' as const, intervalDays: 3 };
    expect(isScheduledOn(h, '2026-10-01')).toBe(true);
    expect(isScheduledOn(h, '2026-10-02')).toBe(false);
    expect(isScheduledOn(h, '2026-10-04')).toBe(true);
  });
  it('respects end date', () => {
    expect(isScheduledOn({ ...base, endDate: '2026-10-10' }, '2026-10-11')).toBe(false);
  });
  it('pauses are half-open and do not rewrite history outside the range', () => {
    const h = { ...base, pauses: [{ from: '2026-10-05', to: '2026-10-08' }] };
    expect(isScheduledOn(h, '2026-10-04')).toBe(true);
    expect(isScheduledOn(h, '2026-10-05')).toBe(false);
    expect(isScheduledOn(h, '2026-10-07')).toBe(false);
    expect(isScheduledOn(h, '2026-10-08')).toBe(true);
  });
});

describe('habitStreak', () => {
  it('skips an open today and counts back', () => {
    const done = new Set(['2026-10-03', '2026-10-04']);
    expect(habitStreak(base, done, '2026-10-05')).toBe(2);
  });
  it('breaks on a missed scheduled day', () => {
    const done = new Set(['2026-10-02', '2026-10-04']);
    expect(habitStreak(base, done, '2026-10-05')).toBe(1);
  });
  it('unscheduled days do not break the streak', () => {
    const h = { ...base, startDate: '2026-09-01', scheduleType: 'weekdays' as const, weekdays: [1] }; // Mondays only
    const done = new Set(['2026-09-28', '2026-10-05']); // Mon Sep 28 and Mon Oct 5
    expect(habitStreak(h, done, '2026-10-05')).toBe(2);
  });
});

describe('describeSchedule', () => {
  it('labels each schedule type', () => {
    expect(describeSchedule(base)).toBe('Every day');
    expect(describeSchedule({ ...base, scheduleType: 'weekdays', weekdays: [5, 1] })).toBe('Mon, Fri');
    expect(describeSchedule({ ...base, scheduleType: 'every_n_days', intervalDays: 2 })).toBe('Every 2 days');
  });
});
