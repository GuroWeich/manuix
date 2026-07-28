export type Condition = "New" | "Excellent" | "Good" | "Fair" | "Poor";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  collections: string[];
  tags: string[];
  notes: string;
  purchaseDate: string;
  purchasePrice: number | null;
  estimatedValue: number | null;
  manufacturer: string;
  model: string;
  serialNumber: string;
  condition: Condition;
  photo: string | null;
  visual: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemDraft = Omit<InventoryItem, "id" | "createdAt" | "updatedAt">;
