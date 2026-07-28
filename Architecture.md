# Manuix Architecture

## Goals

The architecture protects four product qualities:

1. The core inventory remains useful without a network, account, or AI service.
2. Product workflows are easy to understand and test.
3. Persistence is replaceable without rewriting the UI.
4. Future desktop and AI capabilities attach at explicit boundaries.

## Application layers

### Presentation

`ManuixApp.tsx` contains the current product surfaces and their interaction state. The MVP is intentionally composed as one client application so navigation, inspector transitions, search, and editing feel immediate. Reusable visual primitives such as item cards, metrics, browse panels, fields, and info groups are colocated while the component set is still small.

`globals.css` is a compact design system. Semantic color tokens drive both themes. Breakpoints cover desktop, tablet, and narrow phone layouts. Motion respects `prefers-reduced-motion`.

### Domain

`types.ts` is the canonical inventory model. `inventory.ts` holds pure queries and calculations, including broad search and completeness metrics. Keeping these functions independent from React and persistence makes them deterministic and cheap to test.

The item model already distinguishes permanent location from collections. That preserves the key Manuix invariant: organizing an object by purpose never changes where it physically lives.

### Persistence

`repository.ts` exposes a small asynchronous repository:

- `list`
- `save`
- `remove`
- `reset`

The primary adapter uses SQLite compiled to WebAssembly. It stores records locally and requires no server. A defensive local-storage adapter is used only if SQLite cannot initialize in a browser. UI components know nothing about either implementation.

The current SQLite table stores the versioned item payload as JSON alongside indexed identity and timestamps. This is deliberate for the MVP: the product model can evolve quickly while persistence stays robust. High-value relational fields can be normalized behind the same repository as reporting requirements grow.

### Capability boundaries

`ImageAnalysisProvider` and `SemanticSearchProvider` define future AI contracts. Both are `null` in the shipping product. No core workflow checks for or depends on them.

A future `PhotoRepository` can move image bytes from browser-managed storage into an OS folder in a desktop wrapper. Inventory records already treat `photo` as a reference-like field, so that transition does not require a UI redesign.

## State flow

1. Manuix loads inventory through the repository.
2. The UI derives metrics and filtered views with pure functions.
3. Create/edit forms validate input before producing an `ItemDraft`.
4. The application converts the draft to a timestamped domain record.
5. The repository commits it locally.
6. UI state updates optimistically from the saved record.

Errors at initial load produce a recoverable error state. Empty queries and empty inventories have distinct states.

## Key decisions

### One complete workflow first

The implemented vertical slice covers discover → inspect → create/edit → persist → report. Inbox automation, taxonomy editing, and Zones are intentionally shallow or deferred so the core loop is cohesive.

### SQLite in the browser

WebAssembly provides real SQLite semantics without adding a local server or Docker. Browser storage is appropriate for the web MVP; a native shell can later point the same repository interface at a conventional SQLite file.

### No AI in the core

AI will be an optional adapter, not an implicit dependency. Manual capture, search, and organization must remain excellent if no provider is ever configured.

## Testing strategy

- Pure domain tests cover search and metrics.
- Production builds provide TypeScript and bundling validation.
- Repository integration tests should be added in a browser test environment when migration work begins.
- Future high-risk workflows—bulk imports, file moves, and backup restoration—should receive end-to-end tests before release.

## Security and privacy

The MVP sends no inventory data over the network. There are no credentials, user sessions, analytics calls, or remote image processors. Browser-origin storage is private to the local profile but is not an encrypted vault. Device encryption and OS account security remain relevant.
