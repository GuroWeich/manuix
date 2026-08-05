import type { CollectionSummary } from "./repository";

export function normalizeCollectionName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function collectionItemLabel(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

export function levenshteinDistance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, index) => [index, ...Array(b.length).fill(0)]);
  for (let column = 1; column <= b.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      rows[row][column] = a[row - 1] === b[column - 1]
        ? rows[row - 1][column - 1]
        : Math.min(rows[row - 1][column - 1], rows[row - 1][column], rows[row][column - 1]) + 1;
    }
  }
  return rows[a.length][b.length];
}

export function findCollectionMatches(collections: CollectionSummary[], input: string) {
  const normalized = normalizeCollectionName(input);
  if (!normalized) return { exact: null, similar: [] as CollectionSummary[] };
  const exact = collections.find((collection) => normalizeCollectionName(collection.name) === normalized) ?? null;
  const similar = collections
    .filter((collection) => collection !== exact)
    .map((collection) => ({ collection, normalizedName: normalizeCollectionName(collection.name) }))
    .filter(({ normalizedName }) => (
      normalizedName.includes(normalized) ||
      normalized.includes(normalizedName) ||
      levenshteinDistance(normalizedName, normalized) <= Math.max(2, Math.floor(Math.max(normalizedName.length, normalized.length) * 0.25))
    ))
    .map(({ collection }) => collection)
    .slice(0, 5);
  return { exact, similar };
}
