import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildReminderPlan, toMinutes, type PlannedReminder, type ReminderHabit } from '@/domain/reminders';
import type { Settings } from '@/domain/settings';

export const CHANNEL_ID = 'reminders';
let lastScheduledCount = 0;

export function getLastScheduledCount(): number {
  return lastScheduledCount;
}

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

function toTrigger(r: PlannedReminder): Notifications.NotificationTriggerInput {
  switch (r.trigger.type) {
    case 'date': {
      const [y, mo, d] = r.trigger.date.split('-').map(Number);
      const mins = toMinutes(r.trigger.time);
      const when = new Date(y, mo - 1, d, Math.floor(mins / 60), mins % 60, 0, 0);
      return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID };
    }
    case 'daily': {
      const mins = toMinutes(r.trigger.time);
      return {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(mins / 60),
        minute: mins % 60,
        channelId: CHANNEL_ID,
      };
    }
    case 'weekly': {
      const mins = toMinutes(r.trigger.time);
      return {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // Expo uses 1 = Sunday ... 7 = Saturday. Settings use 0 = Sunday.
        weekday: r.trigger.weekday + 1,
        hour: Math.floor(mins / 60),
        minute: mins % 60,
        channelId: CHANNEL_ID,
      };
    }
  }
}

/**
 * Replaces every reminder this app scheduled with the current plan. Cancelling
 * first means repeated runs never duplicate, and archived or completed habits
 * are dropped without any extra bookkeeping.
 */
export async function applyReminders(
  settings: Settings,
  habits: ReminderHabit[],
  completedToday: Set<string>,
  now: Date,
  today: string,
): Promise<{ scheduled: number; permission: 'granted' | 'denied' | 'undetermined' }> {
  const perm = await Notifications.getPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.notifications.enabled || perm.status !== 'granted') {
    lastScheduledCount = 0;
    return { scheduled: 0, permission: perm.status };
  }

  const plan = buildReminderPlan({
    today,
    nowMinutes: now.getHours() * 60 + now.getMinutes(),
    habits,
    completedToday,
    settings: settings.notifications,
  });

  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.key,
      content: { title: r.title, body: r.body, data: { key: r.key } },
      trigger: toTrigger(r),
    });
  }
  lastScheduledCount = plan.length;
  return { scheduled: plan.length, permission: perm.status };
}
