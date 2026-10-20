import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCompletions, useHabits, useToggleCompletion } from '@/data/hooks';
import { buildHistory, toCompletionMap, type DaySummary } from '@/domain/progress';
import { monthDates, monthStats, shiftMonth } from '@/domain/analytics';
import { weekDates, weekStartOf } from '@/domain/planning';
import { weekdayOf } from '@/domain/schedule';
import { localIsoDate } from '@/lib/date';
import { HabitBoard } from '@/components/HabitBoard';
import { Button, Card } from '@/components/ui';
import { brand, type Palette } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/settings/store';
import type { HabitRecord } from '@/data/habitRepository';

const EMPTY_HABITS: HabitRecord[] = [];
const EMPTY_ROWS: { habitId: string; date: string }[] = [];
const HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LABELS: Record<string, string> = {
  perfect: 'Perfect',
  consistent: 'Consistent',
  partial: 'Partial',
  missed: 'Missed',
  neutral: 'Unscheduled',
};

function cellStyle(status: string, palette: Palette) {
  switch (status) {
    case 'perfect':
      return { backgroundColor: palette.accent, color: '#0A0E2A' };
    case 'consistent':
      return { backgroundColor: `${palette.accent}88`, color: palette.text };
    case 'partial':
      return { backgroundColor: `${palette.accent}33`, color: palette.text };
    case 'missed':
      return { backgroundColor: `${brand.pink}40`, color: palette.text };
    default:
      return { backgroundColor: 'transparent', color: palette.textSecondary };
  }
}

export default function MonthScreen() {
  const { palette } = useTheme();
  const settings = useSettings();
  const today = localIsoDate();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [view, setView] = useState<'calendar' | 'board'>('calendar');
  const dates = useMemo(() => monthDates(ym), [ym]);

  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const toggle = useToggleCompletion();
  const habits = habitsQ.data ?? EMPTY_HABITS;
  const completionMap = useMemo(() => toCompletionMap(completionsQ.data ?? EMPTY_ROWS), [completionsQ.data]);
  const history = useMemo(() => buildHistory(habits, completionMap, today), [habits, completionMap, today]);

  if (habitsQ.isLoading || completionsQ.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const stats = monthStats(history.days, dates);
  const leading = (weekdayOf(dates[0]) + 6) % 7;
  const cells: (string | null)[] = [...Array.from({ length: leading }, () => null), ...dates];
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const monthLabel = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const boardHabits = habits.filter((h) => !h.archived);
  const weekStarts = Array.from(new Set(dates.map((d) => weekStartOf(d, settings.weekStartDay))));

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 16 }}>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: '800' }}>Month board</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button label="‹" variant="secondary" onPress={() => setYm(shiftMonth(ym, -1))} />
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>{monthLabel}</Text>
        <Button label="›" variant="secondary" onPress={() => setYm(shiftMonth(ym, 1))} />
      </View>

      <View style={{ flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' }}>
        {(['calendar', 'board'] as const).map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: view === v }}
            onPress={() => setView(v)}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: view === v ? palette.surface : 'transparent' }}
          >
            <Text style={{ color: view === v ? palette.accent : palette.textSecondary, fontWeight: '700', textTransform: 'capitalize' }}>{v}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Completion</Text>
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>{stats.percent}%</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>Perfect days</Text>
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>⭐ {stats.perfectDays}</Text>
        </View>
      </Card>

      {view === 'calendar' ? (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row' }}>
            {HEADERS.map((h, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', color: palette.textSecondary, fontSize: 12 }}>
                {h}
              </Text>
            ))}
          </View>
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 4 }}>
              {row.map((date, c) => {
                if (!date) return <View key={c} style={{ flex: 1, aspectRatio: 1 }} />;
                const s: DaySummary | undefined = history.days.get(date);
                const status = s?.status ?? 'neutral';
                const style = cellStyle(status, palette);
                const isToday = date === today;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityLabel={`${date}, ${LABELS[status]}${s ? `, ${s.completed} of ${s.eligible} done` : ''}`}
                    onPress={() => router.push({ pathname: '/day/[date]', params: { date } })}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isToday ? 2 : 1,
                      borderColor: isToday ? palette.text : palette.border,
                      backgroundColor: style.backgroundColor,
                    }}
                  >
                    <Text style={{ color: style.color, fontWeight: '700' }}>{Number(date.slice(8, 10))}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            Bright: perfect · medium: consistent · light: partial · pink: missed · dim: unscheduled
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          {weekStarts.map((ws, i) => (
            <HabitBoard
              key={ws}
              title={`Week ${i + 1}`}
              dates={weekDates(ws)}
              habits={boardHabits}
              completions={completionMap}
              today={today}
              onToggle={(habitId, date, completed) => toggle.mutate({ habitId, date, completed })}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
