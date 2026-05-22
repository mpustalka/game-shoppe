"use client"

import type { PokemonCard } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMarketPrice } from "@/lib/pokemon-tcg"
import { getCardRarityLabel, rarityColors } from "@/lib/card-metadata"
import { cn } from "@/lib/utils"

interface CardItemProps {
  card: PokemonCard
  onClick?: () => void
  showPrice?: boolean
  selectable?: boolean
  checked?: boolean
  onSelect?: () => void
}

export function CardItem({
  card,
  onClick,
  showPrice,
  selectable,
  checked,
  onSelect,
}: CardItemProps) {
  const marketPrice = showPrice ? getMarketPrice(card) : null
  const rarity = getCardRarityLabel(card)

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all relative",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
      )}
      onClick={onClick}
    >
      <CardContent className="p-2">
        {/* Checkbox for multi-select */}
        {typeof selectable !== "undefined" && (
          <input
            type="checkbox"
            checked={checked}
            onChange={e => {
              e.stopPropagation();
              if (onSelect) onSelect();
            }}
            className="absolute top-2 left-2 z-10 h-4 w-4 accent-primary"
            onClick={e => e.stopPropagation()}
          />
        )}

        {/* Card Image */}
        <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted">
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
                  rarityColors[rarity] || "bg-secondary text-secondary-foreground"
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
        </div>
      </CardContent>
    </Card>
  )
}
