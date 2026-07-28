import type { InventoryItem } from "./types";
import { seedItems } from "./data";

const FALLBACK_KEY = "manuix.inventory.v1";
let sqliteDb: {
  exec: (options: unknown) => unknown;
  selectObjects: (sql: string, bind?: unknown[]) => unknown[];
} | null = null;

function cloneSeed() {
  return seedItems.map((item) => ({ ...item, collections: [...item.collections], tags: [...item.tags] }));
}

async function openSqlite() {
  if (sqliteDb) return sqliteDb;
  try {
    const { default: sqlite3InitModule } = await import("@sqlite.org/sqlite-wasm");
    const sqlite3 = await sqlite3InitModule({ print: () => undefined, printErr: () => undefined });
    const Db = sqlite3.oo1.JsStorageDb ?? sqlite3.oo1.DB;
    sqliteDb = new Db("local", "c");
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    return sqliteDb;
  } catch {
    return null;
  }
}

function readFallback(): InventoryItem[] {
  const stored = localStorage.getItem(FALLBACK_KEY);
  if (!stored) {
    const seeded = cloneSeed();
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(stored) as InventoryItem[];
}

function writeFallback(items: InventoryItem[]) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
}

export const inventoryRepository = {
  async list(): Promise<InventoryItem[]> {
    const db = await openSqlite();
    if (!db) return readFallback();
    const rows = db.selectObjects("SELECT payload FROM inventory_items ORDER BY created_at DESC") as Array<{ payload: string }>;
    if (!rows.length) {
      for (const item of cloneSeed()) await this.save(item);
      return cloneSeed();
    }
    return rows.map((row) => JSON.parse(row.payload) as InventoryItem);
  },

  async save(item: InventoryItem) {
    const db = await openSqlite();
    if (!db) {
      const items = readFallback();
      const next = [item, ...items.filter((candidate) => candidate.id !== item.id)];
      writeFallback(next);
      return;
    }
    db.exec({
      sql: `INSERT INTO inventory_items (id, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      bind: [item.id, JSON.stringify(item), item.createdAt, item.updatedAt],
    });
  },

  async remove(id: string) {
    const db = await openSqlite();
    if (!db) {
      writeFallback(readFallback().filter((item) => item.id !== id));
      return;
    }
    db.exec({ sql: "DELETE FROM inventory_items WHERE id = ?", bind: [id] });
  },

  async reset() {
    localStorage.removeItem(FALLBACK_KEY);
    const db = await openSqlite();
    if (db) db.exec("DELETE FROM inventory_items");
  },
};

export interface ImageAnalysisProvider {
  analyze(image: File): Promise<{ labels: string[]; description?: string }>;
}

export interface SemanticSearchProvider {
  search(query: string, items: InventoryItem[]): Promise<string[]>;
}

export const offlineOnlyProviders = {
  imageAnalysis: null as ImageAnalysisProvider | null,
  semanticSearch: null as SemanticSearchProvider | null,
};
