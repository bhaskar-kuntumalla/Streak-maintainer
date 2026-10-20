import { clampScale, rankFor, weekDates, weekStartOf, weeklyScore } from './planning';

describe('weekStartOf', () => {
  it('uses Monday as the week start', () => {
    expect(weekStartOf('2026-10-19')).toBe('2026-10-19'); // Monday
    expect(weekStartOf('2026-10-25')).toBe('2026-10-19'); // Sunday belongs to prior Monday
    expect(weekStartOf('2026-10-21')).toBe('2026-10-19');
  });
  it('crosses month and year boundaries', () => {
    expect(weekStartOf('2027-01-02')).toBe('2026-12-28');
  });
});

describe('weekDates', () => {
  it('returns seven consecutive days', () => {
    const d = weekDates('2026-10-19');
    expect(d).toHaveLength(7);
    expect(d[6]).toBe('2026-10-25');
  });
});

describe('weekly score and rank', () => {
  it('counts Big 3 completions and the boss task', () => {
    expect(weeklyScore(4, false)).toBe(4);
    expect(weeklyScore(4, true)).toBe(7);
  });
  it('maps scores to ranks', () => {
    expect(rankFor(0)).toBe('Just Starting');
    expect(rankFor(5)).toBe('Building Momentum');
    expect(rankFor(10)).toBe('Consistent');
    expect(rankFor(16)).toBe('Unstoppable');
  });
});

describe('clampScale', () => {
  it('keeps values within 1 to 5', () => {
    expect(clampScale(0)).toBe(1);
    expect(clampScale(9)).toBe(5);
    expect(clampScale(3.4)).toBe(3);
  });
});

import { BIG3_XP, MAX_WEEK_SCORE } from './planning';
describe('Big 3 economics', () => {
  it('awards 10 XP per Big 3 task and totals the week maximum', () => {
    expect(BIG3_XP).toBe(10);
    expect(MAX_WEEK_SCORE).toBe(24);
  });
});
