import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { finished } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { getSqlite, UPLOADS_DIR } from "./index";

type BackupEntry = {
  archivePath: string;
  sourcePath?: string;
  content?: Buffer;
  size: number;
  modifiedAt: Date;
  directory?: boolean;
};

function writeOctal(buffer: Buffer, offset: number, length: number, value: number) {
  const encoded = value.toString(8).padStart(length - 1, "0");
  buffer.write(encoded.slice(-(length - 1)), offset, length - 1, "ascii");
  buffer[offset + length - 1] = 0;
}

function tarHeader(entry: BackupEntry) {
  const header = Buffer.alloc(512);
  header.write(entry.archivePath, 0, 100, "utf8");
  writeOctal(header, 100, 8, entry.directory ? 0o755 : 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, entry.size);
  writeOctal(header, 136, 12, Math.floor(entry.modifiedAt.getTime() / 1000));
  header.fill(0x20, 148, 156);
  header[156] = (entry.directory ? "5" : "0").charCodeAt(0);
  header.write("ustar", 257, 5, "ascii");
  header[262] = 0;
  header.write("00", 263, 2, "ascii");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeOctal(header, 148, 8, checksum);
  return header;
}

async function uploadedFiles(): Promise<BackupEntry[]> {
  const names = await readdir(UPLOADS_DIR);
  const entries: BackupEntry[] = [];
  for (const name of names.sort()) {
    const sourcePath = path.join(UPLOADS_DIR, name);
    const metadata = await stat(sourcePath);
    if (!metadata.isFile()) continue;
    entries.push({
      archivePath: `uploads/${name}`,
      sourcePath,
      size: metadata.size,
      modifiedAt: metadata.mtime,
    });
  }
  return entries;
}

async function writeEntry(gzip: ReturnType<typeof createGzip>, entry: BackupEntry) {
  gzip.write(tarHeader(entry));
  if (entry.content) {
    gzip.write(entry.content);
  } else if (entry.sourcePath) {
    const source = createReadStream(entry.sourcePath);
    for await (const chunk of source) {
      if (!gzip.write(chunk)) await new Promise<void>((resolve) => gzip.once("drain", resolve));
    }
  }
  const padding = (512 - (entry.size % 512)) % 512;
  if (padding) gzip.write(Buffer.alloc(padding));
}

export async function createBackupArchive() {
  const workDir = await mkdtemp(path.join(tmpdir(), "manuix-backup-"));
  const snapshotPath = path.join(workDir, "manuix.sqlite");
  const archivePath = path.join(workDir, "manuix-backup.tar.gz");
  await getSqlite().backup(snapshotPath);

  const snapshotStat = await stat(snapshotPath);
  const restoreText = Buffer.from(
    [
      "MANUIX BACKUP — SAFE MANUAL RESTORE",
      "",
      "This archive contains manuix.sqlite and the complete uploads/ folder as they existed when exported.",
      "",
      "1. Stop Manuix completely (Ctrl+C in the terminal running it).",
      "2. Make a separate copy of the current data/ folder before replacing anything.",
      "3. Extract this archive.",
      "4. Copy manuix.sqlite and uploads/ from the extracted archive into the project's data/ folder.",
      "5. Start Manuix again. Do not copy old -wal or -shm files into data/.",
      "",
      "The database snapshot was created with SQLite's live backup API, so Manuix did not need to be stopped for export.",
      "",
    ].join("\n"),
  );
  await writeFile(path.join(workDir, "RESTORE.txt"), restoreText);

  const entries: BackupEntry[] = [
    { archivePath: "manuix.sqlite", sourcePath: snapshotPath, size: snapshotStat.size, modifiedAt: snapshotStat.mtime },
    { archivePath: "uploads/", size: 0, modifiedAt: new Date(), directory: true },
    ...(await uploadedFiles()),
    { archivePath: "RESTORE.txt", content: restoreText, size: restoreText.length, modifiedAt: new Date() },
  ];

  const output = createWriteStream(archivePath);
  const gzip = createGzip({ level: 6 });
  gzip.pipe(output);
  for (const entry of entries) await writeEntry(gzip, entry);
  gzip.end(Buffer.alloc(1024));
  await finished(output);

  return {
    archivePath,
    cleanup: () => rm(workDir, { recursive: true, force: true }),
  };
}
