import { habitSchema } from './habitValidation';

const valid = {
  name: 'Read 20 pages',
  scheduleType: 'daily' as const,
  startDate: '2026-10-01',
};

describe('habitSchema', () => {
  it('accepts a minimal daily habit and applies defaults', () => {
    const r = habitSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.category).toBe('General');
  });
  it('rejects an empty name', () => {
    expect(habitSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });
  it('requires at least one weekday for weekday schedules', () => {
    expect(habitSchema.safeParse({ ...valid, scheduleType: 'weekdays', weekdays: [] }).success).toBe(false);
  });
  it('requires an interval of 2 or more for every-N-days', () => {
    expect(habitSchema.safeParse({ ...valid, scheduleType: 'every_n_days', intervalDays: 1 }).success).toBe(false);
    expect(habitSchema.safeParse({ ...valid, scheduleType: 'every_n_days', intervalDays: 2 }).success).toBe(true);
  });
  it('rejects an end date before the start date', () => {
    expect(habitSchema.safeParse({ ...valid, endDate: '2026-09-01' }).success).toBe(false);
  });
});
