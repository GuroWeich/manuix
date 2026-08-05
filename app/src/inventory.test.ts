import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { seedItems } from "./data";
import { collectionItemLabel, findCollectionMatches, normalizeCollectionName } from "./collections";
import { canonicalInventoryItems, countInventoryItems, filterItems, formatCurrency, inventoryMetrics } from "./inventory";

const locationPath = "Home / Office";
const locationNameOnly = "Office";

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

  it("reproduces the location-card bug: name-only navigation cannot reach path-scoped items", () => {
    expect(countInventoryItems(seedItems, { locationPath })).toBe(3);
    expect(filterItems(seedItems, "", { locationPath: locationNameOnly })).toEqual([]);
  });

  it("reaches every database item belonging to a location from that location path", () => {
    const visible = filterItems(seedItems, "", { locationPath });
    const databaseItems = seedItems.filter((item) => item.location === locationPath || item.location.startsWith(`${locationPath} / `));
    expect(visible.map((item) => item.id).sort()).toEqual(databaseItems.map((item) => item.id).sort());
  });

  it("keeps location totals equal to visible location items", () => {
    expect(countInventoryItems(seedItems, { locationPath })).toBe(filterItems(seedItems, "", { locationPath }).length);
  });

  it("keeps collection totals equal to visible collection items", () => {
    expect(countInventoryItems(seedItems, { collectionName: "Photography" })).toBe(filterItems(seedItems, "", { collectionName: "Photography" }).length);
  });

  it("search never hides valid matching items inside a scoped location", () => {
    expect(filterItems(seedItems, "Samsung", { locationPath }).map((item) => item.id)).toEqual(["ssd"]);
  });

  it("changing category tabs narrows only by category without losing scoped eligible items incorrectly", () => {
    expect(filterItems(seedItems, "", { locationPath, category: "All" }).map((item) => item.id).sort()).toEqual(["camera-x100v", "headphones", "ssd"]);
    expect(filterItems(seedItems, "", { locationPath, category: "Electronics" }).map((item) => item.id).sort()).toEqual(["headphones", "ssd"]);
  });

  it("combinations of search, category, and location expose every eligible matching item", () => {
    expect(filterItems(seedItems, "Beyerdynamic", { locationPath, category: "Electronics" }).map((item) => item.id)).toEqual(["headphones"]);
  });

  it("uses exact location and collection scopes for detail page parity", () => {
    const office = filterItems(seedItems, "", { locationPath });
    expect(office.map((item) => item.id).sort()).toEqual(["camera-x100v", "headphones", "ssd"]);
    expect(filterItems(seedItems, "", { collectionName: "Photography" }).map((item) => item.id).sort()).toEqual(["binoculars", "camera-x100v"]);
    expect(filterItems(seedItems, "Samsung", { locationPath }).map((item) => item.id)).toEqual(["ssd"]);
  });

  it("keeps grid and list views on the same canonical filtered item set", () => {
    const scoped = filterItems(seedItems, "travel", { category: "Cameras", collectionName: "Photography" });
    const gridIds = scoped.map((item) => item.id);
    const listIds = canonicalInventoryItems(scoped).map((item) => item.id);
    expect(gridIds).toEqual(listIds);
  });

  it("does not hide additional grid items with responsive CSS", () => {
    expect(readFileSync("app/globals.css", "utf8")).not.toContain(".inventory-grid .item-card:nth-child(n+7)");
  });

  it("calculates inventory health metrics from the canonical inventory set", () => {
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
