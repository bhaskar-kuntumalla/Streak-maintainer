export const EXPORT_VERSION = 1;

/** Shapes the personal-data export. Pure so the format can be tested and versioned. */
export function buildExportPayload(input: {
  exportedAt: string;
  habits: unknown[];
  completions: unknown[];
  dailyTasks: unknown[];
  checkIns: unknown[];
  weeklyPlans: unknown[];
  rewards: unknown[];
  settings: unknown;
}) {
  return {
    app: 'StreakOS',
    exportVersion: EXPORT_VERSION,
    exportedAt: input.exportedAt,
    counts: {
      habits: input.habits.length,
      completions: input.completions.length,
      dailyTasks: input.dailyTasks.length,
      checkIns: input.checkIns.length,
      weeklyPlans: input.weeklyPlans.length,
      rewards: input.rewards.length,
    },
    data: {
      habits: input.habits,
      completions: input.completions,
      dailyTasks: input.dailyTasks,
      checkIns: input.checkIns,
      weeklyPlans: input.weeklyPlans,
      rewards: input.rewards,
    },
    settings: input.settings,
  };
}
