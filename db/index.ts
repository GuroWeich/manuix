import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
export const DATABASE_PATH = path.join(DATA_DIR, "manuix.sqlite");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MIGRATIONS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle");

type DatabaseState = {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
  migrated: boolean;
};

const globalState = globalThis as typeof globalThis & { __manuixDatabase?: DatabaseState };

function openDatabase(): DatabaseState {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const sqlite = new Database(DATABASE_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return { sqlite, db: drizzle(sqlite, { schema }), migrated: false };
}

export function getDatabase() {
  globalState.__manuixDatabase ??= openDatabase();
  if (!globalState.__manuixDatabase.migrated) {
    migrate(globalState.__manuixDatabase.db, { migrationsFolder: MIGRATIONS_DIR });
    globalState.__manuixDatabase.migrated = true;
  }
  return globalState.__manuixDatabase.db;
}

export function getSqlite() {
  getDatabase();
  return globalState.__manuixDatabase!.sqlite;
}
