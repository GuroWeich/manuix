import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { createBackupArchive } from "../../../db/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { archivePath, cleanup } = await createBackupArchive();
  const file = createReadStream(archivePath);
  file.once("close", () => void cleanup());
  file.once("error", () => void cleanup());
  const date = new Date().toISOString().slice(0, 10);

  return new Response(Readable.toWeb(file) as ReadableStream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="manuix-backup-${date}.tar.gz"`,
      "Content-Type": "application/gzip",
    },
  });
}
