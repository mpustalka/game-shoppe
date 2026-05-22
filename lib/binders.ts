import type { InventoryItem, PriceTier } from "./types"

export async function loadBinder(tier: PriceTier): Promise<InventoryItem[]> {
  const response = await fetch(`/api/binders/${tier}`)
  if (!response.ok) {
    throw new Error("Failed to load binder")
  }
  return response.json()
}

export async function saveBinder(tier: PriceTier, items: InventoryItem[]): Promise<void> {
  await Promise.all(items.map((item) => addToBinder(tier, item)))
}

export async function addToBinder(tier: PriceTier, item: InventoryItem): Promise<void> {
  const response = await fetch(`/api/binders/${tier}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  })
  if (!response.ok) {
    throw new Error("Failed to add card to binder")
  }
}

export async function removeFromBinder(tier: PriceTier, itemId: string): Promise<void> {
  const response = await fetch(`/api/binders/${tier}?itemId=${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    throw new Error("Failed to remove card from binder")
  }
}
