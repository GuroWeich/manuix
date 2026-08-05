import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
export const DATABASE_PATH = path.join(DATA_DIR, "manuix.sqlite");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MIGRATIONS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle");
const MIGRATIONS_TABLE = "__drizzle_migrations";
const COLLECTION_NORMALIZATION_MIGRATION = "0001_collection_normalized_names";

type JournalEntry = { idx: number; when: number; tag: string; breakpoints: boolean };
type Migration = JournalEntry & { hash: string; statements: string[] };

type DatabaseState = {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
  migrated: boolean;
};

const globalState = globalThis as typeof globalThis & { __manuixDatabase?: DatabaseState };

function readMigrations(migrationsDir: string): Migration[] {
  const journal = JSON.parse(readFileSync(path.join(migrationsDir, "meta", "_journal.json"), "utf8")) as { entries: JournalEntry[] };

  return journal.entries.map((entry) => {
    const sql = readFileSync(path.join(migrationsDir, `${entry.tag}.sql`), "utf8");
    return {
      ...entry,
      hash: createHash("sha256").update(sql).digest("hex"),
      statements: sql.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean),
    };
  });
}

function hasColumn(sqlite: Database.Database, table: string, column: string) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all().some((row) => (row as { name: string }).name === column);
}

function hasIndex(sqlite: Database.Database, indexName: string) {
  return sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?").get(indexName) !== undefined;
}

function applyCollectionNormalizationMigration(sqlite: Database.Database) {
  if (!hasColumn(sqlite, "collections", "normalized_name")) {
    sqlite.exec("ALTER TABLE `collections` ADD `normalized_name` text");
  }

  sqlite.exec(`
    UPDATE collections
    SET normalized_name = lower(trim(name))
    WHERE normalized_name IS NULL
      AND rowid = (
        SELECT min(candidate.rowid)
        FROM collections AS candidate
        WHERE lower(trim(candidate.name)) = lower(trim(collections.name))
      )
  `);

  if (!hasIndex(sqlite, "collections_normalized_name_idx")) {
    sqlite.exec("CREATE UNIQUE INDEX `collections_normalized_name_idx` ON `collections` (`normalized_name`)");
  }
}

export function runMigrations(sqlite: Database.Database, migrationsDir = MIGRATIONS_DIR) {
  const migrations = readMigrations(migrationsDir);
  sqlite.exec(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`);
  const lastMigration = sqlite.prepare(`SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`).get() as { created_at: number } | undefined;
  const lastCreatedAt = Number(lastMigration?.created_at ?? 0);

  sqlite.transaction(() => {
    for (const migration of migrations) {
      if (lastCreatedAt >= migration.when) continue;

      if (migration.tag === COLLECTION_NORMALIZATION_MIGRATION) {
        applyCollectionNormalizationMigration(sqlite);
      } else {
        for (const statement of migration.statements) {
          sqlite.exec(statement);
        }
      }

      sqlite.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`).run(migration.hash, migration.when);
    }
  })();
}

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
    runMigrations(globalState.__manuixDatabase.sqlite);
    globalState.__manuixDatabase.migrated = true;
  }
  return globalState.__manuixDatabase.db;
}

export function getSqlite() {
  getDatabase();
  return globalState.__manuixDatabase!.sqlite;
}
