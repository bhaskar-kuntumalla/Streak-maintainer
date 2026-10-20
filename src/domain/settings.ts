import { z } from 'zod';

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

export const settingsSchema = z.object({
  displayName: z.string().trim().max(40).default(''),
  timezone: z.string().min(1).default('UTC'),
  weekStartDay: z.union([z.literal(0), z.literal(1)]).default(1),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  accent: z.enum(['mint', 'violet', 'cyan', 'pink']).default('mint'),
  notifications: z
    .object({
      enabled: z.boolean().default(false),
      habitReminders: z.boolean().default(true),
      checkIn: z.object({ enabled: z.boolean().default(true), time: clockTime.default('08:00') }).default({}),
      eveningReview: z.object({ enabled: z.boolean().default(true), time: clockTime.default('21:00') }).default({}),
      weeklyPlanning: z
        .object({
          enabled: z.boolean().default(true),
          weekday: z.number().int().min(0).max(6).default(1),
          time: clockTime.default('09:00'),
        })
        .default({}),
      quietHours: z.object({ start: clockTime, end: clockTime }).nullable().default(null),
    })
    .default({}),
});

export type Settings = z.infer<typeof settingsSchema>;
export type NotificationSettings = Settings['notifications'];

export function defaultSettings(timezone: string): Settings {
  return settingsSchema.parse({ timezone });
}

/** Formats HH:MM for display, respecting the 12h or 24h preference. */
export function formatTime(hhmm: string, timeFormat: Settings['timeFormat']): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (timeFormat === '24h') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Formats YYYY-MM-DD for display, respecting the date preference. */
export function formatDate(iso: string, dateFormat: Settings['dateFormat']): string {
  const [y, m, d] = iso.split('-');
  switch (dateFormat) {
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`;
    case 'MM/DD/YYYY':
      return `${m}/${d}/${y}`;
    case 'YYYY-MM-DD':
      return iso;
  }
}
