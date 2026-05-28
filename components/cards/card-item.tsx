"use client"

import type {
  PokemonCard,
  InventoryItem,
} from "@/lib/types"

import { FINISH_ABBREVIATIONS } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMarketPrice } from "@/lib/pokemon-tcg"
import { getCardRarityLabel, rarityColors } from "@/lib/card-metadata"
import { cn } from "@/lib/utils"

interface CardItemProps {
  card: PokemonCard
  inventoryItems?: InventoryItem[]
  onClick?: () => void
  showPrice?: boolean
  selectable?: boolean
  checked?: boolean
  onSelect?: () => void
}

export function CardItem({
  card,
  inventoryItems = [],
  onClick,
  showPrice,
  selectable,
  checked,
  onSelect,
}: CardItemProps) {
  const marketPrice = showPrice ? getMarketPrice(card) : null

  const owned = inventoryItems.length > 0

  const finishSummary = inventoryItems.reduce<Record<string, number>>(
    (acc, item) => {
      const key = item.finish || "Normal"

      acc[key] = (acc[key] || 0) + item.quantity

      return acc
    },
    {}
  )

  const rarity = getCardRarityLabel(card)

  return (
  <Card
    className={cn(
      "group overflow-hidden transition-all relative duration-200",
      owned
        ? "opacity-100"
        : "opacity-50 grayscale hover:opacity-80 hover:grayscale-0",
      onClick &&
        "cursor-pointer hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
    )}
    onClick={onClick}
  >
    <CardContent className="p-2">
      {/* Checkbox for multi-select */}
      {typeof selectable !== "undefined" && (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation()
            if (onSelect) onSelect()
          }}
          className="absolute top-2 left-2 z-10 h-4 w-4 accent-primary"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Card Image */}
      <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted">
        {owned && (
          <div className="absolute right-2 top-2 z-10 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white shadow">
            ✓
          </div>
        )}

        <img
          src={card.images.small}
          alt={card.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />

        {/* Rarity Badge */}
        {card.rarity && (
          <div className="absolute bottom-1 left-1 right-1">
            <Badge
              className={cn(
                "w-full justify-center truncate text-[10px]",
                rarityColors[rarity] ||
                  "bg-secondary text-secondary-foreground"
              )}
            >
              {rarity}
            </Badge>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="mt-2 space-y-1">
        <h3 className="truncate text-sm font-medium leading-tight text-foreground">
          {card.name}
        </h3>

        <p className="text-xs text-muted-foreground">
          #{card.number}
        </p>

        {/* Price */}
        {showPrice && marketPrice !== null && (
          <p className="text-sm font-semibold text-primary">
            ${marketPrice.toFixed(2)}
          </p>
        )}

        {/* Finish Badges */}
        {owned && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(finishSummary).map(([finish, qty]) => {
              const abbreviation =
                FINISH_ABBREVIATIONS[
                  finish as keyof typeof FINISH_ABBREVIATIONS
                ] || finish

              return (
                <div
                  key={finish}
                  className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
                >
                  {abbreviation} x{qty}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
  )
}