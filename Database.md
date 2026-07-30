# Manuix Database

## Location

The SQLite database is stored at:

```text
data/manuix.sqlite
```

Original uploaded photos are stored at:

```text
data/uploads/
```

Both are ignored by Git.

## Tables

### `inventory_items`

Stores identity, name, category, permanent location reference and path, notes, purchase date and price, estimated value, manufacturer, model, serial number, condition, visual treatment, and timestamps.

### `locations`

Stores named hierarchical paths, an optional parent reference, and display color. `path` is unique.

### `collections`

Stores collection name, icon, color, and creation timestamp. Collection membership never changes permanent location.

### `item_collections`

Many-to-many item and collection membership.

### `tags`

Stores unique tag names.

### `item_tags`

Many-to-many item and tag membership.

### `photos`

Stores item association, generated filename, absolute stored path, original filename, MIME type, byte size, primary-photo flag, workflow status, and creation timestamp. Image bytes are never stored in SQLite.

An unattached photo can have `pending` or `inbox` status. Saving an item associates its selected upload and changes the status to `attached`.

### `settings`

Stores small application markers and preferences. The initial sample-data marker prevents deleted samples from being recreated automatically.

## Migrations

Schema definitions live in `db/schema.ts`.

After changing that file:

```bash
pnpm db:generate
```

Review the new SQL file under `drizzle/`, then apply it:

```bash
pnpm db:init
```

Migrations are tracked in SQLite’s `__drizzle_migrations` table and are safe to run repeatedly.

## Initialization

`pnpm db:init`:

1. creates `data/` and `data/uploads/`;
2. opens `data/manuix.sqlite`;
3. enables WAL mode and foreign keys;
4. applies pending Drizzle migrations;
5. adds the sample inventory only if it has never been seeded.

It does not erase or replace existing personal inventory.

## Backup integrity

Stop the server and copy the complete `data/` directory for the simplest backup. This keeps the database and photo originals together. If the server must stay running, use SQLite’s `.backup` command rather than copying only the live `.sqlite` file.
