import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useCompletions, useHabits } from '@/data/hooks';
import { useCheckIns, useRewardXp } from '@/data/planHooks';
import { evaluateAchievements } from '@/domain/achievements';
import { average, categoryProgress, rangeDates } from '@/domain/analytics';
import { buildHistory, toCompletionMap, type CompletionMap } from '@/domain/progress';
import { levelFromXp, levelProgress, addDays } from '@/domain/rules';
import { localIsoDate } from '@/lib/date';
import { Card } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { HabitRecord } from '@/data/habitRepository';

const EMPTY_HABITS: HabitRecord[] = [];
const EMPTY_ROWS: { habitId: string; date: string }[] = [];

function countCompletions(map: CompletionMap): number {
  let total = 0;
  for (const ids of map.values()) total += ids.size;
  return total;
}

function Bar({ label, percent, color }: { label: string; percent: number; color: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: palette.text }}>{label}</Text>
        <Text style={{ color: palette.textSecondary }}>{percent}%</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${label} ${percent} percent`}
        style={{ height: 8, borderRadius: 4, backgroundColor: palette.border, overflow: 'hidden' }}
      >
        <View style={{ height: 8, width: `${Math.min(100, percent)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const { palette } = useTheme();
  const today = localIsoDate();
  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const rewardsQ = useRewardXp();
  const checkInsQ = useCheckIns(addDays(today, -13), today);

  const habits = habitsQ.data ?? EMPTY_HABITS;
  const map = useMemo(() => toCompletionMap(completionsQ.data ?? EMPTY_ROWS), [completionsQ.data]);
  const history = useMemo(() => buildHistory(habits, map, today), [habits, map, today]);

  if (habitsQ.isLoading || completionsQ.isLoading || checkInsQ.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const perfectDays = Array.from(history.days.values()).filter((d) => d.status === 'perfect').length;
  const totalXp = history.totalXp + (rewardsQ.data ?? 0);
  const level = levelFromXp(totalXp);
  const levelPct = Math.round(levelProgress(totalXp) * 100);
  const achievements = evaluateAchievements({
    completionCount: countCompletions(map),
    longestConsistency: history.longestConsistency,
    perfectDays,
    totalXp,
  });
  const categories = categoryProgress(habits, map, rangeRecent(today, 30));
  const checkIns = checkInsQ.data ?? [];
  const energy = average(checkIns.map((c) => c.energy));
  const focus = average(checkIns.map((c) => c.focus));
  const mood = average(checkIns.map((c) => c.mood));

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 16 }}>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: '700' }}>Progress</Text>

      <Card style={{ gap: 10 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Overview</Text>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>
          Level {level} · {totalXp} XP
        </Text>
        <Text style={{ color: palette.textSecondary }}>{levelPct}% to level {level + 1}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Stat label="Current streak" value={history.consistencyStreak} />
          <Stat label="Longest streak" value={history.longestConsistency} />
          <Stat label="Perfect days" value={perfectDays} />
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Last 14 days (out of 5)</Text>
        <Bar label="Energy" percent={energy === null ? 0 : Math.round((energy / 5) * 100)} color={palette.accent} />
        <Bar label="Focus" percent={focus === null ? 0 : Math.round((focus / 5) * 100)} color={palette.accent} />
        <Bar label="Mood" percent={mood === null ? 0 : Math.round((mood / 5) * 100)} color={palette.accent} />
        {checkIns.length === 0 ? (
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Log energy, focus, or mood on Today to see trends.</Text>
        ) : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Category completion (last 30 days)</Text>
        {categories.length === 0 ? (
          <Text style={{ color: palette.textSecondary }}>No scheduled habits in this period yet.</Text>
        ) : (
          categories.map((c) => <Bar key={c.category} label={c.category} percent={c.percent} color={palette.accent} />)
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Achievements</Text>
        {achievements.map((a) => (
          <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: a.unlocked ? palette.accent : palette.text, fontWeight: '600' }}>
                {a.unlocked ? '🏆 ' : ''}
                {a.title}
              </Text>
              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                {a.progress} / {a.goal}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function rangeRecent(today: string, days: number): string[] {
  return rangeDates(addDays(today, -(days - 1)), today);
}

function Stat({ label, value }: { label: string; value: number }) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
