import { useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useCompletions, useHabits } from '@/data/hooks';
import { useSettings } from '@/settings/store';
import { localIsoDate } from '@/lib/date';
import { applyReminders, setupNotifications } from './scheduler';

/** Re-plans reminders whenever habits, completions, or settings change, and on foreground. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const habitsQ = useHabits();
  const completionsQ = useCompletions();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ settings, habits: habitsQ.data, completions: completionsQ.data });
  latest.current = { settings, habits: habitsQ.data, completions: completionsQ.data };

  const plan = () => {
    const { settings: s, habits, completions } = latest.current;
    if (!habits) return;
    const today = localIsoDate();
    const completedToday = new Set((completions ?? []).filter((c) => c.date === today).map((c) => c.habitId));
    void applyReminders(s, habits, completedToday, new Date(), today);
  };

  useEffect(() => {
    void setupNotifications();
  }, []);

  useEffect(() => {
    if (habitsQ.data === undefined) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(plan, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [settings, habitsQ.data, completionsQ.data]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') plan();
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
