import { describe, expect, it } from "vitest";
import { seedItems } from "./data";
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

  it("calculates inventory health metrics", () => {
    expect(inventoryMetrics(seedItems)).toEqual({
      total: 8,
      value: 1788,
      missingPhotos: 8,
      missingValues: 1,
    });
  });

  it("formats known and missing values", () => {
    expect(formatCurrency(1240)).toBe("$1,240");
    expect(formatCurrency(null)).toBe("Not valued");
  });
});
