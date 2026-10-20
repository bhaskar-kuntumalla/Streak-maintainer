import { evaluateAchievements } from './achievements';

const none = { completionCount: 0, longestConsistency: 0, perfectDays: 0, totalXp: 0 };

describe('evaluateAchievements', () => {
  it('locks everything for a new user', () => {
    expect(evaluateAchievements(none).every((a) => !a.unlocked)).toBe(true);
  });
  it('unlocks thresholds exactly at the goal', () => {
    const a = evaluateAchievements({ ...none, longestConsistency: 7, completionCount: 100 });
    expect(a.find((x) => x.id === 'seven_day')?.unlocked).toBe(true);
    expect(a.find((x) => x.id === 'hundred')?.unlocked).toBe(true);
    expect(a.find((x) => x.id === 'thirty_day')?.unlocked).toBe(false);
  });
  it('caps progress at the goal', () => {
    const a = evaluateAchievements({ ...none, totalXp: 9000 });
    expect(a.find((x) => x.id === 'xp_5000')?.progress).toBe(5000);
  });
});
