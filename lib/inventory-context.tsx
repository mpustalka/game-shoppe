"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { InventoryItem, InventoryFormData, PokemonCard, CardCondition, ManualCardData, PriceTier } from "./types"
import { getPriceTier } from "./types"
import { generateSKU, generateBarcodeString, generateManualSKU } from "./barcode"

interface InventoryContextType {
  items: InventoryItem[]
  addItem: (card: PokemonCard, data: Omit<InventoryFormData, "cardId">) => InventoryItem
  addManualItem: (data: ManualCardData) => InventoryItem
  updateItem: (id: string, data: Partial<InventoryFormData>) => void
  deleteItem: (id: string) => void
  recordSale: (id: string, quantitySold?: number) => void
  getItemById: (id: string) => InventoryItem | undefined
  getItemBySku: (sku: string) => InventoryItem | undefined
  getItemByBarcode: (barcode: string) => InventoryItem | undefined
  getItemsByCardId: (cardId: string) => InventoryItem[]
  getItemsByPriceTier: (tier: PriceTier) => InventoryItem[]
  searchItems: (query: string) => InventoryItem[]
  updateSquareSync: (id: string, squareItemId: string, squareVariationId: string) => void
  bulkImport: (items: ManualCardData[]) => { success: number; failed: number }
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

const STORAGE_KEY = "pokemon-inventory"

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setItems(parsed)
        } catch (e) {
          console.error("Failed to parse stored inventory:", e)
        }
      }
      setIsLoaded(true)
    }
  }, [])

  // Save to localStorage on changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, isLoaded])

  const addItem = useCallback((card: PokemonCard, data: Omit<InventoryFormData, "cardId">): InventoryItem => {
    const timestamp = Date.now()
    const sku = generateSKU(card, data.condition, timestamp)
    const barcode = generateBarcodeString(sku)
    const id = crypto.randomUUID()

    const newItem: InventoryItem = {
      id,
      cardId: card.id,
      card,
      sku,
      barcode,
      condition: data.condition,
      price: data.price,
      quantity: data.quantity,
      quantitySold: data.quantitySold || 0,
      notes: data.notes,
      customImage: data.customImage,
      isManualEntry: false,
      syncedToSquare: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setItems((prev) => [newItem, ...prev])
    return newItem
  }, [])

  const addManualItem = useCallback((data: ManualCardData): InventoryItem => {
    const timestamp = Date.now()
    const sku = generateManualSKU(data.name, data.setName, data.condition, timestamp)
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
      price: data.price,
      quantity: data.quantity,
      quantitySold: data.quantitySold || 0,
      notes: data.notes,
      customImage: data.customImage,
      isManualEntry: true,
      syncedToSquare: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setItems((prev) => [newItem, ...prev])
    return newItem
  }, [])

  const updateItem = useCallback((id: string, data: Partial<InventoryFormData>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
  }, [])

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const recordSale = useCallback((id: string, qty: number = 1) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(0, item.quantity - qty),
              quantitySold: (item.quantitySold || 0) + qty,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
  }, [])

  const getItemById = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items]
  )

  const getItemBySku = useCallback(
    (sku: string) => items.find((item) => item.sku === sku),
    [items]
  )

  const getItemByBarcode = useCallback(
    (barcode: string) => items.find((item) => item.barcode === barcode),
    [items]
  )

  const getItemsByCardId = useCallback(
    (cardId: string) => items.filter((item) => item.cardId === cardId),
    [items]
  )

  const getItemsByPriceTier = useCallback(
    (tier: PriceTier) => items.filter((item) => getPriceTier(item.price) === tier),
    [items]
  )

  const searchItems = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase()
      return items.filter(
        (item) =>
          item.card.name.toLowerCase().includes(lowerQuery) ||
          item.card.set.name.toLowerCase().includes(lowerQuery) ||
          item.sku.toLowerCase().includes(lowerQuery) ||
          item.barcode.includes(query)
      )
    },
    [items]
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
            : item
        )
      )
    },
    []
  )

  const bulkImport = useCallback((importItems: ManualCardData[]): { success: number; failed: number } => {
    let success = 0
    let failed = 0

    importItems.forEach((data) => {
      try {
        addManualItem(data)
        success++
      } catch {
        failed++
      }
    })

    return { success, failed }
  }, [addManualItem])

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
