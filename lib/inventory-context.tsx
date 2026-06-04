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
  CardCondition,
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

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from Netlify Database on mount.
  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch("/api/inventory")
        if (!response.ok) {
          throw new Error("Failed to fetch inventory")
        }
        const data = await response.json()
        setItems(data)
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
      const timestamp = Date.now()
      const finish = data.finish ?? getDefaultCardFinish(card)
      const variant = data.variant ?? getDefaultCardVariant(card)
      const sku = generateSKU(card, data.condition, finish, timestamp)
      const barcode = generateBarcodeString(sku)
      const id = crypto.randomUUID()

      const newItem: InventoryItem = {
        id,
        cardId: card.id,
        card,
        sku,
        barcode,
        condition: data.condition,
        finish,
        variant,
        price: data.price,
        purchasePrice: data.purchasePrice || 0,
        marketValue: data.marketValue || data.price,
        quantity: data.quantity,
        quantitySold: data.quantitySold || 0,
        notes: data.notes,
        customImage: data.customImage,
        isManualEntry: false,
        syncedToSquare: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      })
      if (!response.ok) {
        console.error("Failed to add item to inventory")
        return null
      }
      setItems((prev) => [newItem, ...prev])
      return newItem
    },
    [],
  )

  const addManualItem = useCallback(
    async (data: ManualCardData): Promise<InventoryItem | null> => {
      const timestamp = Date.now()
      const sku = generateManualSKU(
        data.name,
        data.setName,
        data.condition,
        data.finish,
        timestamp,
      )
      const barcode = generateBarcodeString(sku)
      const id = crypto.randomUUID()

      // Create a pseudo-card object for manual entries
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
          releaseDate: new Date().toISOString().split("T")[0],
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
        sku,
        barcode,
        condition: data.condition,
        finish: data.finish,
        variant: data.variant ?? null,
        price: data.price,
        purchasePrice: data.purchasePrice || 0,
        marketValue: data.marketValue || data.price,
        quantity: data.quantity,
        quantitySold: data.quantitySold || 0,
        notes: data.notes,
        customImage: data.customImage,
        isManualEntry: true,
        syncedToSquare: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      })
      if (!response.ok) {
        console.error("Failed to add manual item to inventory")
        return null
      }
      setItems((prev) => [newItem, ...prev])
      return newItem
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        console.error("Failed to update item in inventory")
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
      console.error("Failed to delete item from inventory")
    }
  }, [])

  const recordSale = useCallback(
    async (id: string, qty: number = 1) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.max(0, item.quantity - qty),
                quantitySold: (item.quantitySold || 0) + qty,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      const item = items.find((item) => item.id === id)
      if (item) {
        const response = await fetch(`/api/inventory/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity: Math.max(0, item.quantity - qty),
            quantitySold: (item.quantitySold || 0) + qty,
          }),
        })
        if (!response.ok) {
          console.error("Failed to record sale in inventory")
        }
      }
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
          if (result) success++
          else failed++
        } catch {
          failed++
        }
      }
      return { success, failed }
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
