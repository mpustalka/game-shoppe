import type { InventoryItem } from "@/lib/types"

export function getInventoryValue(items: InventoryItem[]) {
  return items.reduce((sum, item) => {
    return sum + item.price * item.quantity
  }, 0)
}

export function getInventoryCost(items: InventoryItem[]) {
  return items.reduce((sum, item) => {
    return sum + (item.purchasePrice || 0) * item.quantity
  }, 0)
}

export function getPotentialProfit(items: InventoryItem[]) {
  return items.reduce((sum, item) => {
    const profit =
      item.price - (item.purchasePrice || 0)

    return sum + profit * item.quantity
  }, 0)
}

export function getTotalCards(items: InventoryItem[]) {
  return items.reduce((sum, item) => {
    return sum + item.quantity
  }, 0)
}

export function getTotalUniqueCards(items: InventoryItem[]) {
  return new Set(items.map((item) => item.cardId)).size
}