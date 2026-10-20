import { useSyncExternalStore } from 'react';
import { getDb } from '@/db/client';
import { defaultSettings, settingsSchema, type Settings } from '@/domain/settings';

const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let current: Settings = defaultSettings(deviceTimezone());
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getSettings(): Settings {
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

/** Loads saved settings, filling any missing or invalid fields with defaults. */
export async function loadSettings(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'settings'");
  const raw = row ? (JSON.parse(row.value) as unknown) : {};
  const parsed = settingsSchema.safeParse({ timezone: deviceTimezone(), ...(raw as object) });
  current = parsed.success ? parsed.data : defaultSettings(deviceTimezone());
  emit();
}

export async function saveSettings(next: Settings): Promise<void> {
  const db = await getDb();
  const validated = settingsSchema.parse(next);
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES ('settings', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [JSON.stringify(validated)],
  );
  current = validated;
  emit();
}
