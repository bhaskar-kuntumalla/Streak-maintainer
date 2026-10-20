import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the format HH:MM');

export const habitSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60, 'Keep the name under 60 characters'),
    description: z.string().trim().max(280, 'Keep the description under 280 characters').default(''),
    icon: z.string().min(1).max(8).default('✨'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color').default('#2EE6C5'),
    category: z.string().trim().min(1).max(30).default('General'),
    scheduleType: z.enum(['daily', 'weekdays', 'every_n_days']),
    weekdays: z.array(z.number().int().min(0).max(6)).default([]),
    intervalDays: z.number().int().min(2, 'Enter an interval of 2 or more days').max(365).nullable().default(null),
    startDate: isoDate,
    endDate: isoDate.nullable().default(null),
    reminderTime: clockTime.nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.scheduleType === 'weekdays' && v.weekdays.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weekdays'], message: 'Pick at least one day' });
    }
    if (v.scheduleType === 'every_n_days' && v.intervalDays === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['intervalDays'], message: 'Enter an interval of 2 or more days' });
    }
    if (v.endDate !== null && v.endDate < v.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date must be on or after the start date' });
    }
  });

export type HabitValues = z.output<typeof habitSchema>;
