import type { CustomerList, CustomerListItem, InventoryItem } from "./types"

export async function loadCustomerLists(): Promise<CustomerList[]> {
  const response = await fetch("/api/customer-lists")

  if (!response.ok) {
    throw new Error("Failed to load customer lists")
  }

  return response.json()
}

export async function saveCustomerList(list: CustomerList): Promise<void> {
  const response = await fetch("/api/customer-lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(list),
  })

  if (!response.ok) {
    throw new Error("Failed to save customer list")
  }
}

export async function deleteCustomerList(id: string): Promise<void> {
  const response = await fetch(`/api/customer-lists/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete customer list")
  }
}

// Builds a list item snapshot from an inventory item so the saved list keeps
// the card details even if the underlying inventory changes later.
export function inventoryItemToListItem(
  item: InventoryItem,
): CustomerListItem {
  return {
    id: item.id,
    cardId: item.cardId,
    name: item.card?.name ?? "Unknown card",
    setName: item.card?.set?.name,
    imageUrl: item.card?.images?.small ?? item.customImage,
    condition: item.condition,
    finish: item.finish,
    price: item.price,
    quantity: 1,
  }
}

export function customerListTotal(list: CustomerList): number {
  return list.items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0,
  )
}
