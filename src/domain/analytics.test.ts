import { average, habitMonthPercent, monthDates, monthStats, shiftMonth } from './analytics';
import { buildHistory, toCompletionMap, type Scheduled } from './progress';

describe('month helpers', () => {
  it('lists every day of a month, including leap February', () => {
    expect(monthDates('2026-02')).toHaveLength(28);
    expect(monthDates('2028-02')).toHaveLength(29);
    expect(monthDates('2026-10')[0]).toBe('2026-10-01');
  });
  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
  });
});

describe('monthStats', () => {
  it('computes completion percent and perfect days', () => {
    const habit: Scheduled = {
      id: 'A', scheduleType: 'daily', weekdays: [], intervalDays: null,
      startDate: '2026-10-01', endDate: null, pauses: [],
    };
    const map = toCompletionMap([
      { habitId: 'A', date: '2026-10-01' },
      { habitId: 'A', date: '2026-10-02' },
    ]);
    const h = buildHistory([habit], map, '2026-10-04');
    const stats = monthStats(h.days, monthDates('2026-10'));
    expect(stats).toMatchObject({ eligible: 4, completed: 2, perfectDays: 2, percent: 50 });
  });
});

describe('average', () => {
  it('ignores nulls and rounds to one decimal', () => {
    expect(average([4, null, 5, 3])).toBe(4);
    expect(average([1, 2, 2])).toBe(1.7);
    expect(average([null])).toBeNull();
  });
});

describe('habitMonthPercent', () => {
  it('counts only scheduled days up to today', () => {
    const h = {
      scheduleType: 'daily' as const, weekdays: [], intervalDays: null,
      startDate: '2026-10-01', endDate: null, pauses: [],
    };
    expect(habitMonthPercent(h, new Set(['2026-10-01', '2026-10-02']), '2026-10-04')).toBe(50);
  });
});
