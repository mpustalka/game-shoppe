import { supabase } from "./supabase"
import type { InventoryItem, PriceTier } from "./types"

const BINDER_BUCKETS: Record<PriceTier, string> = {
  budget: "lowendbinder",
  mid: "midtierbinder",
  premium: "highendbinder",
}

const BINDER_FILE = "binder.json"

export async function loadBinder(tier: PriceTier): Promise<InventoryItem[]> {
  const bucket = BINDER_BUCKETS[tier]
  const { data, error } = await supabase.storage.from(bucket).download(BINDER_FILE)
  if (error) {
    if (error.statusCode === 404) return [] // No binder yet
    throw error
  }
  const text = await data.text()
  return JSON.parse(text)
}

export async function saveBinder(tier: PriceTier, items: InventoryItem[]): Promise<void> {
  const bucket = BINDER_BUCKETS[tier]
  const file = new File([JSON.stringify(items)], BINDER_FILE, { type: "application/json" })
  const { error } = await supabase.storage.from(bucket).upload(BINDER_FILE, file, { upsert: true, contentType: "application/json" })
  if (error) throw error
}

export async function addToBinder(tier: PriceTier, item: InventoryItem): Promise<void> {
  const items = await loadBinder(tier)
  items.push(item)
  await saveBinder(tier, items)
}

export async function removeFromBinder(tier: PriceTier, itemId: string): Promise<void> {
  const items = await loadBinder(tier)
  const filtered = items.filter(i => i.id !== itemId)
  await saveBinder(tier, filtered)
}
