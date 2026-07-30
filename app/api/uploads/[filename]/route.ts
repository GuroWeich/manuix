import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase, UPLOADS_DIR } from "../../../../db";
import { photos } from "../../../../db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: encodedFilename } = await params;
  const filename = path.basename(decodeURIComponent(encodedFilename));
  const [record] = await getDatabase().select().from(photos).where(eq(photos.filename, filename)).limit(1);
  if (!record) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  const fullPath = path.join(UPLOADS_DIR, filename);
  if (fullPath !== record.storedPath) return NextResponse.json({ error: "Invalid photo path." }, { status: 400 });
  try {
    const bytes = await readFile(fullPath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo file is missing." }, { status: 404 });
  }
}
