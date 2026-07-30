import { NextResponse } from "next/server";
import { removeItem } from "../../../../db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removeItem(id);
  return NextResponse.json({ ok: true });
}
