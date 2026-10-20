import { buildHistory, summarizeDay, toCompletionMap, type Scheduled } from './progress';

const daily: Scheduled = {
  id: 'A', scheduleType: 'daily', weekdays: [], intervalDays: null,
  startDate: '2026-10-01', endDate: null, pauses: [],
};
const mondays: Scheduled = {
  id: 'B', scheduleType: 'weekdays', weekdays: [1], intervalDays: null,
  startDate: '2026-10-01', endDate: null, pauses: [],
};
const habits = [daily, mondays];

describe('summarizeDay', () => {
  it('a perfect Monday earns 2 completions of XP plus the 50 bonus', () => {
    const map = toCompletionMap([
      { habitId: 'A', date: '2026-10-05' },
      { habitId: 'B', date: '2026-10-05' },
    ]);
    const s = summarizeDay(habits, map, '2026-10-05');
    expect(s).toMatchObject({ eligible: 2, completed: 2, status: 'perfect', xp: 70 });
  });
  it('undoing a completion drops the perfect bonus and the XP for that habit', () => {
    const map = toCompletionMap([{ habitId: 'A', date: '2026-10-05' }]);
    const s = summarizeDay(habits, map, '2026-10-05');
    expect(s).toMatchObject({ eligible: 2, completed: 1, status: 'partial', xp: 10 });
  });
});

describe('buildHistory', () => {
  it('totals XP only from eligible days and tracks consistency', () => {
    const map = toCompletionMap([
      { habitId: 'A', date: '2026-10-05' },
      { habitId: 'B', date: '2026-10-05' },
    ]);
    const h = buildHistory(habits, map, '2026-10-05');
    expect(h.totalXp).toBe(70);
    expect(h.consistencyStreak).toBe(1);
    expect(h.days.has('2026-10-02')).toBe(true); // daily habit was eligible, not Monday
  });
  it('is idempotent: identical state yields identical XP', () => {
    const map = toCompletionMap([{ habitId: 'A', date: '2026-10-03' }]);
    expect(buildHistory(habits, map, '2026-10-05').totalXp).toBe(
      buildHistory(habits, map, '2026-10-05').totalXp,
    );
  });
});
