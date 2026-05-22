import type { InventoryItem, PriceTier } from "./types"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response.json()
}

export const inventoryApi = {
  list: () => request<InventoryItem[]>("/api/inventory"),
  create: (item: InventoryItem) =>
    request<InventoryItem>("/api/inventory", { method: "POST", body: JSON.stringify(item) }),
  update: (id: string, data: Partial<InventoryItem>) =>
    request<InventoryItem>(`/api/inventory/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: true }>(`/api/inventory/${id}`, { method: "DELETE" }),
}

export const binderApi = {
  list: (tier: PriceTier) => request<InventoryItem[]>(`/api/binders/${tier}`),
  add: (tier: PriceTier, itemId: string) =>
    request<{ ok: true }>(`/api/binders/${tier}`, { method: "POST", body: JSON.stringify({ itemId }) }),
  remove: (tier: PriceTier, itemId: string) =>
    request<{ ok: true }>(`/api/binders/${tier}`, { method: "DELETE", body: JSON.stringify({ itemId }) }),
}
