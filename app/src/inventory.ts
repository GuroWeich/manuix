import type { InventoryItem } from "./types";

export function filterItems(items: InventoryItem[], query: string, category = "All") {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
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
    return matchesCategory && (!needle || haystack.includes(needle));
  });
}

export function inventoryMetrics(items: InventoryItem[]) {
  return {
    total: items.length,
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
