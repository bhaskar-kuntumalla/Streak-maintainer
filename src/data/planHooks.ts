import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  addTask,
  deleteTask,
  getWeekPlan,
  listCheckIns,
  listTasks,
  saveBossTitle,
  saveCheckIn,
  setBossCompleted,
  setTaskCompleted,
  totalRewardXp,
  updateTask,
} from './planRepository';

function invalidatePlanning(qc: QueryClient) {
  return Promise.all(
    ['tasks', 'checkins', 'weekPlan', 'rewards'].map((key) => qc.invalidateQueries({ queryKey: [key] })),
  );
}

export function useTasks(start: string, end: string) {
  return useQuery({ queryKey: ['tasks', start, end], queryFn: () => listTasks(start, end) });
}

export function useCheckIns(start: string, end: string) {
  return useQuery({ queryKey: ['checkins', start, end], queryFn: () => listCheckIns(start, end) });
}

export function useWeekPlan(weekStart: string) {
  return useQuery({ queryKey: ['weekPlan', weekStart], queryFn: () => getWeekPlan(weekStart) });
}

export function useRewardXp() {
  return useQuery({ queryKey: ['rewards'], queryFn: totalRewardXp });
}

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, title, durationMinutes }: { date: string; title: string; durationMinutes: number | null }) =>
      addTask(date, title, durationMinutes),
    onSuccess: () => invalidatePlanning(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title, durationMinutes }: { id: string; title: string; durationMinutes: number | null }) =>
      updateTask(id, title, durationMinutes),
    onSuccess: () => invalidatePlanning(qc),
  });
}

export function useSetTaskCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => setTaskCompleted(id, completed),
    onSuccess: () => invalidatePlanning(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteTask(id),
    onSuccess: () => invalidatePlanning(qc),
  });
}

export function useSaveCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      date,
      patch,
    }: {
      date: string;
      patch: { energy?: number | null; focus?: number | null; mood?: number | null; review?: string };
    }) => saveCheckIn(date, patch),
    onSuccess: () => invalidatePlanning(qc),
  });
}

export function useSaveBossTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weekStart, title }: { weekStart: string; title: string }) => saveBossTitle(weekStart, title),
    onSuccess: () => invalidatePlanning(qc),
  });
}

export function useSetBossCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weekStart, completed }: { weekStart: string; completed: boolean }) =>
      setBossCompleted(weekStart, completed),
    onSuccess: () => invalidatePlanning(qc),
  });
}
