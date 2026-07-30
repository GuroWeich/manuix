# Manuix

Manuix is a calm, local-first inventory for the physical objects in your life. It answers two questions quickly: **what is this?** and **where is it?**

All inventory records live in a SQLite database inside this project. Uploaded originals are ordinary files in the same local data folder. Manuix does not require Cloudflare, Docker, an account, or a paid service.

## Requirements

- macOS
- Node.js 22.13 or newer
- pnpm 11 or newer

## Install and start

From the project folder:

```bash
pnpm install
pnpm db:init
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

`pnpm db:init` is safe to run again. It applies pending migrations, creates missing data folders, and preserves an existing inventory. The first run also adds the sample inventory.

## Local data locations

Manuix keeps personal data here:

```text
data/
  manuix.sqlite        Inventory database
  manuix.sqlite-wal    Temporary SQLite write-ahead log, when present
  manuix.sqlite-shm    Temporary SQLite shared-memory file, when present
  uploads/             Original uploaded photos
```

The entire `data/` directory is excluded by `.gitignore`. Personal records and photos are not included in commits or pushed to GitHub.

The paths are relative to the project root, so moving the project also moves its local inventory.

## Back up and restore

Open **Settings → Backup & local data** and choose **Download complete backup**. Manuix downloads one dated `.tar.gz` archive containing:

- a consistent live snapshot of `manuix.sqlite`;
- the complete `uploads/` folder with original photos;
- `RESTORE.txt` with safe manual restore steps.

The file goes to the browser's configured Downloads folder. Export does not change the live database or photo files.

To restore, stop Manuix, first preserve a separate copy of the current `data/` folder, extract the archive, then place its `manuix.sqlite` and `uploads/` into `data/`. Do not restore stale `manuix.sqlite-wal` or `manuix.sqlite-shm` files. Automatic restore is intentionally not exposed in the app.

You can also make a cold filesystem backup while Manuix is stopped:

```bash
cp -R data "$HOME/Desktop/manuix-backup-$(date +%Y-%m-%d)"
```

## Everyday commands

```bash
pnpm dev          # Start local development
pnpm build        # Create a production build
pnpm start        # Run the production build
pnpm test         # Run domain tests
pnpm lint         # Run code-quality checks
pnpm db:generate  # Generate a migration after schema changes
pnpm db:init      # Apply migrations and initialize local data
```

## How persistence works

- Browser code reads and writes inventory through local `/api` routes.
- API routes use Drizzle with `better-sqlite3`.
- Database initialization applies committed migrations from `drizzle/`.
- Every inventory field, location, collection, tag, relationship, setting, and photo record is stored relationally.
- Uploaded image bytes are written to `data/uploads/`; SQLite stores their metadata and paths.
- SQLite uses WAL mode, foreign keys, and a busy timeout for reliable local operation.
- Browser storage is no longer the source of truth for inventory data.

See [Architecture.md](./Architecture.md) and [Database.md](./Database.md) for details.

## MVP features

- Dashboard metrics and recent items
- Photo-first grid and list views
- Search across item details, locations, collections, and tags
- Create, edit, duplicate, inspect, and delete
- Persistent local photo uploads
- Database-backed locations, collections, tags, and Inbox
- Value and completeness reports
- Light and dark themes
- Responsive layouts and keyboard shortcuts

## Privacy

Manuix sends no inventory data to a cloud service. Anyone with access to the Mac account and project folder may be able to read the database and photos, so use macOS account security and disk encryption where appropriate.
