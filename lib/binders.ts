import type { InventoryItem, PriceTier } from "./types"
import { binderApi } from "./inventory-api"

export async function loadBinder(tier: PriceTier): Promise<InventoryItem[]> {
  return binderApi.list(tier)
}

export async function saveBinder(tier: PriceTier, items: InventoryItem[]): Promise<void> {
  const existing = await loadBinder(tier)
  await Promise.all(existing.map((item) => removeFromBinder(tier, item.id)))
  await Promise.all(items.map((item) => addToBinder(tier, item)))
}

export async function addToBinder(tier: PriceTier, item: InventoryItem): Promise<void> {
  await binderApi.add(tier, item.id)
}

export async function removeFromBinder(tier: PriceTier, itemId: string): Promise<void> {
  await binderApi.remove(tier, itemId)
}
