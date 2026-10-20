import { buildExportPayload, EXPORT_VERSION } from './exportData';

describe('buildExportPayload', () => {
  it('reports accurate counts and a version', () => {
    const p = buildExportPayload({
      exportedAt: '2026-10-20T00:00:00Z',
      habits: [{ id: 'a' }, { id: 'b' }],
      completions: [{ habit_id: 'a' }],
      dailyTasks: [],
      checkIns: [],
      weeklyPlans: [],
      rewards: [{ event_id: 'boss:2026-10-19' }],
      settings: { timezone: 'UTC' },
    });
    expect(p.exportVersion).toBe(EXPORT_VERSION);
    expect(p.counts).toMatchObject({ habits: 2, completions: 1, rewards: 1 });
    expect(p.data.habits).toHaveLength(2);
  });
});
