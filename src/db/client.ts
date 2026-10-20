import * as SQLite from 'expo-sqlite';
import { migrations } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the database once and applies any pending migrations. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('streakos.db');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);',
      );
      const row = await db.getFirstAsync<{ version: number }>(
        'SELECT COALESCE(MAX(version), 0) AS version FROM schema_version',
      );
      const current = row?.version ?? 0;
      for (const m of migrations) {
        if (m.version <= current) continue;
        await db.withTransactionAsync(async () => {
          await db.execAsync(m.sql);
          await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
        });
      }
      return db;
    })();
  }
  return dbPromise;
}
