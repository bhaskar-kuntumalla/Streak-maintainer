import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCompletions, useHabits, useToggleCompletion } from '@/data/hooks';
import { useTasks } from '@/data/planHooks';
import { datesForHabit, summarizeDay, toCompletionMap } from '@/domain/progress';
import { habitStreak, isScheduledOn } from '@/domain/schedule';
import { MAX_BIG3 } from '@/domain/planning';
import { formatLongDate, localIsoDate } from '@/lib/date';
import { ActivityRings } from '@/components/Rings';
import { Big3Editor } from '@/components/DailyPlan';
import { HabitRow } from '@/components/HabitRow';
import { Card } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { palette } = useTheme();
  const today = localIsoDate();
  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const tasksQ = useTasks(date, date);
  const toggle = useToggleCompletion();

  const habits = useMemo(() => habitsQ.data ?? [], [habitsQ.data]);
  const map = useMemo(() => toCompletionMap(completionsQ.data ?? []), [completionsQ.data]);

  if (habitsQ.isLoading || completionsQ.isLoading || tasksQ.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const scheduled = habits.filter((h) => isScheduledOn(h, date));
  const summary = summarizeDay(habits, map, date);
  const done = map.get(date) ?? new Set<string>();
  const tasks = tasksQ.data ?? [];
  const big3Done = tasks.filter((t) => t.completed).length;
  const totalItems = summary.eligible + MAX_BIG3;
  const doneItems = summary.completed + big3Done;
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const isToday = date === today;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Day', headerTintColor: palette.text, headerStyle: { backgroundColor: palette.background } }} />
      <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={{ color: palette.text, fontSize: 26, fontWeight: '800' }}>
            {new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).toLocaleDateString(undefined, { weekday: 'long' })}
          </Text>
          <Text style={{ color: isToday ? palette.accent : palette.textSecondary, fontWeight: '600' }}>
            {formatLongDate(date)}{isToday ? ' · Today' : ''}
          </Text>
        </View>

        <Card>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <ActivityRings
              size={130}
              stroke={12}
              rings={[{ value: pct / 100, color: brand.violet, label: 'Done', detail: `${pct}%` }]}
            />
            <Text style={{ color: palette.textSecondary }}>
              {doneItems} of {totalItems} done · {summary.status}
            </Text>
          </View>
        </Card>

        <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
          BIG 3 · +{10} XP EACH
        </Text>
        <Card style={{ gap: 12 }}>
          <Big3Editor date={date} tasks={tasks} />
        </Card>

        <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>HABITS</Text>
        {scheduled.length === 0 ? (
          <Card>
            <Text style={{ color: palette.textSecondary }}>No habits were scheduled for this day.</Text>
          </Card>
        ) : (
          scheduled.map((h) => {
            const isDone = done.has(h.id);
            return (
              <HabitRow
                key={h.id}
                habit={h}
                done={isDone}
                streak={habitStreak(h, datesForHabit(map, h.id), date)}
                xp={10}
                onToggle={() => toggle.mutate({ habitId: h.id, date, completed: !isDone })}
                onOpen={() => {}}
              />
            );
          })
        )}
      </ScrollView>
    </>
  );
}
