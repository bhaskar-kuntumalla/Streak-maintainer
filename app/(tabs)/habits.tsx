import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useCompletions, useHabits } from '@/data/hooks';
import { toCompletionMap, datesForHabit } from '@/domain/progress';
import { habitStreak } from '@/domain/schedule';
import { localIsoDate } from '@/lib/date';
import { HabitRow } from '@/components/HabitRow';
import { Button, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const ALL = 'All';

export default function HabitsScreen() {
  const { palette } = useTheme();
  const today = localIsoDate();
  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);

  const habits = useMemo(() => habitsQ.data ?? [], [habitsQ.data]);
  const completionMap = useMemo(
    () => toCompletionMap(completionsQ.data ?? []),
    [completionsQ.data],
  );

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(habits.map((h) => h.category))).sort()],
    [habits],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return habits.filter(
      (h) =>
        (category === ALL || h.category === category) &&
        (q === '' || h.name.toLowerCase().includes(q)),
    );
  }, [habits, query, category]);

  if (habitsQ.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: 60 }}>
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: palette.text, fontSize: 28, fontWeight: '700' }}>Habits</Text>
          <View style={{ width: 130 }}>
            <Button label="+ New" onPress={() => router.push('/habit/form')} />
          </View>
        </View>

        <TextInput
          accessibilityLabel="Search habits"
          placeholder="Search habits"
          placeholderTextColor={palette.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={{
            color: palette.text,
            borderColor: palette.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categories.map((c) => {
            const active = c === category;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(c)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? palette.accent : palette.border,
                  backgroundColor: active ? palette.accent : 'transparent',
                }}
              >
                <Text style={{ color: active ? '#0A0E2A' : palette.text, fontWeight: '600' }}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListEmptyComponent={
          <EmptyState
            title={habits.length === 0 ? 'No habits yet' : 'No matches'}
            body={habits.length === 0 ? 'Create your first habit to begin.' : 'Try a different search or category.'}
          />
        }
        renderItem={({ item: h }) => (
          <HabitRow
            habit={h}
            paused={h.pauses.some((p) => p.to === null)}
            streak={habitStreak(h, datesForHabit(completionMap, h.id), today)}
            xp={10}
            onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}
          />
        )}
      />
    </View>
  );
}
