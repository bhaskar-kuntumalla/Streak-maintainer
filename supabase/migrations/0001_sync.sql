-- StreakOS sync schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Design: every synced row carries updated_at (client write time) and server_seq
-- (monotonic cursor set by trigger). Writes are idempotent via applied_ops.

create sequence if not exists public.sync_seq;

create or replace function public.touch_seq() returns trigger
language plpgsql as $$
begin
  new.server_seq := nextval('public.sync_seq');
  return new;
end $$;

-- ---------- tables ----------
create table if not exists public.habits (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  description text,
  icon text,
  color text,
  category text,
  schedule_type text not null check (schedule_type in ('daily','weekdays','every_n_days')),
  weekdays text not null default '[]',
  interval_days int,
  start_date date not null,
  end_date date,
  reminder_time text,
  status text not null default 'active' check (status in ('active','archived')),
  pauses text not null default '[]',
  updated_at timestamptz not null,
  server_seq bigint not null default 0,
  primary key (user_id, id)
);

create table if not exists public.completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null,
  date date not null,
  completed boolean not null,
  updated_at timestamptz not null,
  server_seq bigint not null default 0,
  primary key (user_id, habit_id, date)
);

create table if not exists public.daily_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  date date not null,
  title text not null,
  duration_minutes int,
  completed boolean not null default false,
  deleted boolean not null default false,
  position int not null default 0,
  updated_at timestamptz not null,
  server_seq bigint not null default 0,
  primary key (user_id, id)
);

create table if not exists public.daily_check_ins (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  energy int check (energy between 1 and 5),
  focus int check (focus between 1 and 5),
  mood int check (mood between 1 and 5),
  review text,
  updated_at timestamptz not null,
  server_seq bigint not null default 0,
  primary key (user_id, date)
);

create table if not exists public.weekly_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  boss_title text not null default '',
  boss_completed boolean not null default false,
  updated_at timestamptz not null,
  server_seq bigint not null default 0,
  primary key (user_id, week_start)
);

create table if not exists public.reward_ledger (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  kind text not null,
  amount int not null,
  revoked boolean not null default false,
  updated_at timestamptz not null,
  server_seq bigint not null default 0,
  primary key (user_id, event_id)
);

create table if not exists public.applied_ops (
  user_id uuid not null references auth.users(id) on delete cascade,
  op_id text not null,
  applied_at timestamptz not null default now(),
  primary key (user_id, op_id)
);

-- ---------- sequence triggers and indexes ----------
do $$
declare t text;
begin
  foreach t in array array['habits','completions','daily_tasks','daily_check_ins','weekly_plans','reward_ledger'] loop
    execute format('create trigger %I_seq before insert or update on public.%I for each row execute function public.touch_seq()', t, t);
    execute format('create index if not exists %I on public.%I (user_id, server_seq)', t || '_user_seq_idx', t);
  end loop;
end $$;

