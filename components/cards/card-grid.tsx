"use client"

import { useMemo, useState } from "react"

import type { PokemonCard, CardCondition, PriceTier } from "@/lib/types"

import { CARD_CONDITIONS, PRICE_TIERS, getDefaultCardFinish } from "@/lib/types"

import { useInventory } from "@/lib/inventory-context"

import { getMarketPrice } from "@/lib/pokemon-tcg"

import {
  compareRarity,
  getAvailableRarities,
  getCardRarityLabel,
} from "@/lib/card-metadata"

import * as binderApi from "@/lib/binders"

import type { BinderLanguage } from "@/lib/binders"

import { CardItem } from "./card-item"
import { CardDetailModal } from "./card-detail-modal"
import { BulkInventoryModal } from "./bulk-inventory-modal"

import { Input } from "@/components/ui/input"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "@/components/ui/button"

import { toast } from "sonner"

interface CardGridProps {
  cards: PokemonCard[]
  setId?: string
  language?: BinderLanguage
  onSelectCards?: (selected: PokemonCard[]) => void
}

export function CardGrid({
  cards,
  onSelectCards,
  language = "en",
}: CardGridProps) {
  const { addItem, items } = useInventory()

  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)

  const [modalOpen, setModalOpen] = useState(false)

  const [bulkInventoryOpen, setBulkInventoryOpen] = useState(false)

  const [search, setSearch] = useState("")

  const [rarity, setRarity] = useState<string>("all")

  const [sortBy, setSortBy] = useState<
    "number" | "name" | "rarity-asc" | "rarity-desc" | "price-high"
  >("number")

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [bulkBinderTier, setBulkBinderTier] = useState<PriceTier>("budget")

  const [bulkCondition, setBulkCondition] = useState<CardCondition>("Near Mint")

  const [isBulkAdding, setIsBulkAdding] = useState(false)

  const allRarities = useMemo(() => {
    return getAvailableRarities(cards)
  }, [cards])

  const filtered = useMemo(() => {
    const result = cards.filter((card) => {
      const matchesSearch =
        card.name.toLowerCase().includes(search.toLowerCase()) ||
        card.number?.toLowerCase().includes(search.toLowerCase())

      const matchesRarity =
        rarity === "all" || getCardRarityLabel(card) === rarity

      return matchesSearch && matchesRarity
    })

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)

        case "rarity-asc":
          return (
            compareRarity(getCardRarityLabel(a), getCardRarityLabel(b)) ||
            a.name.localeCompare(b.name)
          )

        case "rarity-desc":
          return (
            compareRarity(getCardRarityLabel(b), getCardRarityLabel(a)) ||
            a.name.localeCompare(b.name)
          )

        case "price-high":
          return (getMarketPrice(b) ?? 0) - (getMarketPrice(a) ?? 0)

        default:
          return a.number.localeCompare(b.number, undefined, {
            numeric: true,
          })
      }
    })

    return result
  }, [cards, search, rarity, sortBy])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const inventoryMap = useMemo(() => {
    const map = new Map<string, typeof items>()

    items.forEach((item) => {
      const existing = map.get(item.cardId) || []

      existing.push(item)

      map.set(item.cardId, existing)
    })

    return map
  }, [items])

  const selectedCards = useMemo(
    () => cards.filter((card) => selected.has(card.id)),
    [cards, selected],
  )

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)

      filtered.forEach((card) => {
        next.add(card.id)
      })

      return next
    })
  }

  const clearSelected = () => {
    setSelected(new Set())
  }

  const handleBulkAddToBinder = async () => {
    if (selectedCards.length === 0) {
      return
    }

    setIsBulkAdding(true)

    try {
      const addedItems = []

      for (const card of selectedCards) {
        const item = await addItem(card, {
          condition: bulkCondition,

          finish: getDefaultCardFinish(card),

          price: getMarketPrice(card) ?? 0.01,

          quantity: 1,

          language,
        })

        if (item) {
          await binderApi.addToBinder(bulkBinderTier, item, language)

          addedItems.push(item)
        }
      }

      if (onSelectCards) {
        onSelectCards(selectedCards)
      }

      clearSelected()

      toast.success(
        `Added ${addedItems.length} card${
          addedItems.length === 1 ? "" : "s"
        } to binder`,
      )
    } catch (error) {
      console.error("Bulk binder add failed:", error)

      toast.error("Failed to add selected cards to binder")
    } finally {
      setIsBulkAdding(false)
    }
  }

  return (
    <>
      {/* Search / Filter Bar */}
      <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(260px,1fr)_190px_210px_auto_auto] lg:items-center">
        <Input
          placeholder="Search by name or number..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white placeholder:text-white/30"
        />

        <Select value={rarity} onValueChange={setRarity}>
          <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white">
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>

            {allRarities.map((rarityOption) => (
              <SelectItem key={rarityOption} value={rarityOption}>
                {rarityOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="number">Set Number</SelectItem>

            <SelectItem value="rarity-asc">Rarity: Common to Secret</SelectItem>

            <SelectItem value="rarity-desc">
              Rarity: Secret to Common
            </SelectItem>

            <SelectItem value="price-high">TCG Market: High to Low</SelectItem>

            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAllVisible}
        >
          Select Visible
        </Button>

        <span className="text-sm font-medium text-white/40 lg:ml-auto">
          {filtered.length} cards
        </span>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
        {filtered.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            inventoryItems={inventoryMap.get(card.id) || []}
            onClick={() => {
              setSelectedCard(card)
              setModalOpen(true)
            }}
            selectable
            checked={selected.has(card.id)}
            onSelect={() => toggleSelect(card.id)}
          />
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-3 left-1/2 z-50 flex max-h-[70dvh] w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#111114]/95 px-3 py-3 text-white shadow-2xl shadow-black/50 backdrop-blur-xl sm:bottom-4 sm:w-[calc(100vw-2rem)] sm:flex-row sm:items-center sm:px-5">
          <span className="whitespace-nowrap font-medium">
            {selected.size} selected
          </span>

          {/* Inventory */}
          <Button
            size="sm"
            onClick={() => setBulkInventoryOpen(true)}
            disabled={isBulkAdding}
          >
            Add to Inventory
          </Button>

          <div className="hidden h-8 w-px bg-border sm:block" />

          {/* Binder Options */}
          <Select
            value={bulkBinderTier}
            onValueChange={(value) => setBulkBinderTier(value as PriceTier)}
            disabled={isBulkAdding}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {PRICE_TIERS.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.label} binder
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={bulkCondition}
            onValueChange={(value) => setBulkCondition(value as CardCondition)}
            disabled={isBulkAdding}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {CARD_CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleBulkAddToBinder}
            disabled={isBulkAdding}
          >
            {isBulkAdding ? "Adding..." : "Add to Binder"}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelected}
            disabled={isBulkAdding}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Single-card modal */}
      <CardDetailModal
        card={selectedCard}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Bulk inventory modal */}
      <BulkInventoryModal
        open={bulkInventoryOpen}
        onOpenChange={setBulkInventoryOpen}
        cards={selectedCards}
        language={language}
        onSuccess={() => {
          if (onSelectCards) {
            onSelectCards(selectedCards)
          }

          clearSelected()
        }}
      />
    </>
  )
}