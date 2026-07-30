import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOADS_DIR, getDatabase } from "../../../db";
import { photos } from "../../../db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

function extensionFor(file: File) {
  const original = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (original && original.length <= 8) return original;
  return {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
  }[file.type] ?? ".img";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const status = form.get("status") === "inbox" ? "inbox" : "pending";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "That image format is not supported." }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Images must be 20 MB or smaller." }, { status: 413 });
  }

  const id = randomUUID();
  const filename = `${id}${extensionFor(file)}`;
  const storedPath = path.join(UPLOADS_DIR, filename);
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(storedPath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  await getDatabase().insert(photos).values({
    id,
    itemId: null,
    storedPath,
    filename,
    originalName: path.basename(file.name),
    mimeType: file.type,
    byteSize: file.size,
    isPrimary: true,
    status,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    id,
    name: file.name,
    url: `/api/uploads/${encodeURIComponent(filename)}`,
    createdAt: new Date().toISOString(),
  }, { status: 201 });
}
