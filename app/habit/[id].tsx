import { useMemo } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useArchiveHabit, useCompletions, useHabits, useSetPaused } from '@/data/hooks';
import { datesForHabit, toCompletionMap } from '@/domain/progress';
import { describeSchedule, habitStreak, isPausedOn } from '@/domain/schedule';
import { localIsoDate } from '@/lib/date';
import { Button, Card } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/settings/store';
import { formatTime } from '@/domain/settings';

export default function HabitDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const settings = useSettings();
  const today = localIsoDate();
  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const setPaused = useSetPaused();
  const archive = useArchiveHabit();

  const habit = habitsQ.data?.find((h) => h.id === id);
  const completionMap = useMemo(() => toCompletionMap(completionsQ.data ?? []), [completionsQ.data]);

  if (habitsQ.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }
  if (!habit) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <Text style={{ color: palette.text }}>Habit not found.</Text>
      </View>
    );
  }

  const dates = datesForHabit(completionMap, habit.id);
  const streak = habitStreak(habit, dates, today);
  const paused = isPausedOn(habit, today);
  const archived = habit.archived;

  const confirmArchive = () =>
    Alert.alert('Archive habit?', 'It will stop being scheduled. Past history is kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () =>
          archive.mutate(
            { id: habit.id, today },
            { onSuccess: () => router.back() },
          ),
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: habit.name, headerTintColor: palette.text, headerStyle: { backgroundColor: palette.background } }} />
      <ScrollView
        style={{ backgroundColor: palette.background }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
      >
        <Card>
          <Text style={{ fontSize: 40 }}>{habit.icon}</Text>
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{habit.name}</Text>
          {habit.description ? (
            <Text style={{ color: palette.textSecondary, marginTop: 6 }}>{habit.description}</Text>
          ) : null}
          <Text style={{ color: palette.textSecondary, marginTop: 10 }}>
            {describeSchedule(habit)} · {habit.category}
            {habit.reminderTime ? ` · Reminder ${formatTime(habit.reminderTime, settings.timeFormat)}` : ''}
          </Text>
          <Text style={{ color: palette.textSecondary, marginTop: 4 }}>
            Status: {archived ? 'Archived' : paused ? 'Paused' : 'Active'}
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Current streak</Text>
            <Text style={{ color: palette.text, fontSize: 26, fontWeight: '700' }}>{streak}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: palette.textSecondary, fontSize: 13 }}>Completions</Text>
            <Text style={{ color: palette.text, fontSize: 26, fontWeight: '700' }}>{dates.size}</Text>
          </Card>
        </View>

        {!archived ? (
          <View style={{ gap: 10 }}>
            <Button label="Edit habit" onPress={() => router.push({ pathname: '/habit/form', params: { id: habit.id } })} />
            <Button
              label={paused ? 'Resume habit' : 'Pause habit'}
              variant="secondary"
              disabled={setPaused.isPending}
              onPress={() => setPaused.mutate({ id: habit.id, paused: !paused, today })}
            />
            <Button label="Archive habit" variant="danger" onPress={confirmArchive} />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
