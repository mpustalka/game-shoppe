import type { InventoryItem } from "@/lib/types"
import { getCardRarityLabel } from "@/lib/card-metadata"

/** Market value of an inventory line — falls back to the listing price. */
export function itemMarketValue(item: InventoryItem) {
  return item.marketValue || item.price
}

export function getInventoryValue(items: InventoryItem[]) {
  return items.reduce((sum, item) => {
    return sum + itemMarketValue(item) * item.quantity
  }, 0)
}

export function getInventoryCost(items: InventoryItem[]) {
  return items.reduce((sum, item) => {
    return sum + (item.purchasePrice || 0) * item.quantity
  }, 0)
}

export function getPotentialProfit(items: InventoryItem[]) {
  return items.reduce((sum, item) => {
    const profit = itemMarketValue(item) - (item.purchasePrice || 0)
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

/**
 * Headline financial position derived from on-hand inventory plus the
 * quantity-sold counter that already lives on each item. Realized figures here
 * are an estimate (sold qty × listing price); the card_sales ledger provides
 * exact, time-stamped numbers once sales are recorded through it.
 */
export function getFinancialSummary(items: InventoryItem[]) {
  let inventoryValue = 0
  let inventoryCost = 0
  let realizedRevenue = 0
  let realizedCost = 0
  let unitsOnHand = 0
  let unitsSold = 0

  for (const item of items) {
    const cost = item.purchasePrice || 0
    inventoryValue += itemMarketValue(item) * item.quantity
    inventoryCost += cost * item.quantity
    unitsOnHand += item.quantity

    const sold = item.quantitySold || 0
    realizedRevenue += item.price * sold
    realizedCost += cost * sold
    unitsSold += sold
  }

  const unrealizedProfit = inventoryValue - inventoryCost
  const realizedProfit = realizedRevenue - realizedCost

  return {
    inventoryValue,
    inventoryCost,
    unrealizedProfit,
    unrealizedRoi: inventoryCost > 0 ? (unrealizedProfit / inventoryCost) * 100 : 0,
    realizedRevenue,
    realizedCost,
    realizedProfit,
    realizedRoi: realizedCost > 0 ? (realizedProfit / realizedCost) * 100 : 0,
    realizedMargin:
      realizedRevenue > 0 ? (realizedProfit / realizedRevenue) * 100 : 0,
    unitsOnHand,
    unitsSold,
    // Share of total units (on hand + sold) that have sold through.
    sellThrough:
      unitsOnHand + unitsSold > 0
        ? (unitsSold / (unitsOnHand + unitsSold)) * 100
        : 0,
    avgSalePrice: unitsSold > 0 ? realizedRevenue / unitsSold : 0,
  }
}

/** Generic "group by + roll up value/cost/qty" used for the breakdown cards. */
export type Breakdown = {
  key: string
  units: number
  sold: number
  value: number
  cost: number
}

function rollUp(
  items: InventoryItem[],
  keyOf: (item: InventoryItem) => string,
): Breakdown[] {
  const map = new Map<string, Breakdown>()
  for (const item of items) {
    const key = keyOf(item) || "Unknown"
    const entry =
      map.get(key) ?? { key, units: 0, sold: 0, value: 0, cost: 0 }
    entry.units += item.quantity
    entry.sold += item.quantitySold || 0
    entry.value += itemMarketValue(item) * item.quantity
    entry.cost += (item.purchasePrice || 0) * item.quantity
    map.set(key, entry)
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value)
}

export function getRarityBreakdown(items: InventoryItem[]) {
  return rollUp(items, (item) => getCardRarityLabel(item.card))
}

export function getConditionBreakdown(items: InventoryItem[]) {
  return rollUp(items, (item) => item.condition)
}

export function getFinishBreakdown(items: InventoryItem[]) {
  return rollUp(items, (item) => item.finish)
}

/** Highest-value individual positions (qty × market value). */
export function getTopPositions(items: InventoryItem[], limit = 6) {
  return [...items]
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      item,
      value: itemMarketValue(item) * item.quantity,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/**
 * Capital tied up in cards that have never sold and were added more than
 * `days` ago — money the shop could free up.
 */
export function getDeadStock(items: InventoryItem[], days = 60, limit = 6) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return [...items]
    .filter(
      (item) =>
        item.quantity > 0 &&
        (item.quantitySold || 0) === 0 &&
        new Date(item.createdAt).getTime() < cutoff,
    )
    .map((item) => ({
      item,
      value: itemMarketValue(item) * item.quantity,
      ageDays: Math.floor(
        (Date.now() - new Date(item.createdAt).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}
