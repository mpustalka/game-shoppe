"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"

import type {
  InventoryItem,
  InventoryFormData,
  PokemonCard,
  ManualCardData,
  PriceTier,
} from "./types"

import {
  getDefaultCardFinish,
  getDefaultCardVariant,
  getPriceTier,
} from "./types"

import {
  generateSKU,
  generateBarcodeString,
  generateManualSKU,
} from "./barcode"

interface InventoryContextType {
  items: InventoryItem[]

  addItem: (
    card: PokemonCard,
    data: Omit<InventoryFormData, "cardId">,
  ) => Promise<InventoryItem | null>

  addManualItem: (data: ManualCardData) => Promise<InventoryItem | null>

  updateItem: (id: string, data: Partial<InventoryFormData>) => void

  deleteItem: (id: string) => void

  recordSale: (id: string, quantitySold?: number) => void

  getItemById: (id: string) => InventoryItem | undefined

  getItemBySku: (sku: string) => InventoryItem | undefined

  getItemByBarcode: (barcode: string) => InventoryItem | undefined

  getItemsByCardId: (cardId: string) => InventoryItem[]

  getItemsByPriceTier: (tier: PriceTier) => InventoryItem[]

  searchItems: (query: string) => InventoryItem[]

  updateSquareSync: (
    id: string,
    squareItemId: string,
    squareVariationId: string,
  ) => void

  bulkImport: (
    items: ManualCardData[],
  ) => Promise<{ success: number; failed: number }>
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined,
)

/**
 * Generate an inventory ID.
 *
 * crypto.randomUUID() is not available in every browser context.
 * In particular, it may be unavailable when developing through a LAN IP
 * over plain HTTP.
 *
 * Use randomUUID when available and fall back to a UUID-v4 style ID.
 */
