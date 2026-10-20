import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useCompletions, useHabits, useToggleCompletion } from '@/data/hooks';
import { useRewardXp, useTasks } from '@/data/planHooks';
import type { HabitRecord } from '@/data/habitRepository';
import { useAuth } from '@/auth/AuthProvider';
import { buildHistory, datesForHabit, summarizeDay, toCompletionMap } from '@/domain/progress';
import { PERFECT_DAY_BONUS, XP_PER_COMPLETION, levelFromXp, levelProgress } from '@/domain/rules';
import { describeSchedule, habitStreak, isScheduledOn } from '@/domain/schedule';
import { habitMonthPercent } from '@/domain/analytics';
import { BIG3_XP, MAX_BIG3 } from '@/domain/planning';
import { localIsoDate, formatLongDate } from '@/lib/date';
import { tapFeedback } from '@/lib/haptics';
import { ActivityRings } from '@/components/Rings';
import { DailyPlan } from '@/components/DailyPlan';
import { HabitRow } from '@/components/HabitRow';
import { SyncBadge } from '@/components/SyncBadge';
import { useToast } from '@/components/Toast';
import { Button, EmptyState } from '@/components/ui';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const EMPTY_HABITS: HabitRecord[] = [];
const EMPTY_ROWS: { habitId: string; date: string }[] = [];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <Text style={{ color: palette.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color, fontSize: 16, fontWeight: '800', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export default function TodayScreen() {
  const { palette } = useTheme();
  const today = localIsoDate();
  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const rewardsQ = useRewardXp();
  const tasksQ = useTasks(today, today);
  const toggle = useToggleCompletion();
  const { signOut } = useAuth();
  const toast = useToast();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const habits = habitsQ.data ?? EMPTY_HABITS;
  const completionMap = useMemo(() => toCompletionMap(completionsQ.data ?? EMPTY_ROWS), [completionsQ.data]);
  const history = useMemo(() => buildHistory(habits, completionMap, today), [habits, completionMap, today]);
  const summary = useMemo(() => summarizeDay(habits, completionMap, today), [habits, completionMap, today]);
  const doneToday = completionMap.get(today) ?? new Set<string>();
  const scheduled = useMemo(() => habits.filter((h) => !h.archived && isScheduledOn(h, today)), [habits, today]);
  const big3 = tasksQ.data ?? [];
  const big3Done = big3.filter((t) => t.completed).length;

  const ready = !habitsQ.isLoading && !completionsQ.isLoading && !rewardsQ.isLoading && !tasksQ.isLoading;
  const totalXp = history.totalXp + (rewardsQ.data ?? 0);
  const level = levelFromXp(totalXp);
  const levelPct = Math.round(levelProgress(totalXp) * 100);
  const perfectDays = Array.from(history.days.values()).filter((d) => d.status === 'perfect').length;

  // Celebrate level-ups and perfect days, but not the first load.
  const previous = useRef<{ level: number; perfect: boolean } | null>(null);
  useEffect(() => {
    if (!ready) return;
    const current = { level, perfect: summary.status === 'perfect' };
    const before = previous.current;
    if (before) {
      if (current.level > before.level) toast(`Level ${current.level} unlocked`, 'level');
      if (current.perfect && !before.perfect) toast(`Perfect day · +${PERFECT_DAY_BONUS} XP`, 'xp');
    }
    previous.current = current;
  }, [ready, level, summary.status, toast]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const habitsDone = summary.completed;
  const habitsTotal = summary.eligible;
  const xpEarned = summary.xp + big3Done * BIG3_XP;
  const xpTarget = habitsTotal * XP_PER_COMPLETION + PERFECT_DAY_BONUS + MAX_BIG3 * BIG3_XP;

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 16 }}>
      <View>
        <Text style={{ color: palette.textSecondary, fontSize: 13 }}>{formatLongDate(today)}</Text>
        <Text style={{ color: palette.text, fontSize: 28, fontWeight: '800', marginTop: 2 }}>{greeting()}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SyncBadge />
          <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} hitSlop={8}>
            <Text style={{ color: palette.accent, fontWeight: '700' }}>Settings</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="LEVEL" value={`${level}`} color={brand.yellow} />
          <Chip label="STREAK" value={`🔥 ${history.consistencyStreak}`} color={palette.text} />
          <Chip label="PERFECT" value={`⭐ ${perfectDays}`} color={palette.text} />
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.border, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${levelPct}%`, backgroundColor: brand.yellow }} />
        </View>
        <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
          {totalXp} XP · {levelPct}% to level {level + 1}
        </Text>
      </View>

      <View
        style={{ borderRadius: 20, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: 18 }}
      >
        <ActivityRings
          rings={[
            { value: habitsTotal ? habitsDone / habitsTotal : 0, color: palette.accent, label: 'Habits', detail: `${habitsDone}/${habitsTotal}` },
            { value: big3Done / MAX_BIG3, color: brand.pink, label: 'Big 3', detail: `${big3Done}/${MAX_BIG3}` },
            { value: xpTarget ? xpEarned / xpTarget : 0, color: brand.yellow, label: 'XP', detail: `${xpEarned}/${xpTarget}` },
          ]}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
          HABITS · +{XP_PER_COMPLETION} XP EACH
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/habits')} hitSlop={8}>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>Manage</Text>
        </Pressable>
      </View>

      {scheduled.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          body="Add a habit to start building your streak."
          action={<Button label="Add habit" onPress={() => router.push('/habit/form')} />}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {scheduled.map((h) => {
            const dates = datesForHabit(completionMap, h.id);
            const done = doneToday.has(h.id);
            const streak = habitStreak(h, dates, today);
            const pct = habitMonthPercent(h, dates, today);
            return (
              <HabitRow
                key={h.id}
                habit={h}
                done={done}
                streak={streak}
                xp={XP_PER_COMPLETION}
                meta={`${dates.size} · ${pct}% this month · ${describeSchedule(h)}`}
                onToggle={() => toggle.mutate({ habitId: h.id, date: today, completed: !done })}
                onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}
              />
            );
          })}
        </View>
      )}

      <DailyPlan date={today} />

      <Button label="+ Add habit" variant="secondary" onPress={() => router.push('/habit/form')} />
      {signOutError ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{signOutError}</Text> : null}
      <Button
        label="Sign out"
        variant="danger"
        onPress={() => {
          setSignOutError(null);
          signOut().catch((e: unknown) => setSignOutError(e instanceof Error ? e.message : 'Sign out failed'));
        }}
      />
    </ScrollView>
  );
}

