import { seedItems, locations as seedLocations, collections as seedCollections } from "../app/src/data";
import { getDatabase } from "./index";
import { collections, inventoryItems, locations, settings } from "./schema";
import { saveItem } from "./queries";
import { normalizeCollectionName } from "../app/src/collections";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  const db = getDatabase();
  const [seedMarker] = await db.select().from(settings).where(eq(settings.key, "sample_data_seeded")).limit(1);
  if (seedMarker) return false;
  const existing = new Set((await db.select({ id: inventoryItems.id }).from(inventoryItems)).map((item) => item.id));
  const now = new Date().toISOString();
  for (const location of seedLocations) {
    await db.insert(locations).values({
      id: `seed-location-${location.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: location.name,
      path: location.path,
      color: location.color,
      createdAt: now,
    }).onConflictDoNothing();
  }
  for (const collection of seedCollections) {
    await db.insert(collections).values({
      id: `collection-${collection.name.toLowerCase()}`,
      name: collection.name,
      normalizedName: normalizeCollectionName(collection.name),
      icon: collection.icon,
      color: collection.color,
      createdAt: now,
    }).onConflictDoNothing();
  }
  for (const item of seedItems) {
    if (!existing.has(item.id)) await saveItem(item);
  }
  await db.insert(settings).values({ key: "sample_data_seeded", value: "true", updatedAt: now }).onConflictDoUpdate({
    target: settings.key,
    set: { value: "true", updatedAt: now },
  });
  return true;
}
