import { Pressable, Text, View } from 'react-native';
import type { CompletionMap } from '@/domain/progress';
import { isScheduledOn, type HabitSchedule } from '@/domain/schedule';
import { tapFeedback } from '@/lib/haptics';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export type BoardHabit = HabitSchedule & { id: string; name: string; icon: string; color: string };

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Habits as rows, days as columns. Tap a scheduled, non-future cell to toggle it. */
export function HabitBoard({
  title,
  dates,
  habits,
  completions,
  today,
  onToggle,
}: {
  title: string;
  dates: string[];
  habits: BoardHabit[];
  completions: CompletionMap;
  today: string;
  onToggle: (habitId: string, date: string, completed: boolean) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }}>
      <View style={{ backgroundColor: brand.violet, paddingVertical: 8, paddingHorizontal: 12 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{title}</Text>
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, gap: 6 }}>
        <View style={{ width: 24 }} />
        {dates.map((d, i) => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: palette.textSecondary, fontSize: 10 }}>{LETTERS[i]}</Text>
            <Text style={{ color: d === today ? palette.accent : palette.text, fontSize: 12, fontWeight: '700' }}>
              {Number(d.slice(8, 10))}
            </Text>
          </View>
        ))}
      </View>
      {habits.map((h) => (
        <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, gap: 6 }}>
          <Text style={{ width: 24, fontSize: 15, textAlign: 'center' }}>{h.icon}</Text>
          {dates.map((d) => {
            const scheduled = isScheduledOn(h, d);
            const done = completions.get(d)?.has(h.id) ?? false;
            const tappable = scheduled && d <= today;
            return (
              <Pressable
                key={d}
                disabled={!tappable}
                accessibilityRole="checkbox"
                accessibilityLabel={`${h.name} on ${d}`}
                accessibilityState={{ checked: done, disabled: !tappable }}
                onPress={() => {
                  tapFeedback();
                  onToggle(h.id, d, !done);
                }}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 8,
                  borderWidth: done ? 0 : 1,
                  borderColor: palette.border,
                  backgroundColor: done ? palette.accent : 'transparent',
                  opacity: scheduled ? 1 : 0.25,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? <Text style={{ color: '#0A0E2A', fontWeight: '800', fontSize: 12 }}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
