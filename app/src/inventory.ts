import type { InventoryItem } from "./types";

export type InventoryScope = { locationPath?: string; collectionName?: string };
export type InventoryFilter = InventoryScope & { category?: string };

export function isActiveInventoryItem(_item?: InventoryItem) {
  void _item;
  return true;
}

export function matchesLocationScope(item: InventoryItem, locationPath?: string) {
  return !locationPath || item.location === locationPath || item.location.startsWith(`${locationPath} / `);
}

export function matchesCollectionScope(item: InventoryItem, collectionName?: string) {
  const normalized = collectionName?.trim().toLowerCase();
  return !normalized || item.collections.some((entry) => entry.trim().toLowerCase() === normalized);
}

export function inventorySearchText(item: InventoryItem) {
  return [
    item.name,
    item.category,
    item.location,
    item.manufacturer,
    item.model,
    item.serialNumber,
    ...item.collections,
    ...item.tags,
  ].join(" ").toLowerCase();
}

export function canonicalInventoryItems(items: InventoryItem[], scope: InventoryScope = {}) {
  return items.filter((item) => isActiveInventoryItem(item) && matchesLocationScope(item, scope.locationPath) && matchesCollectionScope(item, scope.collectionName));
}

export function filterInventoryItems(items: InventoryItem[], query = "", filters: InventoryFilter = {}) {
  const category = filters.category ?? "All";
  const needle = query.trim().toLowerCase();
  return canonicalInventoryItems(items, filters).filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    return matchesCategory && (!needle || inventorySearchText(item).includes(needle));
  });
}

export function filterItems(items: InventoryItem[], query: string, filters: InventoryFilter | string = {}) {
  return filterInventoryItems(items, query, typeof filters === "string" ? { category: filters } : filters);
}

export function countInventoryItems(items: InventoryItem[], scope: InventoryScope = {}) {
  return canonicalInventoryItems(items, scope).length;
}

export function inventoryMetrics(items: InventoryItem[]) {
  const canonical = canonicalInventoryItems(items);
  return {
    total: canonical.length,
    value: canonical.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0),
    missingPhotos: canonical.filter((item) => !item.photo).length,
    missingValues: canonical.filter((item) => item.estimatedValue == null).length,
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
