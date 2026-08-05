import { describe, expect, it } from "vitest";
import { seedItems } from "./data";
import { collectionItemLabel, findCollectionMatches, normalizeCollectionName } from "./collections";
import { filterItems, formatCurrency, inventoryMetrics } from "./inventory";

describe("inventory queries", () => {
  it("searches across locations, tags, collections, and item details", () => {
    expect(filterItems(seedItems, "camera cabinet").map((item) => item.id)).toEqual(["camera-x100v"]);
    expect(filterItems(seedItems, "backpacking").map((item) => item.id)).toEqual(["camp-stove"]);
    expect(filterItems(seedItems, "workshop")).toHaveLength(2);
    expect(filterItems(seedItems, "Samsung")).toHaveLength(1);
  });

  it("combines search and category filters", () => {
    expect(filterItems(seedItems, "travel", "Cameras").map((item) => item.id)).toEqual(["camera-x100v"]);
    expect(filterItems(seedItems, "travel", "Tools")).toEqual([]);
  });

  it("uses exact location and collection scopes for detail page parity", () => {
    const office = filterItems(seedItems, "", { locationPath: "Home / Office" });
    expect(office.map((item) => item.id).sort()).toEqual(["camera-x100v", "headphones", "ssd"]);
    expect(filterItems(seedItems, "", { collectionName: "Photography" }).map((item) => item.id).sort()).toEqual(["binoculars", "camera-x100v"]);
    expect(filterItems(seedItems, "Samsung", { locationPath: "Home / Office" }).map((item) => item.id)).toEqual(["ssd"]);
  });

  it("keeps grid and list views on the same filtered item set", () => {
    const scoped = filterItems(seedItems, "travel", { category: "Cameras", collectionName: "Photography" });
    const gridIds = scoped.map((item) => item.id);
    const listIds = scoped.map((item) => item.id);
    expect(gridIds).toEqual(listIds);
  });

  it("calculates inventory health metrics", () => {
    expect(inventoryMetrics(seedItems)).toEqual({
      total: 8,
      value: 1788,
      missingPhotos: 8,
      missingValues: 1,
    });
  });

  it("detects duplicate collection names before creation", () => {
    const existing = [{ name: "Kiteboarding", count: 1, icon: "◇", color: "#fff" }, { name: "Kiteboard", count: 2, icon: "◇", color: "#fff" }];
    expect(normalizeCollectionName("  KITEBOARDING  ")).toBe("kiteboarding");
    expect(findCollectionMatches(existing, "kiteboarding").exact?.name).toBe("Kiteboarding");
    expect(findCollectionMatches(existing, "Kitebaoarding").similar.map((collection) => collection.name)).toContain("Kiteboarding");
    expect(collectionItemLabel(1)).toBe("1 item");
    expect(collectionItemLabel(2)).toBe("2 items");
  });

  it("formats known and missing values", () => {
    expect(formatCurrency(1240)).toBe("$1,240");
    expect(formatCurrency(null)).toBe("Not valued");
  });
});
