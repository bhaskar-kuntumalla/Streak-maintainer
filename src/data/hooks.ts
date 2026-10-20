import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HabitValues } from '@/domain/habitValidation';
import {
  archiveHabit,
  listCompletions,
  listHabits,
  saveHabit,
  setCompletion,
  setPaused,
} from './habitRepository';

export const queryKeys = {
  habits: ['habits'] as const,
  completions: ['completions'] as const,
};

export function useHabits() {
  return useQuery({ queryKey: queryKeys.habits, queryFn: listHabits });
}

export function useCompletions() {
  return useQuery({ queryKey: queryKeys.completions, queryFn: listCompletions });
}

type CompletionRow = { habitId: string; date: string };

/** One-tap completion with optimistic update. XP is derived, so no reward can duplicate. */
export function useToggleCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date, completed }: { habitId: string; date: string; completed: boolean }) =>
      setCompletion(habitId, date, completed),
    onMutate: async ({ habitId, date, completed }) => {
      await qc.cancelQueries({ queryKey: queryKeys.completions });
      const previous = qc.getQueryData<CompletionRow[]>(queryKeys.completions);
      qc.setQueryData<CompletionRow[]>(queryKeys.completions, (old?: CompletionRow[]) => {
        const rest = (old ?? []).filter((r: CompletionRow) => !(r.habitId === habitId && r.date === date));
        return completed ? [...rest, { habitId, date }] : rest;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.completions, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.completions }),
  });
}

export function useSaveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ values, id }: { values: HabitValues; id?: string }) => saveHabit(values, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.habits }),
  });
}

export function useSetPaused() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paused, today }: { id: string; paused: boolean; today: string }) =>
      setPaused(id, paused, today),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.habits }),
  });
}

export function useArchiveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, today }: { id: string; today: string }) => archiveHabit(id, today),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.habits }),
  });
}
