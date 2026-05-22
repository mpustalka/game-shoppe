"use client"


import { useState, useMemo } from "react"
import type { PokemonCard, CardCondition, PriceTier } from "@/lib/types"
import { CARD_CONDITIONS, PRICE_TIERS } from "@/lib/types"
import { useInventory } from "@/lib/inventory-context"
import { getMarketPrice } from "@/lib/pokemon-tcg"
import { compareRarity, getAvailableRarities, getCardRarityLabel } from "@/lib/card-metadata"
import * as binderApi from "@/lib/binders"
import { CardItem } from "./card-item"
import { CardDetailModal } from "./card-detail-modal"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"


interface CardGridProps {
  cards: PokemonCard[]
  setId?: string
  onSelectCards?: (selected: PokemonCard[]) => void
}

export function CardGrid({ cards, onSelectCards }: CardGridProps) {
  const { addItem } = useInventory()
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [rarity, setRarity] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"number" | "name" | "rarity-asc" | "rarity-desc" | "price-high">("number")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBinderTier, setBulkBinderTier] = useState<PriceTier>("budget")
  const [bulkCondition, setBulkCondition] = useState<CardCondition>("Near Mint")
  const [isBulkAdding, setIsBulkAdding] = useState(false)

  // Get all rarities in this set
  const allRarities = useMemo(() => {
    return getAvailableRarities(cards)
  }, [cards])

  // Filtered cards
  const filtered = useMemo(() => {
    const result = cards.filter(card => {
      const matchesSearch =
        card.name.toLowerCase().includes(search.toLowerCase()) ||
        card.number?.toLowerCase().includes(search.toLowerCase())
      const matchesRarity = rarity === "all" || getCardRarityLabel(card) === rarity
      return matchesSearch && matchesRarity
    })
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "rarity-asc":
          return compareRarity(getCardRarityLabel(a), getCardRarityLabel(b)) || a.name.localeCompare(b.name)
        case "rarity-desc":
          return compareRarity(getCardRarityLabel(b), getCardRarityLabel(a)) || a.name.localeCompare(b.name)
        case "price-high":
          return (getMarketPrice(b) ?? 0) - (getMarketPrice(a) ?? 0)
        default:
          return a.number.localeCompare(b.number, undefined, { numeric: true })
      }
    })
    return result
  }, [cards, search, rarity, sortBy])

  // Handle select
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedCards = useMemo(
    () => cards.filter((card) => selected.has(card.id)),
    [cards, selected]
  )

  const handleBulkAddToBinder = async () => {
    if (selectedCards.length === 0) return

    setIsBulkAdding(true)
    try {
      const addedItems = []
      for (const card of selectedCards) {
        const item = await addItem(card, {
          condition: bulkCondition,
          price: getMarketPrice(card) ?? 0.01,
          quantity: 1,
        })
        if (item) {
          await binderApi.addToBinder(bulkBinderTier, item)
          addedItems.push(item)
        }
      }

      if (onSelectCards) onSelectCards(selectedCards)
      setSelected(new Set())
      toast.success(`Added ${addedItems.length} card${addedItems.length === 1 ? "" : "s"} to binder`)
    } catch (error) {
      toast.error("Failed to add selected cards to binder")
    } finally {
      setIsBulkAdding(false)
    }
  }

  return (
    <>
      {/* Search and filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 items-center">
        <Input
          placeholder="Search by name or number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={rarity} onValueChange={setRarity}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>
            {allRarities.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Set Number</SelectItem>
            <SelectItem value="rarity-asc">Rarity: Common to Secret</SelectItem>
            <SelectItem value="rarity-desc">Rarity: Secret to Common</SelectItem>
            <SelectItem value="price-high">TCG Market: High to Low</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} cards</span>
      </div>

      {/* Card grid with checkboxes */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map((card) => (
          <CardItem
            key={card.id}
            card={card}
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

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 flex-col gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg sm:w-auto sm:flex-row sm:items-center sm:px-6">
          <span className="font-medium">{selected.size} selected</span>
          <Select value={bulkBinderTier} onValueChange={(v) => setBulkBinderTier(v as PriceTier)} disabled={isBulkAdding}>
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
          <Select value={bulkCondition} onValueChange={(v) => setBulkCondition(v as CardCondition)} disabled={isBulkAdding}>
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
          <Button size="sm" onClick={handleBulkAddToBinder} disabled={isBulkAdding}>
            {isBulkAdding ? "Adding..." : "Add to Binder"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={isBulkAdding}>
            Clear
          </Button>
        </div>
      )}

      <CardDetailModal
        card={selectedCard}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
