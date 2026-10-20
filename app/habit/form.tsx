import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useHabits, useSaveHabit } from '@/data/hooks';
import { habitSchema, type HabitValues } from '@/domain/habitValidation';
import { localIsoDate } from '@/lib/date';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card } from '@/components/ui';
import type { HabitRecord } from '@/data/habitRepository';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const COLORS = [brand.mint, brand.violet, brand.cyan, brand.blue, brand.pink, brand.yellow];

export default function HabitFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { palette } = useTheme();
  const habitsQ = useHabits();

  if (id && habitsQ.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }
  const existing = id ? habitsQ.data?.find((h) => h.id === id) : undefined;
  // Remount per habit so initial state is taken from the loaded record.
  return <HabitFormBody key={existing?.id ?? 'new'} existing={existing} />;
}

function HabitFormBody({ existing }: { existing?: HabitRecord }) {
  const { palette } = useTheme();
  const save = useSaveHabit();
  const today = localIsoDate();

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '✨');
  const [category, setCategory] = useState(existing?.category ?? 'General');
  const [color, setColor] = useState(existing?.color ?? brand.mint);
  const [scheduleType, setScheduleType] = useState<HabitValues['scheduleType']>(existing?.scheduleType ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [1, 2, 3, 4, 5]);
  const [intervalText, setIntervalText] = useState(existing?.intervalDays ? String(existing.intervalDays) : '2');
  const [startDate, setStartDate] = useState(existing?.startDate ?? today);
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [reminderTime, setReminderTime] = useState(existing?.reminderTime ?? '');
  const [error, setError] = useState<string | null>(null);

  const field = (label: string) => ({
    accessibilityLabel: label,
    placeholderTextColor: palette.textSecondary,
    style: {
      color: palette.text,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    } as const,
  });

  const toggleWeekday = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = () => {
    const parsed = habitSchema.safeParse({
      name,
      description,
      icon,
      color,
      category,
      scheduleType,
      weekdays: scheduleType === 'weekdays' ? weekdays : [],
      intervalDays: scheduleType === 'every_n_days' && intervalText.trim() !== '' ? Number(intervalText) : null,
      startDate: startDate.trim(),
      endDate: endDate.trim() === '' ? null : endDate.trim(),
      reminderTime: reminderTime.trim() === '' ? null : reminderTime.trim(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }
    setError(null);
    save.mutate(
      { values: parsed.data, id: existing?.id },
      { onSuccess: () => router.back(), onError: () => setError('Could not save. Please try again.') },
    );
  };

  const chip = (active: boolean) => ({
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? palette.accent : palette.border,
    backgroundColor: active ? palette.accent : 'transparent',
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: true, title: existing ? 'Edit habit' : 'New habit', headerTintColor: palette.text, headerStyle: { backgroundColor: palette.background } }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <Text style={{ color: palette.textSecondary }}>Name</Text>
          <TextInput value={name} onChangeText={setName} {...field('Habit name')} />

          <Text style={{ color: palette.textSecondary }}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} multiline {...field('Description')} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: palette.textSecondary }}>Icon</Text>
              <TextInput value={icon} onChangeText={setIcon} maxLength={4} {...field('Icon')} />
            </View>
            <View style={{ flex: 2, gap: 8 }}>
              <Text style={{ color: palette.textSecondary }}>Category</Text>
              <TextInput value={category} onChangeText={setCategory} {...field('Category')} />
            </View>
          </View>

          <Text style={{ color: palette.textSecondary }}>Color</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected: c === color }}
                onPress={() => setColor(c)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: c,
                  borderWidth: c === color ? 3 : 0,
                  borderColor: palette.text,
                }}
              />
            ))}
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={{ color: palette.textSecondary }}>Schedule</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(
              [
                ['daily', 'Daily'],
                ['weekdays', 'Weekdays'],
                ['every_n_days', 'Every N days'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: scheduleType === value }}
                onPress={() => setScheduleType(value)}
                style={chip(scheduleType === value)}
              >
                <Text style={{ color: scheduleType === value ? '#0A0E2A' : palette.text, fontWeight: '600' }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {scheduleType === 'weekdays' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {WEEK.map((letter, d) => (
                <Pressable
                  key={d}
                  accessibilityRole="checkbox"
                  accessibilityLabel={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}
                  accessibilityState={{ checked: weekdays.includes(d) }}
                  onPress={() => toggleWeekday(d)}
                  style={{ ...chip(weekdays.includes(d)), width: 40, alignItems: 'center' }}
                >
                  <Text style={{ color: weekdays.includes(d) ? '#0A0E2A' : palette.text, fontWeight: '600' }}>{letter}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {scheduleType === 'every_n_days' ? (
            <TextInput
              value={intervalText}
              onChangeText={setIntervalText}
              keyboardType="number-pad"
              {...field('Interval in days')}
            />
          ) : null}
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={{ color: palette.textSecondary }}>Start date (YYYY-MM-DD)</Text>
          <TextInput value={startDate} onChangeText={setStartDate} {...field('Start date')} />

          <Text style={{ color: palette.textSecondary }}>End date (optional)</Text>
          <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" {...field('End date')} />

          <Text style={{ color: palette.textSecondary }}>Reminder time (optional, HH:MM)</Text>
          <TextInput value={reminderTime} onChangeText={setReminderTime} placeholder="HH:MM" {...field('Reminder time')} />
        </Card>

        {error ? <Text accessibilityRole="alert" style={{ color: brand.pink }}>{error}</Text> : null}

        <Button label={save.isPending ? 'Saving…' : 'Save habit'} onPress={submit} disabled={save.isPending} />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
