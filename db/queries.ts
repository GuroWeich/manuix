import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { collections, inventoryItems, itemCollections, itemTags, locations, photos, tags } from "./schema";
import { getDatabase } from "./index";
import { rm } from "node:fs/promises";
import type { InventoryItem } from "../app/src/types";
import { normalizeCollectionName } from "../app/src/collections";

export function isActiveInventoryRow() {
  return sql`1 = 1`;
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function listItems(): Promise<InventoryItem[]> {
  const db = getDatabase();
  const itemRows = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
  if (!itemRows.length) return [];
  const ids = itemRows.map((item) => item.id);
  const collectionRows = await db
    .select({ itemId: itemCollections.itemId, name: collections.name })
    .from(itemCollections)
    .innerJoin(collections, eq(itemCollections.collectionId, collections.id))
    .where(inArray(itemCollections.itemId, ids));
  const tagRows = await db
    .select({ itemId: itemTags.itemId, name: tags.name })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(inArray(itemTags.itemId, ids));
  const photoRows = await db
    .select({ itemId: photos.itemId, filename: photos.filename })
    .from(photos)
    .where(and(inArray(photos.itemId, ids), eq(photos.isPrimary, true)));

  return itemRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.locationPath,
    collections: collectionRows.filter((entry) => entry.itemId === row.id).map((entry) => entry.name),
    tags: tagRows.filter((entry) => entry.itemId === row.id).map((entry) => entry.name),
    notes: row.notes,
    purchaseDate: row.purchaseDate,
    purchasePrice: row.purchasePrice,
    estimatedValue: row.estimatedValue,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serialNumber,
    condition: row.condition as InventoryItem["condition"],
    photo: photoRows.find((entry) => entry.itemId === row.id)?.filename
      ? `/api/uploads/${encodeURIComponent(photoRows.find((entry) => entry.itemId === row.id)!.filename)}`
      : null,
    visual: row.visual,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function saveItem(item: InventoryItem) {
  const db = getDatabase();
  db.transaction((tx) => {
    const locationPath = item.location.trim();
    const existingLocation = tx
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.path, locationPath))
      .get();
    const locationId = existingLocation?.id ?? `location-${slug(locationPath) || "unspecified"}-${crypto.randomUUID().slice(0, 8)}`;
    const locationName = locationPath.split(" / ").at(-1) || locationPath;
    if (!existingLocation) tx.insert(locations).values({
      id: locationId,
      name: locationName,
      path: locationPath,
      color: "sage",
      createdAt: item.createdAt,
    }).run();

    tx.insert(inventoryItems).values({
      id: item.id,
      name: item.name,
      category: item.category.trim(),
      locationId,
      locationPath,
      notes: item.notes,
      purchaseDate: item.purchaseDate,
      purchasePrice: item.purchasePrice,
      estimatedValue: item.estimatedValue,
      manufacturer: item.manufacturer,
      model: item.model,
      serialNumber: item.serialNumber,
      condition: item.condition,
      visual: item.visual,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }).onConflictDoUpdate({
      target: inventoryItems.id,
      set: {
        name: item.name,
        category: item.category.trim(),
        locationId,
        locationPath,
        notes: item.notes,
        purchaseDate: item.purchaseDate,
        purchasePrice: item.purchasePrice,
        estimatedValue: item.estimatedValue,
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: item.serialNumber,
        condition: item.condition,
        visual: item.visual,
        updatedAt: item.updatedAt,
      },
    }).run();

    tx.delete(itemCollections).where(eq(itemCollections.itemId, item.id)).run();
    for (const collectionName of item.collections) {
      const normalizedName = normalizeCollectionName(collectionName);
      const existingCollection = tx
        .select({ id: collections.id })
        .from(collections)
        .where(or(eq(collections.normalizedName, normalizedName), eq(sql`lower(trim(${collections.name}))`, normalizedName)))
        .get();
      if (!existingCollection) {
        throw new Error(`Collection “${collectionName}” does not exist. Create it explicitly before assigning items.`);
      }
      tx.insert(itemCollections).values({ itemId: item.id, collectionId: existingCollection.id }).onConflictDoNothing().run();
    }

    tx.delete(itemTags).where(eq(itemTags.itemId, item.id)).run();
    for (const tagName of item.tags) {
      const tagId = `tag-${slug(tagName)}`;
      tx.insert(tags).values({ id: tagId, name: tagName, createdAt: item.createdAt }).onConflictDoNothing().run();
      tx.insert(itemTags).values({ itemId: item.id, tagId }).onConflictDoNothing().run();
    }

    if (item.photo?.startsWith("/api/uploads/")) {
      const filename = decodeURIComponent(item.photo.split("/").at(-1)!);
      tx.update(photos).set({ itemId: item.id, status: "attached", isPrimary: true }).where(eq(photos.filename, filename)).run();
    }
  });
}

