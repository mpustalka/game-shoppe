import type { InventoryItem, PriceTier } from "./types"

export type BinderLanguage = "en" | "ja"

export async function loadBinder(
  tier: PriceTier,
  language: BinderLanguage = "en",
): Promise<InventoryItem[]> {
  const response = await fetch(`/api/binders/${tier}?language=${language}`)

  if (!response.ok) {
    throw new Error("Failed to load binder")
  }

  return response.json()
}

export async function saveBinder(
  tier: PriceTier,
  items: InventoryItem[],
  language: BinderLanguage = "en",
): Promise<void> {
  await Promise.all(items.map((item) => addToBinder(tier, item, language)))
}

export async function addToBinder(
  tier: PriceTier,
  item: InventoryItem,
  language: BinderLanguage = "en",
): Promise<void> {
  const response = await fetch(`/api/binders/${tier}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...item,
      language,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to add card to binder")
  }
}

export async function removeFromBinder(
  tier: PriceTier,
  itemId: string,
  language: BinderLanguage = "en",
): Promise<void> {
  const response = await fetch(
    `/api/binders/${tier}?itemId=${encodeURIComponent(
      itemId,
    )}&language=${language}`,
    {
      method: "DELETE",
    },
  )

  if (!response.ok) {
    throw new Error("Failed to remove card from binder")
  }
}
