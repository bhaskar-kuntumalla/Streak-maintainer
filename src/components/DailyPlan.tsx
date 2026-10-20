import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import {
  useAddTask,
  useCheckIns,
  useDeleteTask,
  useSaveCheckIn,
  useSetTaskCompleted,
  useTasks,
  useUpdateTask,
} from '@/data/planHooks';
import type { DailyTask } from '@/data/planRepository';
import { MAX_BIG3 } from '@/domain/planning';
import { tapFeedback } from '@/lib/haptics';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card } from './ui';

export function DailyPlan({ date }: { date: string }) {
  const { palette } = useTheme();
  const checkInsQ = useCheckIns(date, date);
  const tasksQ = useTasks(date, date);
  const save = useSaveCheckIn();

  if (checkInsQ.isLoading || tasksQ.isLoading) {
    return <ActivityIndicator color={palette.accent} />;
  }
  const checkIn = checkInsQ.data?.[0];

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 14 }}>
        <Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>How are you today?</Text>
        <MetricPicker
          label="Energy"
          value={checkIn?.energy ?? null}
          onChange={(v) => save.mutate({ date, patch: { energy: v } })}
        />
        <MetricPicker
          label="Focus"
          value={checkIn?.focus ?? null}
          onChange={(v) => save.mutate({ date, patch: { focus: v } })}
        />
        <MetricPicker
          label="Mood"
          value={checkIn?.mood ?? null}
          onChange={(v) => save.mutate({ date, patch: { mood: v } })}
        />
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>Big 3</Text>
        <Big3Editor date={date} tasks={tasksQ.data ?? []} />
      </Card>

      <ReviewBlock key={date} date={date} initial={checkIn?.review ?? ''} />
    </View>
  );
}

export function MetricPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: palette.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${n} of 5`}
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? null : n)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: selected ? palette.accent : palette.border,
                backgroundColor: selected ? palette.accent : 'transparent',
              }}
            >
              <Text style={{ color: selected ? '#0A0E2A' : palette.text, fontWeight: '600' }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Big3Editor({ date, tasks }: { date: string; tasks: DailyTask[] }) {
  const { palette } = useTheme();
  const add = useAddTask();
  const [draft, setDraft] = useState('');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const full = tasks.length >= MAX_BIG3;

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    const duration = minutes.trim() === '' ? null : Number(minutes);
    if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1440)) {
      setError('Duration must be whole minutes between 1 and 1440');
      return;
    }
    setError(null);
    add.mutate(
      { date, title, durationMinutes: duration },
      {
        onSuccess: () => {
          setDraft('');
          setMinutes('');
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not add task'),
      },
    );
  };

  return (
    <View style={{ gap: 10 }}>
      {tasks.length === 0 ? (
        <Text style={{ color: palette.textSecondary }}>Pick up to three things that matter most.</Text>
      ) : null}
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
      {full ? (
        <Text style={{ color: palette.textSecondary }}>Big 3 is full. Remove one to add another.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          <TextInput
            accessibilityLabel="New Big 3 task"
            placeholder="Add a task"
            placeholderTextColor={palette.textSecondary}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            style={{ color: palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
          />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              accessibilityLabel="Duration in minutes"
              placeholder="min"
              placeholderTextColor={palette.textSecondary}
              keyboardType="number-pad"
              value={minutes}
              onChangeText={setMinutes}
              style={{ width: 90, color: palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }}
            />
            <View style={{ flex: 1 }}>
              <Button label="Add" onPress={submit} disabled={add.isPending || draft.trim() === ''} />
            </View>
          </View>
        </View>
      )}
      {error ? <Text accessibilityRole="alert" style={{ color: brand.pink }}>{error}</Text> : null}
    </View>
  );
}

function TaskRow({ task }: { task: DailyTask }) {
  const { palette } = useTheme();
  const update = useUpdateTask();
  const toggle = useSetTaskCompleted();
  const remove = useDeleteTask();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const commit = () => {
    const next = title.trim();
    setEditing(false);
    if (!next || next === task.title) {
      setTitle(task.title);
      return;
    }
    update.mutate({ id: task.id, title: next, durationMinutes: task.durationMinutes });
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={`Complete ${task.title}`}
        onPress={() => {
          tapFeedback();
          toggle.mutate({ id: task.id, completed: !task.completed });
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: palette.accent,
          backgroundColor: task.completed ? palette.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#0A0E2A', fontWeight: '700' }}>{task.completed ? '✓' : ''}</Text>
      </Pressable>

      <View style={{ flex: 1 }}>
        {editing ? (
          <TextInput
            autoFocus
            accessibilityLabel="Edit task title"
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={commit}
            onBlur={commit}
            style={{ color: palette.text, fontSize: 16, borderBottomWidth: 1, borderColor: palette.border, paddingVertical: 4 }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${task.title}`}
            onPress={() => {
              setTitle(task.title);
              setEditing(true);
            }}
          >
            <Text style={{ color: palette.text, fontSize: 16, textDecorationLine: task.completed ? 'line-through' : 'none' }}>
              {task.title}
            </Text>
            {task.durationMinutes ? (
              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{task.durationMinutes} min</Text>
            ) : null}
          </Pressable>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${task.title}`}
        hitSlop={8}
        onPress={() => remove.mutate({ id: task.id })}
      >
        <Text style={{ color: palette.textSecondary, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}

function ReviewBlock({ date, initial }: { date: string; initial: string }) {
  const { palette } = useTheme();
  const save = useSaveCheckIn();
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);

  return (
    <Card style={{ gap: 10 }}>
      <Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>Daily review</Text>
      <TextInput
        accessibilityLabel="Daily review"
        multiline
        value={text}
        onChangeText={(t) => {
          setText(t);
          setSaved(false);
        }}
        placeholder="What went well? What will you change tomorrow?"
        placeholderTextColor={palette.textSecondary}
        style={{ color: palette.text, borderColor: palette.border, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 90, fontSize: 16, textAlignVertical: 'top' }}
      />
      <Button
        label={save.isPending ? 'Saving…' : saved ? 'Saved' : 'Save review'}
        disabled={save.isPending}
        onPress={() =>
          save.mutate({ date, patch: { review: text.trim() } }, { onSuccess: () => setSaved(true) })
        }
      />
    </Card>
  );
}
