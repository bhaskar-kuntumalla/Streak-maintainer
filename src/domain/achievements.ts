export type AchievementInput = {
  completionCount: number;
  longestConsistency: number;
  perfectDays: number;
  totalXp: number;
};

type Def = { id: string; title: string; goal: number; value: (i: AchievementInput) => number };

/**
 * Working definitions. "Seven-Day" and "30-Day" use the longest consistency
 * streak. Confirm against the website before release.
 */
export const ACHIEVEMENT_DEFS: Def[] = [
  { id: 'first_habit', title: 'First Habit Completed', goal: 1, value: (i) => i.completionCount },
  { id: 'seven_day', title: 'Seven-Day Consistency', goal: 7, value: (i) => i.longestConsistency },
  { id: 'first_perfect', title: 'First Perfect Day', goal: 1, value: (i) => i.perfectDays },
  { id: 'thirty_day', title: '30-Day Milestone', goal: 30, value: (i) => i.longestConsistency },
  { id: 'hundred', title: '100 Habits Completed', goal: 100, value: (i) => i.completionCount },
  { id: 'xp_5000', title: '5,000 XP Earned', goal: 5000, value: (i) => i.totalXp },
];

export type Achievement = { id: string; title: string; goal: number; progress: number; unlocked: boolean };

export function evaluateAchievements(input: AchievementInput): Achievement[] {
  return ACHIEVEMENT_DEFS.map((def) => {
    const value = def.value(input);
    return {
      id: def.id,
      title: def.title,
      goal: def.goal,
      progress: Math.min(value, def.goal),
      unlocked: value >= def.goal,
    };
  });
}
