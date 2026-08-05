import { NextResponse } from "next/server";
import { z } from "zod";
import { createCollection, listCatalog } from "../../../db/queries";
import { seedDatabase } from "../../../db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCollectionSchema = z.object({ name: z.string().trim().min(1) });

export async function GET() {
  await seedDatabase();
  return NextResponse.json((await listCatalog()).collections, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const { name } = createCollectionSchema.parse(await request.json());
  const collection = await createCollection(name);
  return NextResponse.json(collection, { status: 201 });
}
