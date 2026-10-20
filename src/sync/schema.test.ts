import { pullSchema, pushResultSchema } from './schema';

const emptyPull = {
  cursor: 0,
  habits: [],
  completions: [],
  daily_tasks: [],
  daily_check_ins: [],
  weekly_plans: [],
  reward_ledger: [],
};

describe('pullSchema', () => {
  it('accepts an empty pull', () => {
    expect(pullSchema.parse(emptyPull).cursor).toBe(0);
  });
  it('rejects a habit with an unknown schedule type', () => {
    const bad = {
      ...emptyPull,
      habits: [{
        id: 'h1', name: 'x', description: null, icon: null, color: null, category: null,
        schedule_type: 'hourly', weekdays: '[]', interval_days: null, start_date: '2026-10-01',
        end_date: null, reminder_time: null, status: 'active', pauses: '[]', updated_at: '2026-10-01T00:00:00Z',
      }],
    };
    expect(pullSchema.safeParse(bad).success).toBe(false);
  });
});

describe('pushResultSchema', () => {
  it('defaults conflicts to an empty list', () => {
    expect(pushResultSchema.parse({ acked: ['a'] }).conflicts).toEqual([]);
  });
});
