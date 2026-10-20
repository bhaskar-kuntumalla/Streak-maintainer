// Versioned SQLite migrations. Append new migrations; never edit applied ones.
export const migrations: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        category TEXT,
        schedule_type TEXT NOT NULL DEFAULT 'daily',
        weekdays TEXT,
        interval_days INTEGER,
        start_date TEXT NOT NULL,
        end_date TEXT,
        target_value REAL,
        target_unit TEXT,
        reminder_time TEXT,
        xp_reward INTEGER NOT NULL DEFAULT 10,
        status TEXT NOT NULL DEFAULT 'active',
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS completions (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        UNIQUE (habit_id, date)
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        op_id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `,
  },
  {
    version: 2,
    sql: `ALTER TABLE habits ADD COLUMN pauses TEXT NOT NULL DEFAULT '[]';`,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS daily_check_ins (
        date TEXT PRIMARY KEY NOT NULL,
        energy INTEGER,
        focus INTEGER,
        mood INTEGER,
        review TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        duration_minutes INTEGER,
        completed INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_tasks(date);
      CREATE TABLE IF NOT EXISTS weekly_plans (
        week_start TEXT PRIMARY KEY NOT NULL,
        boss_title TEXT,
        boss_completed INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reward_ledger (
        event_id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        amount INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
];
