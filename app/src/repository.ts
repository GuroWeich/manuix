import type { InventoryItem } from "./types";

export type LocationSummary = { name: string; path: string; count: number; color: string };
export type CollectionSummary = { name: string; count: number; icon: string; color: string };
export type InboxPhoto = { id: string; name: string; url: string; createdAt: string };
export type Catalog = {
  locations: LocationSummary[];
  collections: CollectionSummary[];
  inbox: InboxPhoto[];
};

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed." }));
    throw new Error(body.error ?? "Request failed.");
  }
  return response.json() as Promise<T>;
}

export const inventoryRepository = {
  list() {
    return requestJson<InventoryItem[]>("/api/items");
  },

  catalog() {
    return requestJson<Catalog>("/api/catalog");
  },

  async save(item: InventoryItem) {
    await requestJson<InventoryItem>("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  },

  async remove(id: string) {
    await requestJson<{ ok: true }>(`/api/items/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async reset() {
    await requestJson<{ ok: true }>("/api/items/reset", { method: "POST" });
  },

  async upload(file: File, status: "pending" | "inbox" = "pending") {
    const body = new FormData();
    body.append("file", file);
    body.append("status", status);
    return requestJson<InboxPhoto>("/api/uploads", { method: "POST", body });
  },
};

export interface ImageAnalysisProvider {
  analyze(image: File): Promise<{ labels: string[]; description?: string }>;
}

export interface SemanticSearchProvider {
  search(query: string, items: InventoryItem[]): Promise<string[]>;
}

export const offlineOnlyProviders = {
  imageAnalysis: null as ImageAnalysisProvider | null,
  semanticSearch: null as SemanticSearchProvider | null,
};
