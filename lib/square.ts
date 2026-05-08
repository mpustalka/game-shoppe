import { Client, Environment } from "square"
import type { InventoryItem, SquareSyncResult } from "./types"

// Initialize Square client
function getSquareClient(): Client | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  
  if (!accessToken) {
    return null
  }

  const environment = process.env.SQUARE_ENVIRONMENT === "production"
    ? Environment.Production
    : Environment.Sandbox

  return new Client({
    accessToken,
    environment,
  })
}

export function isSquareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN &&
    process.env.SQUARE_APPLICATION_ID &&
    process.env.SQUARE_LOCATION_ID
  )
}

// Create or update a catalog item in Square
export async function syncItemToSquare(item: InventoryItem): Promise<SquareSyncResult> {
  const client = getSquareClient()
  
  if (!client) {
    return { success: false, error: "Square is not configured" }
  }

  const locationId = process.env.SQUARE_LOCATION_ID
  if (!locationId) {
    return { success: false, error: "Square location ID not configured" }
  }

  try {
    // Create a unique idempotency key
    const idempotencyKey = `${item.id}-${Date.now()}`

    // Create catalog item
    const catalogResponse = await client.catalogApi.upsertCatalogObject({
      idempotencyKey,
      object: {
        type: "ITEM",
        id: item.squareItemId || `#${item.id}`,
        itemData: {
          name: `${item.card.name} - ${item.card.set.name}`,
          description: `${item.card.rarity || "Common"} - ${item.condition}\nSKU: ${item.sku}`,
          abbreviation: item.card.name.slice(0, 3).toUpperCase(),
          variations: [
            {
              type: "ITEM_VARIATION",
              id: item.squareVariationId || `#${item.id}-var`,
              itemVariationData: {
                name: item.condition,
                sku: item.sku,
                pricingType: "FIXED_PRICING",
                priceMoney: {
                  amount: BigInt(Math.round(item.price * 100)),
                  currency: "USD",
                },
                trackInventory: true,
              },
            },
          ],
        },
      },
    })

    if (!catalogResponse.result.catalogObject) {
      return { success: false, error: "Failed to create catalog item" }
    }

    const catalogItem = catalogResponse.result.catalogObject
    const variationId = catalogItem.itemData?.variations?.[0]?.id

    if (!variationId) {
      return { success: false, error: "Failed to get variation ID" }
    }

    // Set inventory count
    const inventoryResponse = await client.inventoryApi.batchChangeInventory({
      idempotencyKey: `inv-${idempotencyKey}`,
      changes: [
        {
          type: "ADJUSTMENT",
          adjustment: {
            catalogObjectId: variationId,
            locationId,
            quantity: item.quantity.toString(),
            fromState: "NONE",
            toState: "IN_STOCK",
            occurredAt: new Date().toISOString(),
          },
        },
      ],
    })

    if (inventoryResponse.result.errors?.length) {
      return { 
        success: false, 
        error: inventoryResponse.result.errors[0].detail || "Inventory update failed" 
      }
    }

    return {
      success: true,
      itemId: catalogItem.id,
      variationId,
    }
  } catch (error) {
    console.error("Square sync error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Get inventory count from Square
export async function getSquareInventoryCount(variationId: string): Promise<number | null> {
  const client = getSquareClient()
  
  if (!client) {
    return null
  }

  const locationId = process.env.SQUARE_LOCATION_ID
  if (!locationId) {
    return null
  }

  try {
    const response = await client.inventoryApi.retrieveInventoryCount(
      variationId,
      locationId
    )

    const counts = response.result.counts
    if (counts && counts.length > 0) {
      const inStockCount = counts.find((c) => c.state === "IN_STOCK")
      return inStockCount ? parseInt(inStockCount.quantity || "0", 10) : 0
    }

    return 0
  } catch (error) {
    console.error("Failed to get Square inventory count:", error)
    return null
  }
}

// Update inventory count in Square
export async function updateSquareInventoryCount(
  variationId: string,
  newQuantity: number,
  currentQuantity: number
): Promise<boolean> {
  const client = getSquareClient()
  
  if (!client) {
    return false
  }

  const locationId = process.env.SQUARE_LOCATION_ID
  if (!locationId) {
    return false
  }

  try {
    const difference = newQuantity - currentQuantity
    
    if (difference === 0) {
      return true
    }

    const response = await client.inventoryApi.batchChangeInventory({
      idempotencyKey: `update-${variationId}-${Date.now()}`,
      changes: [
        {
          type: "ADJUSTMENT",
          adjustment: {
            catalogObjectId: variationId,
            locationId,
            quantity: Math.abs(difference).toString(),
            fromState: difference > 0 ? "NONE" : "IN_STOCK",
            toState: difference > 0 ? "IN_STOCK" : "SOLD",
            occurredAt: new Date().toISOString(),
          },
        },
      ],
    })

    return !response.result.errors?.length
  } catch (error) {
    console.error("Failed to update Square inventory:", error)
    return false
  }
}

// Delete catalog item from Square
export async function deleteSquareItem(itemId: string): Promise<boolean> {
  const client = getSquareClient()
  
  if (!client) {
    return false
  }

  try {
    await client.catalogApi.deleteCatalogObject(itemId)
    return true
  } catch (error) {
    console.error("Failed to delete Square item:", error)
    return false
  }
}
