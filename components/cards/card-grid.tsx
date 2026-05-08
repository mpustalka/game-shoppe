"use client"

import { useState } from "react"
import type { PokemonCard } from "@/lib/types"
import { CardItem } from "./card-item"
import { CardDetailModal } from "./card-detail-modal"

interface CardGridProps {
  cards: PokemonCard[]
  setId?: string
}

export function CardGrid({ cards, setId }: CardGridProps) {
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleCardClick = (card: PokemonCard) => {
    setSelectedCard(card)
    setModalOpen(true)
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((card) => (
          <CardItem 
            key={card.id} 
            card={card} 
            onClick={() => handleCardClick(card)}
          />
        ))}
      </div>

      <CardDetailModal
        card={selectedCard}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
