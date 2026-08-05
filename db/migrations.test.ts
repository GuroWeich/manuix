import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runMigrations } from "./index";

function createMigratedLegacyDatabase() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE collections (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      icon text NOT NULL,
      color text NOT NULL,
      created_at integer NOT NULL
    );
    CREATE UNIQUE INDEX collections_name_idx ON collections (name);
    CREATE TABLE inventory_items (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      category text NOT NULL,
      location_id text NOT NULL,
      status text NOT NULL,
      condition text,
      quantity integer DEFAULT 1 NOT NULL,
      purchase_date text,
      purchase_price real,
      estimated_value real,
      notes text,
      photo_filename text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
    CREATE TABLE item_collections (
      item_id text NOT NULL,
      collection_id text NOT NULL,
      PRIMARY KEY (item_id, collection_id)
    );
    CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric);
    INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('legacy-hash', 1785265540719);
    INSERT INTO collections (id, name, icon, color, created_at) VALUES ('collection-1', ' Photography ', '◇', '#fff', 1);
    INSERT INTO collections (id, name, icon, color, created_at) VALUES ('collection-2', 'photography', '◇', '#fff', 2);
  `);
  return sqlite;
}

describe("database migrations", () => {
  it("migrates an existing database to normalized collection names without data loss", () => {
    const sqlite = createMigratedLegacyDatabase();

    runMigrations(sqlite);
    runMigrations(sqlite);

    const collections = sqlite.prepare("SELECT id, name, normalized_name FROM collections ORDER BY id").all();
    const migrationCount = sqlite.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get() as { count: number };
    const index = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'collections_normalized_name_idx'").get();

    expect(collections).toEqual([
      { id: "collection-1", name: " Photography ", normalized_name: "photography" },
      { id: "collection-2", name: "photography", normalized_name: null },
    ]);
    expect(index).toEqual({ name: "collections_normalized_name_idx" });
    expect(migrationCount.count).toBe(2);
  });

  it("initializes a fresh database with all committed migrations", () => {
    const sqlite = new Database(":memory:");

    runMigrations(sqlite);

    const columns = sqlite.prepare("PRAGMA table_info(collections)").all() as { name: string }[];
    const migrations = sqlite.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get() as { count: number };

    expect(columns.map((column) => column.name)).toContain("normalized_name");
    expect(migrations.count).toBe(2);
  });
});