-- ---------- row level security ----------
do $$
declare t text;
begin
  foreach t in array array['habits','completions','daily_tasks','daily_check_ins','weekly_plans','reward_ledger','applied_ops'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_owner', t);
  end loop;
end $$;

-- ---------- push: idempotent, last-writer-wins by client updated_at ----------
-- Each op is applied at most once (applied_ops). Upserts only win when the incoming
-- updated_at is not older than the stored one; rejected ops are reported as conflicts,
-- and the client adopts the server row on its next pull.
create or replace function public.sync_push(ops jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
  op jsonb;
  p jsonb;
  v_kind text;
  v_op_id text;
  v_affected int;
  acked text[] := '{}';
  conflicts text[] := '{}';
begin
  if uid is null then raise exception 'not authenticated'; end if;

  for op in select * from jsonb_array_elements(ops) loop
    v_op_id := op->>'opId';
    v_kind := op->>'kind';
    p := op->'payload';

    if exists (select 1 from public.applied_ops where user_id = uid and op_id = v_op_id) then
      acked := acked || v_op_id;
      continue;
    end if;

    case v_kind
      when 'habit.upsert' then
        insert into public.habits as h (user_id, id, name, description, icon, color, category,
          schedule_type, weekdays, interval_days, start_date, end_date, reminder_time, status, pauses, updated_at)
        values (uid, p->>'id', p->>'name', p->>'description', p->>'icon', p->>'color', p->>'category',
          p->>'schedule_type', coalesce(p->>'weekdays', '[]'), nullif(p->>'interval_days', '')::int,
          (p->>'start_date')::date, nullif(p->>'end_date', '')::date, p->>'reminder_time',
          coalesce(p->>'status', 'active'), coalesce(p->>'pauses', '[]'), (p->>'updated_at')::timestamptz)
        on conflict (user_id, id) do update set
          name = excluded.name, description = excluded.description, icon = excluded.icon,
          color = excluded.color, category = excluded.category, schedule_type = excluded.schedule_type,
          weekdays = excluded.weekdays, interval_days = excluded.interval_days,
          start_date = excluded.start_date, end_date = excluded.end_date,
          reminder_time = excluded.reminder_time, status = excluded.status,
          pauses = excluded.pauses, updated_at = excluded.updated_at
        where h.updated_at <= excluded.updated_at;
        get diagnostics v_affected = row_count;

      when 'completion.set' then
        insert into public.completions as c (user_id, habit_id, date, completed, updated_at)
        values (uid, p->>'habit_id', (p->>'date')::date, (p->>'completed')::boolean, (p->>'updated_at')::timestamptz)
        on conflict (user_id, habit_id, date) do update set
          completed = excluded.completed, updated_at = excluded.updated_at
        where c.updated_at <= excluded.updated_at;
        get diagnostics v_affected = row_count;

      when 'task.upsert' then
        insert into public.daily_tasks as t (user_id, id, date, title, duration_minutes, completed, deleted, position, updated_at)
        values (uid, p->>'id', (p->>'date')::date, p->>'title', nullif(p->>'duration_minutes', '')::int,
          (p->>'completed')::boolean, false, coalesce((p->>'position')::int, 0), (p->>'updated_at')::timestamptz)
        on conflict (user_id, id) do update set
          date = excluded.date, title = excluded.title, duration_minutes = excluded.duration_minutes,
          completed = excluded.completed, deleted = false, position = excluded.position,
          updated_at = excluded.updated_at
        where t.updated_at <= excluded.updated_at;
        get diagnostics v_affected = row_count;

      when 'task.delete' then
        update public.daily_tasks set deleted = true, updated_at = (p->>'updated_at')::timestamptz
        where user_id = uid and id = p->>'id' and updated_at <= (p->>'updated_at')::timestamptz;
        get diagnostics v_affected = row_count;

      when 'checkin.upsert' then
        insert into public.daily_check_ins as k (user_id, date, energy, focus, mood, review, updated_at)
        values (uid, (p->>'date')::date, nullif(p->>'energy', '')::int, nullif(p->>'focus', '')::int,
          nullif(p->>'mood', '')::int, p->>'review', (p->>'updated_at')::timestamptz)
        on conflict (user_id, date) do update set
          energy = excluded.energy, focus = excluded.focus, mood = excluded.mood,
          review = excluded.review, updated_at = excluded.updated_at
        where k.updated_at <= excluded.updated_at;
        get diagnostics v_affected = row_count;

      when 'weekplan.upsert' then
        insert into public.weekly_plans as w (user_id, week_start, boss_title, boss_completed, updated_at)
        values (uid, (p->>'week_start')::date, coalesce(p->>'boss_title', ''),
          (p->>'boss_completed')::boolean, (p->>'updated_at')::timestamptz)
        on conflict (user_id, week_start) do update set
          boss_title = excluded.boss_title, boss_completed = excluded.boss_completed,
          updated_at = excluded.updated_at
        where w.updated_at <= excluded.updated_at;
        get diagnostics v_affected = row_count;

      -- Reward ops never count as conflicts: they are idempotent by event_id.
      when 'reward.grant' then
        insert into public.reward_ledger as r (user_id, event_id, kind, amount, revoked, updated_at)
        values (uid, p->>'event_id', p->>'kind', (p->>'amount')::int, false, (p->>'updated_at')::timestamptz)
        on conflict (user_id, event_id) do update set
          revoked = false, updated_at = excluded.updated_at
        where r.updated_at <= excluded.updated_at;
        v_affected := 1;

      when 'reward.revoke' then
        update public.reward_ledger set revoked = true, updated_at = (p->>'updated_at')::timestamptz
        where user_id = uid and event_id = p->>'event_id'
          and updated_at <= (p->>'updated_at')::timestamptz;
        v_affected := 1;

      else
        raise exception 'unknown op kind: %', v_kind;
    end case;

    if v_affected = 0 then
      conflicts := conflicts || v_op_id;
    end if;

    insert into public.applied_ops (user_id, op_id) values (uid, v_op_id);
    acked := acked || v_op_id;
  end loop;

  return jsonb_build_object('acked', to_jsonb(acked), 'conflicts', to_jsonb(conflicts));
end $$;

-- ---------- pull: everything changed after the cursor ----------
-- Rows include server_seq so the client can advance its cursor to the highest seq seen.
-- Note: sequence values can commit out of order under concurrency. A production hardening
-- step is to pull with a small lag window (e.g. re-read seq > cursor - 100) and dedupe.
create or replace function public.sync_pull(p_cursor bigint) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_max bigint := p_cursor;
  v_habits jsonb; v_completions jsonb; v_tasks jsonb;
  v_checkins jsonb; v_plans jsonb; v_rewards jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select coalesce(jsonb_agg(to_jsonb(t) - 'user_id'), '[]') into v_habits
    from public.habits t where t.user_id = uid and t.server_seq > p_cursor;
  select coalesce(jsonb_agg(to_jsonb(t) - 'user_id'), '[]') into v_completions
    from public.completions t where t.user_id = uid and t.server_seq > p_cursor;
  select coalesce(jsonb_agg(to_jsonb(t) - 'user_id'), '[]') into v_tasks
    from public.daily_tasks t where t.user_id = uid and t.server_seq > p_cursor;
  select coalesce(jsonb_agg(to_jsonb(t) - 'user_id'), '[]') into v_checkins
    from public.daily_check_ins t where t.user_id = uid and t.server_seq > p_cursor;
  select coalesce(jsonb_agg(to_jsonb(t) - 'user_id'), '[]') into v_plans
    from public.weekly_plans t where t.user_id = uid and t.server_seq > p_cursor;
  select coalesce(jsonb_agg(to_jsonb(t) - 'user_id'), '[]') into v_rewards
    from public.reward_ledger t where t.user_id = uid and t.server_seq > p_cursor;

  select greatest(v_max, coalesce(max((r->>'server_seq')::bigint), 0)) into v_max from jsonb_array_elements(v_habits) r;
  select greatest(v_max, coalesce(max((r->>'server_seq')::bigint), 0)) into v_max from jsonb_array_elements(v_completions) r;
  select greatest(v_max, coalesce(max((r->>'server_seq')::bigint), 0)) into v_max from jsonb_array_elements(v_tasks) r;
  select greatest(v_max, coalesce(max((r->>'server_seq')::bigint), 0)) into v_max from jsonb_array_elements(v_checkins) r;
  select greatest(v_max, coalesce(max((r->>'server_seq')::bigint), 0)) into v_max from jsonb_array_elements(v_plans) r;
  select greatest(v_max, coalesce(max((r->>'server_seq')::bigint), 0)) into v_max from jsonb_array_elements(v_rewards) r;

  return jsonb_build_object(
    'cursor', v_max,
    'habits', v_habits,
    'completions', v_completions,
    'daily_tasks', v_tasks,
    'daily_check_ins', v_checkins,
    'weekly_plans', v_plans,
    'reward_ledger', v_rewards
  );
end $$;

revoke execute on function public.sync_push(jsonb) from public, anon;
revoke execute on function public.sync_pull(bigint) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;
grant execute on function public.sync_pull(bigint) to authenticated;
