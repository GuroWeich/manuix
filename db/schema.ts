import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    path: text("path").notNull(),
    parentId: text("parent_id"),
    color: text("color").notNull().default("sage"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("locations_path_idx").on(table.path)],
);

export const collections = sqliteTable(
  "collections",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name"),
    icon: text("icon").notNull().default("◇"),
    color: text("color").notNull().default("#dbe8e2"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("collections_name_idx").on(table.name),
    uniqueIndex("collections_normalized_name_idx").on(table.normalizedName),
  ],
);

export const inventoryItems = sqliteTable(
  "inventory_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    locationPath: text("location_path").notNull(),
    notes: text("notes").notNull().default(""),
    purchaseDate: text("purchase_date").notNull().default(""),
    purchasePrice: real("purchase_price"),
    estimatedValue: real("estimated_value"),
    manufacturer: text("manufacturer").notNull().default(""),
    model: text("model").notNull().default(""),
    serialNumber: text("serial_number").notNull().default(""),
    condition: text("condition").notNull().default("Good"),
    visual: text("visual").notNull().default("ssd"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("inventory_items_created_idx").on(table.createdAt),
    index("inventory_items_category_idx").on(table.category),
    index("inventory_items_location_idx").on(table.locationId),
  ],
);

export const itemCollections = sqliteTable(
  "item_collections",
  {
    itemId: text("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.collectionId] })],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("tags_name_idx").on(table.name)],
);

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: text("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tagId] })],
);

export const photos = sqliteTable(
  "photos",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id").references(() => inventoryItems.id, { onDelete: "cascade" }),
    storedPath: text("stored_path").notNull(),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(true),
    status: text("status").notNull().default("attached"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("photos_stored_path_idx").on(table.storedPath),
    index("photos_item_idx").on(table.itemId),
    index("photos_status_idx").on(table.status),
  ],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type InventoryRow = typeof inventoryItems.$inferSelect;
