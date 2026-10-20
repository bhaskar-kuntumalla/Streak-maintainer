import { Pressable, Text, View } from 'react-native';
import { describeSchedule, type HabitSchedule } from '@/domain/schedule';
import { tapFeedback } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

export type HabitRowProps = {
  habit: HabitSchedule & { id: string; name: string; icon: string; color: string; category: string };
  done?: boolean;
  streak: number;
  xp: number;
  paused?: boolean;
  meta?: string;
  onToggle?: () => void;
  onOpen: () => void;
};

export function HabitRow({ habit, done, streak, xp, paused, meta, onToggle, onOpen }: HabitRowProps) {
  const { palette } = useTheme();
  const checkable = onToggle !== undefined;
  const subtitle = meta ?? `${paused ? 'Paused' : describeSchedule(habit)}${streak > 0 ? ` · 🔥 ${streak}` : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${habit.name}`}
      onPress={onOpen}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: `${habit.color}33`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22 }}>{habit.icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {checkable ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!done }}
          accessibilityLabel={`Mark ${habit.name} ${done ? 'not done' : 'done'}`}
          onPress={() => {
            tapFeedback();
            onToggle?.();
          }}
          hitSlop={8}
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: done ? palette.accent : palette.border,
            backgroundColor: done ? palette.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? <Text style={{ color: '#0A0E2A', fontWeight: '800' }}>✓</Text> : null}
        </Pressable>
      ) : (
        <Text style={{ color: habit.color, fontWeight: '700', fontSize: 13 }}>+{xp} XP</Text>
      )}
    </Pressable>
  );
}
