# Manuix

Manuix is a calm, local-first inventory for the physical objects in your life. It is designed to answer two questions quickly: **what is this?** and **where is it?**

This MVP prioritizes a complete, polished inventory workflow over a broad set of partial features. It includes a dashboard, searchable photo-first inventory, item inspector, create/edit/duplicate/delete flows, locations, collections, inbox staging, reports, theme controls, keyboard shortcuts, realistic sample data, and thoughtful empty/loading/error states.

## Quick start

Requirements:

- macOS or another modern desktop OS
- Node.js 22.13 or newer
- pnpm 11 or newer

```bash
pnpm install
pnpm dev
```

Open the local address shown in the terminal (normally `http://localhost:3000`).

Production build and tests:

```bash
pnpm test
pnpm build
```

No account, Docker setup, cloud database, or external service is required. Once dependencies are installed, the app works without an internet connection.

## MVP scope

- Dashboard metrics: total objects, known value, missing photos, and missing values
- Photo-first inventory grid and dense list view
- Search across names, places, collections, tags, manufacturer, model, and serial number
- Category filters
- Detailed item inspector
- Create, edit, duplicate, and delete inventory items
- Original photo attachment from the current device
- Hierarchical location and collection browsing
- Manual photo inbox experience (no recognition or AI)
- Inventory completeness and value reports
- Light and dark themes
- Keyboard shortcuts: `⌘K` search, `⌘N` new item, `Esc` close
- Responsive layouts and reduced-motion support

Zones are intentionally not exposed in the MVP. They remain an advanced future capability.

## Architecture

Manuix is a React and TypeScript application built with the Vite-powered vinext runtime and Tailwind CSS. Product code is organized by responsibility:

- `app/src/ManuixApp.tsx`: application composition and product workflows
- `app/src/repository.ts`: persistence boundary and future provider interfaces
- `app/src/inventory.ts`: pure inventory queries and metrics
- `app/src/data.ts`: realistic sample inventory
- `app/src/types.ts`: core domain types
- `app/globals.css`: design system, layout, responsive states, and motion

SQLite runs in WebAssembly and stores the inventory locally. A small local-storage fallback keeps the app usable when a browser cannot initialize SQLite. Photo attachments are stored as device-local data with their records in this first release. See [Architecture.md](./Architecture.md) and [Database.md](./Database.md) for the detailed decisions and tradeoffs.

## Privacy and offline behavior

Manuix has no authentication, analytics, cloud persistence, or AI. The application bundle and its database operate locally. The interfaces for image analysis and semantic search are deliberately inert extension points so future capabilities do not leak into the core domain.

Browser storage is origin-specific. Use the same local address to return to the same inventory. Clearing browser site data removes the local database, so export/backup is a priority for the next release.

## Known MVP boundaries

- Image import is represented as a manual staging workflow; bulk folder processing is not yet wired.
- Photos are stored with records in browser-managed local storage. A desktop wrapper can move originals to a user-selected folder without changing the inventory domain.
- Location and collection management views are browse-first; editing those taxonomies is a future enhancement.
- The current single-workspace UI is designed so route-level splitting can be added as the product expands.

## Roadmap

The next milestones are local export/backup, drag-and-drop folder import, native desktop packaging, richer location and collection editing, insurance-ready PDF reports, and optional Zones. AI features remain explicitly opt-in and come only after the non-AI product is excellent.

See [FutureIdeas.md](./FutureIdeas.md) for the sequenced roadmap.
