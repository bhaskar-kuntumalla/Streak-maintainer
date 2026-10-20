import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { useCompletions, useHabits, useToggleCompletion } from '@/data/hooks';
import { useTasks, useWeekPlan, useSaveBossTitle, useSetBossCompleted } from '@/data/planHooks';
import { toCompletionMap } from '@/domain/progress';
import { addDays } from '@/domain/rules';
import { BOSS_SCORE, MAX_WEEK_SCORE, rankFor, weekDates, weekStartOf, weeklyScore } from '@/domain/planning';
import { formatLongDate, localIsoDate } from '@/lib/date';
import { Big3Editor } from '@/components/DailyPlan';
import { HabitBoard } from '@/components/HabitBoard';
import { useToast } from '@/components/Toast';
import { Button, Card } from '@/components/ui';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/settings/store';

const EMPTY_ROWS: { habitId: string; date: string }[] = [];

export default function WeekScreen() {
  const { palette } = useTheme();
  const today = localIsoDate();
  const toast = useToast();
  const settings = useSettings();
  const [weekStart, setWeekStart] = useState(() => weekStartOf(today, settings.weekStartDay));
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const weekEnd = dates[6];

  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const toggle = useToggleCompletion();
  const planQ = useWeekPlan(weekStart);
  const tasksQ = useTasks(weekStart, weekEnd);
  const saveBoss = useSaveBossTitle();
  const setBoss = useSetBossCompleted();
  const [bossDraft, setBossDraft] = useState<string | null>(null);

  const completionMap = useMemo(() => toCompletionMap(completionsQ.data ?? EMPTY_ROWS), [completionsQ.data]);
  const boardHabits = useMemo(() => (habitsQ.data ?? []).filter((h) => !h.archived), [habitsQ.data]);
  const tasks = tasksQ.data ?? [];
  const plan = planQ.data;
  const bossCompleted = plan?.bossCompleted ?? false;
  const big3Done = tasks.filter((t) => t.completed).length;
  const score = weeklyScore(big3Done, bossCompleted);
  const rank = rankFor(score);

  // Toast when the boss task flips to done (not on first load).
  const wasBossDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (planQ.isLoading) return;
    if (wasBossDone.current === false && bossCompleted) toast('Boss task done · +100 XP', 'boss');
    wasBossDone.current = bossCompleted;
  }, [bossCompleted, planQ.isLoading, toast]);

  if (planQ.isLoading || tasksQ.isLoading || habitsQ.isLoading || completionsQ.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const bossText = bossDraft ?? plan?.bossTitle ?? '';
  const changeWeek = (delta: number) => {
    setWeekStart(addDays(weekStart, delta * 7));
    setBossDraft(null);
  };

  return (
    <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={{ padding: 20, paddingTop: 56, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button label="‹" variant="secondary" onPress={() => changeWeek(-1)} />
        <Text style={{ color: palette.text, fontWeight: '700' }}>
          {formatLongDate(weekStart)} – {formatLongDate(weekEnd)}
        </Text>
        <Button label="›" variant="secondary" onPress={() => changeWeek(1)} />
      </View>

      <HabitBoard
        title={`Week of ${formatLongDate(weekStart)}`}
        dates={dates}
        habits={boardHabits}
        completions={completionMap}
        today={today}
        onToggle={(habitId, date, completed) => toggle.mutate({ habitId, date, completed })}
      />

      <Card style={{ gap: 10 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>WEEK SCORE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={{ color: palette.text, fontSize: 30, fontWeight: '800' }}>
            {Math.round((score / MAX_WEEK_SCORE) * 100)}%
          </Text>
          <Text style={{ color: palette.accent, fontWeight: '700' }}>{rank}</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.border, overflow: 'hidden' }}>
          <View style={{ height: 8, width: `${Math.round((score / MAX_WEEK_SCORE) * 100)}%`, backgroundColor: brand.violet }} />
        </View>
        <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
          {big3Done} Big 3 done{bossCompleted ? ` · boss +${BOSS_SCORE}` : ''}
        </Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>BOSS TASK · +100 XP</Text>
        <TextInput
          accessibilityLabel="Weekly boss task"
          placeholder="The one big thing this week"
          placeholderTextColor={palette.textSecondary}
          value={bossText}
          onChangeText={setBossDraft}
          editable={!bossCompleted}
          style={{ color: palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Save title"
              variant="secondary"
              disabled={saveBoss.isPending || bossCompleted || bossText.trim() === '' || bossText.trim() === (plan?.bossTitle ?? '')}
              onPress={() => saveBoss.mutate({ weekStart, title: bossText.trim() }, { onSuccess: () => setBossDraft(null) })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={bossCompleted ? 'Undo boss' : 'Complete boss'}
              disabled={setBoss.isPending || (!bossCompleted && (plan?.bossTitle ?? '').trim() === '')}
              onPress={() => setBoss.mutate({ weekStart, completed: !bossCompleted })}
            />
          </View>
        </View>
      </Card>

      {dates.map((date) => (
        <Card key={date} style={{ gap: 12 }}>
          <Text style={{ color: date === today ? palette.accent : palette.text, fontWeight: '700', fontSize: 16 }}>
            {formatLongDate(date)}
          </Text>
          <Big3Editor date={date} tasks={tasks.filter((t) => t.date === date)} />
        </Card>
      ))}
    </ScrollView>
  );
}
