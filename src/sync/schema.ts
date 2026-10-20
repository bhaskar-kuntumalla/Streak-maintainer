import { z } from 'zod';

export const OP_KINDS = [
  'habit.upsert',
  'completion.set',
  'task.upsert',
  'task.delete',
  'checkin.upsert',
  'weekplan.upsert',
  'reward.grant',
  'reward.revoke',
] as const;
export type OpKind = (typeof OP_KINDS)[number];

export const pushResultSchema = z.object({
  acked: z.array(z.string()),
  conflicts: z.array(z.string()).default([]),
});

const habitRow = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  category: z.string().nullable(),
  schedule_type: z.enum(['daily', 'weekdays', 'every_n_days']),
  weekdays: z.string(),
  interval_days: z.number().nullable(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  reminder_time: z.string().nullable(),
  status: z.enum(['active', 'archived']),
  pauses: z.string(),
  updated_at: z.string(),
});

const completionRow = z.object({
  habit_id: z.string(),
  date: z.string(),
  completed: z.boolean(),
  updated_at: z.string(),
});

const taskRow = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  duration_minutes: z.number().nullable(),
  completed: z.boolean(),
  deleted: z.boolean(),
  position: z.number(),
  updated_at: z.string(),
});

const checkInRow = z.object({
  date: z.string(),
  energy: z.number().nullable(),
  focus: z.number().nullable(),
  mood: z.number().nullable(),
  review: z.string().nullable(),
  updated_at: z.string(),
});

const planRow = z.object({
  week_start: z.string(),
  boss_title: z.string(),
  boss_completed: z.boolean(),
  updated_at: z.string(),
});

const rewardRow = z.object({
  event_id: z.string(),
  kind: z.string(),
  amount: z.number(),
  revoked: z.boolean(),
  updated_at: z.string(),
});

export const pullSchema = z.object({
  cursor: z.number().int().nonnegative(),
  habits: z.array(habitRow),
  completions: z.array(completionRow),
  daily_tasks: z.array(taskRow),
  daily_check_ins: z.array(checkInRow),
  weekly_plans: z.array(planRow),
  reward_ledger: z.array(rewardRow),
});

export type PullResponse = z.infer<typeof pullSchema>;
export type HabitRow = z.infer<typeof habitRow>;
export type CompletionRow = z.infer<typeof completionRow>;
export type TaskRow = z.infer<typeof taskRow>;
export type CheckInRow = z.infer<typeof checkInRow>;
export type PlanRow = z.infer<typeof planRow>;
export type RewardRow = z.infer<typeof rewardRow>;
