import { NextResponse } from "next/server";
import { z } from "zod";
import { listItems, saveItem } from "../../../db/queries";
import { seedDatabase } from "../../../db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string(),
  location: z.string().min(1),
  collections: z.array(z.string()),
  tags: z.array(z.string()),
  notes: z.string(),
  purchaseDate: z.string(),
  purchasePrice: z.number().nullable(),
  estimatedValue: z.number().nullable(),
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  condition: z.enum(["New", "Excellent", "Good", "Fair", "Poor"]),
  photo: z.string().nullable(),
  visual: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export async function GET() {
  await seedDatabase();
  return NextResponse.json(await listItems(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const item = itemSchema.parse(await request.json());
  await saveItem(item);
  return NextResponse.json(item, { status: 201 });
}
