"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { InventoryItem, InventoryFormData, PokemonCard, CardCondition } from "./types"
import { generateSKU, generateBarcodeString } from "./barcode"

interface InventoryContextType {
  items: InventoryItem[]
  addItem: (card: PokemonCard, data: Omit<InventoryFormData, "cardId">) => InventoryItem
  updateItem: (id: string, data: Partial<InventoryFormData>) => void
  deleteItem: (id: string) => void
  getItemById: (id: string) => InventoryItem | undefined
  getItemBySku: (sku: string) => InventoryItem | undefined
  getItemByBarcode: (barcode: string) => InventoryItem | undefined
  getItemsByCardId: (cardId: string) => InventoryItem[]
  searchItems: (query: string) => InventoryItem[]
  updateSquareSync: (id: string, squareItemId: string, squareVariationId: string) => void
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
      notes: data.notes,
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

  return (
    <InventoryContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        deleteItem,
        getItemById,
        getItemBySku,
        getItemByBarcode,
        getItemsByCardId,
        searchItems,
        updateSquareSync,
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
