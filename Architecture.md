# Manuix Architecture

## Architecture summary

Manuix is a local Next.js application. The browser renders the product UI; Node.js API routes own all durable data access.

```text
React UI
   │ fetch / FormData
   ▼
Next.js API routes
   ├── Drizzle ORM ──► data/manuix.sqlite
   └── File I/O ─────► data/uploads/
```

There is no Cloudflare binding, localStorage inventory fallback, or browser-side SQLite runtime.

## Layers

### UI

`app/src/ManuixApp.tsx` implements the product workflows. It obtains inventory and catalog data through `app/src/repository.ts`, which is an HTTP client rather than a persistence implementation.

The browser retains only temporary interaction state such as the active view, open inspector, search query, and theme. Inventory records and photo paths always come from the server.

### API

- `app/api/items/route.ts`: list and save inventory items
- `app/api/items/[id]/route.ts`: delete an item
- `app/api/items/reset/route.ts`: explicitly restore sample data
- `app/api/catalog/route.ts`: locations, collections, counts, and Inbox
- `app/api/uploads/route.ts`: validate and persist uploads
- `app/api/uploads/[filename]/route.ts`: serve a local original safely

Routes use the Node.js runtime so native SQLite and filesystem access remain available.

### Persistence

`db/index.ts` owns the SQLite connection, project-local paths, pragmas, and migration application. The connection is cached across development reloads.

`db/queries.ts` contains relational reads and transactional writes. UI and route code do not construct SQL directly.

`db/seed.ts` adds sample data once using a database marker. Deleting a sample item does not make it reappear on the next request.

### Migrations

`db/schema.ts` is the source of truth. Drizzle generates SQL files in `drizzle/`. `pnpm db:init` and the first database request apply all committed migrations in order.

## Write flow

1. The validated form produces an inventory record.
2. A selected photo is uploaded first as multipart form data.
3. The upload route writes the original to `data/uploads/` and creates photo metadata.
4. The item route upserts the item inside a transaction.
5. The transaction synchronizes its location, collections, tags, and photo association.
6. The UI refreshes database-backed catalog counts.

## Reliability choices

- One SQLite database file and one uploads folder make backup understandable.
- WAL mode protects normal local writes and improves read/write behavior.
- Foreign keys and cascading deletes prevent orphaned relationships.
- A 5-second busy timeout handles brief local lock contention.
- Upload names are generated UUIDs; original names are stored only as metadata.
- Upload routes allow known image types, enforce a 20 MB limit, and prevent path traversal.
- `data/` and native build caches are ignored by Git.

## Future extension points

The existing image-analysis and semantic-search interfaces remain inactive. A future desktop shell can reuse the schema and query layer while choosing a different application-data directory.
