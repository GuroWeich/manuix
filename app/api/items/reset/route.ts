import { NextResponse } from "next/server";
import { getSqlite } from "../../../../db";
import { seedDatabase } from "../../../../db/seed";

export const runtime = "nodejs";

export async function POST() {
  const sqlite = getSqlite();
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM photos WHERE item_id IS NOT NULL").run();
    sqlite.prepare("DELETE FROM inventory_items").run();
    sqlite.prepare("DELETE FROM settings WHERE key = 'sample_data_seeded'").run();
  })();
  await seedDatabase();
  return NextResponse.json({ ok: true });
}
