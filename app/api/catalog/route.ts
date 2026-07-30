import { NextResponse } from "next/server";
import { listCatalog } from "../../../db/queries";
import { seedDatabase } from "../../../db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedDatabase();
  return NextResponse.json(await listCatalog(), {
    headers: { "Cache-Control": "no-store" },
  });
}
