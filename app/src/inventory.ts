import type { InventoryItem } from "./types";

export type InventoryFilter = { category?: string; locationPath?: string; collectionName?: string };

export function isActiveInventoryItem(_item?: InventoryItem) {
  void _item;
  return true;
}

export function filterItems(items: InventoryItem[], query: string, filters: InventoryFilter | string = {}) {
  const category = typeof filters === "string" ? filters : filters.category ?? "All";
  const locationPath = typeof filters === "string" ? undefined : filters.locationPath;
  const collectionName = typeof filters === "string" ? undefined : filters.collectionName;
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (!isActiveInventoryItem(item)) return false;
    const matchesCategory = category === "All" || item.category === category;
    const matchesLocation = !locationPath || item.location === locationPath || item.location.startsWith(`${locationPath} / `);
    const matchesCollection = !collectionName || item.collections.some((entry) => entry.toLowerCase() === collectionName.toLowerCase());
    const haystack = [
      item.name,
      item.category,
      item.location,
      item.manufacturer,
      item.model,
      item.serialNumber,
      ...item.collections,
      ...item.tags,
    ]
      .join(" ")
      .toLowerCase();
    return matchesCategory && matchesLocation && matchesCollection && (!needle || haystack.includes(needle));
  });
}

export function inventoryMetrics(items: InventoryItem[]) {
  return {
    total: items.filter(isActiveInventoryItem).length,
    value: items.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0),
    missingPhotos: items.filter((item) => !item.photo).length,
    missingValues: items.filter((item) => item.estimatedValue == null).length,
  };
}

export function formatCurrency(value: number | null) {
  if (value == null) return "Not valued";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
