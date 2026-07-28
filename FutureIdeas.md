# Manuix Future Roadmap

## Milestone 1 — Trust and portability

- Export and restore a complete local archive
- Show storage health, size, and active database adapter
- Add automatic local backup rotation
- Provide duplicate-photo and broken-reference checks
- Expand repository and migration tests

This milestone comes first because users need confidence that a serious inventory is portable and recoverable.

## Milestone 2 — Faster capture

- Drag-and-drop folders into Inbox
- HEIC thumbnail support
- Batch creation and bulk metadata editing
- Reusable location and collection pickers
- Camera capture on mobile-sized devices
- Background thumbnail generation

Recognition remains manual. The goal is to make intentional capture fast before automating interpretation.

## Milestone 3 — Native macOS experience

- Package Manuix in a lightweight desktop shell
- Store `manuix.sqlite` in an explicit application data folder
- Store originals and thumbnails as conventional files
- Add Finder reveal, drag-out, and open-original actions
- Add menu-bar shortcuts and native file pickers

The repository and photo-store boundaries make this possible without redesigning the product.

## Milestone 4 — Organization depth

- Editable hierarchical location tree
- Collection covers and collection notes
- Saved searches and smart collections
- Bulk move with an audit trail
- Item relationships, kits, and accessories
- Custom fields for specialist collections

## Milestone 5 — Reports

- Insurance-ready PDF and CSV exports
- Value history and depreciation notes
- Warranty and receipt attachments
- Maintenance and replacement reminders
- Inventory completeness goals

## Milestone 6 — Optional Zones

Zones are temporary planning workspaces, never permanent locations:

- create a Zone for a trip, move, shoot, or kit;
- reference items without changing their stored location;
- mark packed, used, missing, and returned states;
- optionally update permanent location when a move is complete.

Zones remain outside primary navigation until a user enables them.

## Milestone 7 — Optional intelligence

Only after the manual product is mature:

- on-device OCR for serial numbers and receipts
- opt-in object suggestions for Inbox photos
- semantic search behind a provider interface
- duplicate-object suggestions
- local-first model support where practical

Every intelligent capability must be dismissible, explainable, and optional. Manuix must continue to work perfectly when all providers are disabled.

## Ideas deliberately not scheduled

- Accounts and cloud sync
- Social sharing
- Marketplace integrations
- Automatic resale pricing
- Smart-home tracking

These may be useful eventually, but they add privacy, reliability, and product-complexity costs that do not strengthen the current core.