function generateInventoryId(): string {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID()
  }

  // Prefer cryptographically random bytes if getRandomValues is available.
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)

    // UUID v4 bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-")
  }

  // Last-resort fallback for unusual browser environments.
  return `inv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load inventory for the currently signed-in account.
  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch("/api/inventory")

        // InventoryProvider may also wrap pages available while signed out.
        if (response.status === 401) {
          setItems([])
          return
        }

        if (!response.ok) {
          const text = await response.text().catch(() => "")
          throw new Error(
            text
              ? `Failed to fetch inventory: ${text}`
              : "Failed to fetch inventory",
          )
        }

        const data = await response.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to fetch inventory:", error)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchInventory()
  }, [])

  const addItem = useCallback(
    async (
      card: PokemonCard,
      data: Omit<InventoryFormData, "cardId">,
    ): Promise<InventoryItem | null> => {
      try {
        const finish = data.finish ?? getDefaultCardFinish(card)
        const variant = data.variant ?? getDefaultCardVariant(card)

        const sku = generateSKU(
          card,
          data.condition,
          finish,
          data.language ?? "en",
        )

        const barcode = generateBarcodeString(sku)
        const id = generateInventoryId()

        const now = new Date().toISOString()

        const newItem: InventoryItem = {
          id,
          cardId: card.id,
          card,
          language: data.language ?? "en",
          sku,
          barcode,
          condition: data.condition,
          finish,
          variant,
          price: data.price,
          purchasePrice: data.purchasePrice ?? 0,
          marketValue: data.marketValue ?? data.price,
          quantity: data.quantity,
          quantitySold: data.quantitySold ?? 0,
          notes: data.notes,
          customImage: data.customImage,
          isManualEntry: false,
          syncedToSquare: false,
          createdAt: now,
          updatedAt: now,
        }

        console.log("Adding inventory item:", newItem)

        const response = await fetch("/api/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newItem),
        })

        if (!response.ok) {
          const text = await response.text().catch(() => "")

          console.error("================================")
          console.error("POST /api/inventory FAILED")
          console.error("Status:", response.status)
          console.error("Response:", text)
          console.error("Payload:", newItem)
          console.error("================================")

          return null
        }

        const savedItem = await response.json().catch(() => newItem)

        setItems((prev) => [savedItem as InventoryItem, ...prev])

        return savedItem as InventoryItem
      } catch (error) {
        console.error("ADD INVENTORY ITEM ERROR:", error)
        throw error
      }
    },
    [],
  )

  const addManualItem = useCallback(
    async (data: ManualCardData): Promise<InventoryItem | null> => {
      try {
        const timestamp = Date.now()

        const sku = generateManualSKU(
          data.name,
          data.setName,
          data.condition,
          data.finish,
          data.language ?? "en",
          timestamp,
        )

        const barcode = generateBarcodeString(sku)
        const id = generateInventoryId()

        const now = new Date().toISOString()

        const manualCard: PokemonCard = {
          id: `manual-${id}`,
          name: data.name,
          supertype: "Pokémon",

          set: {
            id: data.setId || `manual-set-${timestamp}`,
            name: data.setName,
            series: "Manual Entry",
            printedTotal: 0,
            total: 0,
            releaseDate: now.split("T")[0],

            images: {
              symbol: "",
              logo: "",
            },
          },

          number: data.number || "N/A",
          rarity: data.rarity,

          images: {
            small: data.customImage || "/placeholder-card.png",
            large: data.customImage || "/placeholder-card.png",
          },
        }

        const newItem: InventoryItem = {
          id,
          cardId: manualCard.id,
          card: manualCard,
          language: data.language ?? "en",
          sku,
          barcode,
          condition: data.condition,
          finish: data.finish,
          variant: data.variant ?? null,
          price: data.price,
          purchasePrice: data.purchasePrice ?? 0,
          marketValue: data.marketValue ?? data.price,
          quantity: data.quantity,
          quantitySold: data.quantitySold ?? 0,
          notes: data.notes,
          customImage: data.customImage,
          isManualEntry: true,
          syncedToSquare: false,
          createdAt: now,
          updatedAt: now,
        }

        const response = await fetch("/api/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newItem),
        })

        if (!response.ok) {
          const text = await response.text().catch(() => "")

          console.error("================================")
          console.error("POST /api/inventory FAILED")
          console.error("Status:", response.status)
          console.error("Response:", text)
          console.error("Payload:", newItem)
          console.error("================================")

          return null
        }

        const savedItem = await response.json().catch(() => newItem)

        setItems((prev) => [savedItem as InventoryItem, ...prev])

        return savedItem as InventoryItem
      } catch (error) {
        console.error("ADD MANUAL INVENTORY ITEM ERROR:", error)
        throw error
      }
    },
    [],
  )

  const updateItem = useCallback(
    async (id: string, data: Partial<InventoryFormData>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )

      const response = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        console.error(
          "Failed to update item in inventory",
          response.status,
          text,
        )
      }
    },
    [],
  )

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))

    const response = await fetch(`/api/inventory/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(
        "Failed to delete item from inventory",
        response.status,
        text,
      )
    }
  }, [])

  const recordSale = useCallback(
    async (id: string, qty: number = 1) => {
      const item = items.find((inventoryItem) => inventoryItem.id === id)

      if (!item) {
        console.error("Cannot record sale: inventory item not found", id)
        return
      }

      const nextQuantity = Math.max(0, item.quantity - qty)
      const nextQuantitySold = (item.quantitySold || 0) + qty

      setItems((prev) =>
        prev.map((inventoryItem) =>
          inventoryItem.id === id
            ? {
                ...inventoryItem,
                quantity: nextQuantity,
                quantitySold: nextQuantitySold,
                updatedAt: new Date().toISOString(),
              }
            : inventoryItem,
        ),
      )

      const response = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: nextQuantity,
          quantitySold: nextQuantitySold,
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        console.error(
          "Failed to record sale in inventory",
          response.status,
          text,
        )
      }

      // Append realized sale to analytics ledger.
      fetch("/api/analytics/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventoryId: item.id,
          cardId: item.cardId,
          cardName: item.card.name,
          setName: item.card.set.name,
          rarity: item.card.rarity,
          finish: item.finish,
          condition: item.condition,
          quantity: qty,
          unitPrice: item.price,
          purchasePrice: item.purchasePrice || 0,
        }),
      }).catch(() => undefined)
    },
    [items],
  )

  const getItemById = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items],
  )

  const getItemBySku = useCallback(
    (sku: string) => items.find((item) => item.sku === sku),
    [items],
  )

  const getItemByBarcode = useCallback(
    (barcode: string) => items.find((item) => item.barcode === barcode),
    [items],
  )

  const getItemsByCardId = useCallback(
    (cardId: string) => items.filter((item) => item.cardId === cardId),
    [items],
  )

  const getItemsByPriceTier = useCallback(
    (tier: PriceTier) =>
      items.filter((item) => getPriceTier(item.price) === tier),
    [items],
  )

  const searchItems = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase()

      return items.filter(
        (item) =>
          item.card.name.toLowerCase().includes(lowerQuery) ||
          item.card.set.name.toLowerCase().includes(lowerQuery) ||
          item.sku.toLowerCase().includes(lowerQuery) ||
          item.barcode.includes(query),
      )
    },
    [items],
  )

  const updateSquareSync = useCallback(
    (id: string, squareItemId: string, squareVariationId: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                squareItemId,
                squareVariationId,
                syncedToSquare: true,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
    },
    [],
  )

  const bulkImport = useCallback(
    async (
      importItems: ManualCardData[],
    ): Promise<{ success: number; failed: number }> => {
      let success = 0
      let failed = 0

      for (const data of importItems) {
        try {
          const result = await addManualItem(data)

          if (result) {
            success++
          } else {
            failed++
          }
        } catch (error) {
          console.error("Bulk import item failed:", error)
          failed++
        }
      }

      return {
        success,
        failed,
      }
    },
    [addManualItem],
  )

  return (
    <InventoryContext.Provider
      value={{
        items,
        addItem,
        addManualItem,
        updateItem,
        deleteItem,
        recordSale,
        getItemById,
        getItemBySku,
        getItemByBarcode,
        getItemsByCardId,
        getItemsByPriceTier,
        searchItems,
        updateSquareSync,
        bulkImport,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = useContext(InventoryContext)

  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }

  return context
}
