# Manuix Database

## Storage model

The MVP uses SQLite through the official SQLite WebAssembly package. The database lives in browser-managed local storage and works without a backend.

The repository creates this table:

```sql
CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

`payload` contains the versioned JSON representation of an inventory item. Identity and timestamps remain separate so migrations and ordering do not require parsing every record.

## Item payload

Each item supports:

- identity and timestamps
- name, category, condition, and notes
- permanent hierarchical location
- zero or more collections and tags
- manufacturer, model, and serial number
- purchase date and price
- estimated value
- local photo reference/data

Collections are never used to infer or overwrite permanent location.

## Why JSON payloads for the MVP

The first release needs product-learning speed more than complex cross-item queries. A JSON payload:

- keeps migrations small while the domain is still changing;
- supports complete record replacement in one transaction;
- keeps the repository adapter simple;
- makes export straightforward.

Search and reports currently run over the in-memory domain set, which is appropriate for a personal inventory of hundreds or low thousands of records.

## Normalization plan

Normalize when real scale or reporting needs justify it:

```text
items
photos
locations
collections
item_collections
tags
item_tags
purchase_records
```

Likely first indexes:

- `items(name)`
- `items(category_id)`
- `items(location_id)`
- `items(created_at)`
- `photos(item_id)`
- join-table composite primary keys

SQLite FTS5 can replace in-memory text search while preserving the repository contract.

## Photos

The current browser MVP attaches original image data locally to the record. The next storage adapter should write originals to a user-selected on-disk folder and store only a stable relative path plus generated thumbnail metadata in SQLite.

Recommended layout:

```text
Manuix/
  manuix.sqlite
  photos/
    originals/
    thumbnails/
  backups/
```

Writes should copy the original first, verify it, commit the database record second, and remove temporary data last. This avoids dangling records or lost originals.

## Migrations and backups

Before adding normalized tables:

1. introduce a `schema_migrations` table;
2. ship forward-only, transactional migrations;
3. export a backup before destructive migrations;
4. test upgrade paths from every supported release.

The next release should provide a portable archive containing the SQLite database, original photos, and a manifest with schema and application versions.

## Fallback behavior

If SQLite cannot initialize in a browser, Manuix uses a JSON local-storage adapter with the same repository methods. This favors product availability. The settings screen should expose the active adapter before a public release, and exports should work from either adapter.