export async function removeItem(id: string) {
  const db = getDatabase();
  const attachedPhotos = await db
    .select({ storedPath: photos.storedPath })
    .from(photos)
    .where(eq(photos.itemId, id));

  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));

  await Promise.all(attachedPhotos.map(async (photo) => {
    try {
      await rm(photo.storedPath, { force: true });
    } catch {
      // The inventory record is already gone; missing or locked files should not make deletion unsafe.
    }
  }));
}

export async function listCatalog() {
  const db = getDatabase();
  const itemRows = await db.select({ id: inventoryItems.id, locationId: inventoryItems.locationId, locationPath: inventoryItems.locationPath }).from(inventoryItems).where(isActiveInventoryRow());
  const collectionLinks = await db.select({ collectionId: itemCollections.collectionId, itemId: itemCollections.itemId }).from(itemCollections).innerJoin(inventoryItems, eq(itemCollections.itemId, inventoryItems.id)).where(isActiveInventoryRow());
  const locationRows = await db.select().from(locations).orderBy(asc(locations.path));
  const collectionRows = await db.select().from(collections).orderBy(asc(collections.name));
  const inboxRows = await db.select().from(photos).where(and(isNull(photos.itemId), eq(photos.status, "inbox"))).orderBy(desc(photos.createdAt));

  return {
    locations: locationRows.map((location) => ({
      name: location.name,
      path: location.path,
      color: location.color,
      count: itemRows.filter((item) => item.locationPath === location.path || item.locationPath.startsWith(`${location.path} / `)).length,
    })),
    collections: collectionRows.map((collection) => ({
      name: collection.name,
      icon: collection.icon,
      color: collection.color,
      count: new Set(collectionLinks.filter((link) => link.collectionId === collection.id).map((link) => link.itemId)).size,
    })),
    inbox: inboxRows.map((photo) => ({
      id: photo.id,
      name: photo.originalName,
      url: `/api/uploads/${encodeURIComponent(photo.filename)}`,
      mimeType: photo.mimeType,
      createdAt: photo.createdAt,
    })),
  };
}


export async function createCollection(name: string) {
  const db = getDatabase();
  const trimmed = name.trim();
  const normalizedName = normalizeCollectionName(trimmed);
  if (!normalizedName) throw new Error("Collection name is required.");
  const existing = await db.select().from(collections).where(or(eq(collections.normalizedName, normalizedName), eq(sql`lower(trim(${collections.name}))`, normalizedName))).get();
  if (existing) return existing;
  const now = new Date().toISOString();
  const id = `collection-${slug(trimmed) || "untitled"}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await db.insert(collections).values({ id, name: trimmed, normalizedName, icon: "◇", color: "#dbe8e2", createdAt: now }).run();
  } catch {
    const concurrent = await db.select().from(collections).where(eq(collections.normalizedName, normalizedName)).get();
    if (concurrent) return concurrent;
    throw new Error("Collection could not be created.");
  }
  return (await db.select().from(collections).where(eq(collections.id, id)).get())!;
}
