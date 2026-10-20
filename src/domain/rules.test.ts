import {
  addDays,
  currentStreak,
  dayStatus,
  dayXp,
  levelFromXp,
  levelProgress,
  longestStreak,
  requiredCompletions,
  xpDelta,
} from './rules';

describe('requiredCompletions (ceiling of 80%)', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 4],
    [6, 5],
    [10, 8],
    [11, 9],
  ])('eligible %i requires %i', (eligible, required) => {
    expect(requiredCompletions(eligible)).toBe(required);
  });
});

describe('dayStatus', () => {
  it('treats unscheduled days as neutral', () => {
    expect(dayStatus(0, 0)).toBe('neutral');
  });
  it('classifies missed, partial, consistent and perfect', () => {
    expect(dayStatus(5, 0)).toBe('missed');
    expect(dayStatus(5, 2)).toBe('partial');
    expect(dayStatus(5, 4)).toBe('consistent');
    expect(dayStatus(5, 5)).toBe('perfect');
  });
});

describe('XP', () => {
  it('awards 10 per completion and a 50 bonus on a perfect day', () => {
    expect(dayXp(3, 2)).toBe(20);
    expect(dayXp(3, 3)).toBe(80);
  });
  it('reverses XP exactly when a completion is undone', () => {
    const delta = xpDelta({ eligible: 3, completed: 3 }, { eligible: 3, completed: 2 });
    // 3/3 perfect = 30 + 50 = 80; 2/3 consistent = 20; delta = -60
    expect(delta).toBe(-60);
  });
  it('round-trips: complete then undo returns to zero net XP', () => {
    const up = xpDelta({ eligible: 4, completed: 3 }, { eligible: 4, completed: 4 });
    const down = xpDelta({ eligible: 4, completed: 4 }, { eligible: 4, completed: 3 });
    expect(up + down).toBe(0);
  });
});

describe('levels', () => {
  it('levels up every 500 XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(499)).toBe(1);
    expect(levelFromXp(500)).toBe(2);
    expect(levelProgress(750)).toBeCloseTo(0.5);
  });
});

describe('streaks and dates', () => {
  it('shifts dates across month and year boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('counts a current streak ending today or yesterday', () => {
    const set = new Set(['2026-10-17', '2026-10-18', '2026-10-19']);
    expect(currentStreak(set, '2026-10-19')).toBe(3);
    expect(currentStreak(set, '2026-10-20')).toBe(3);
    expect(currentStreak(set, '2026-10-21')).toBe(0);
  });
  it('finds the longest run', () => {
    const set = new Set(['2026-01-01', '2026-01-02', '2026-01-10', '2026-01-11', '2026-01-12']);
    expect(longestStreak(set)).toBe(3);
  });
});
