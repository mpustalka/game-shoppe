"use client"


import { useState, useMemo } from "react"
import type { PokemonCard } from "@/lib/types"
import { CardItem } from "./card-item"
import { CardDetailModal } from "./card-detail-modal"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"


interface CardGridProps {
  cards: PokemonCard[]
  setId?: string
  onSelectCards?: (selected: PokemonCard[]) => void
}


  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [rarity, setRarity] = useState<string>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Get all rarities in this set
  const allRarities = useMemo(() => {
    const rarities = new Set(cards.map(c => c.rarity).filter(Boolean) as string[])
    return Array.from(rarities).sort()
  }, [cards])

  // Filtered cards
  const filtered = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch =
        card.name.toLowerCase().includes(search.toLowerCase()) ||
        card.number?.toLowerCase().includes(search.toLowerCase())
      const matchesRarity = rarity === "all" || card.rarity === rarity
      return matchesSearch && matchesRarity
    })
  }, [cards, search, rarity])

  // Handle select
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Notify parent if needed
  // useEffect(() => { if (onSelectCards) onSelectCards(cards.filter(c => selected.has(c.id))) }, [selected])

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
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} cards</span>
      </div>

      {/* Card grid with checkboxes */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            onClick={() => setSelectedCard(card)}
            selectable
            checked={selected.has(card.id)}
            onSelect={() => toggleSelect(card.id)}
          />
        ))}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border rounded-lg shadow-lg px-6 py-3 flex gap-4 items-center z-50">
          <span className="font-medium">{selected.size} selected</span>
          {/* TODO: Add to binder button here */}
          <Button size="sm" variant="primary" disabled>
            Add to Binder (coming soon)
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
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
