"use client"

import type { PokemonCard } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMarketPrice } from "@/lib/pokemon-tcg"
import { cn } from "@/lib/utils"

interface CardItemProps {
  card: PokemonCard
  onClick?: () => void
  showPrice?: boolean
  selectable?: boolean
  checked?: boolean
  onSelect?: () => void
}

const rarityColors: Record<string, string> = {
  "Common": "bg-secondary text-secondary-foreground",
  "Uncommon": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  "Rare": "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  "Rare Holo": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
  "Rare Holo EX": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "Rare Holo GX": "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300",
  "Rare Holo V": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
  "Rare Ultra": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "Rare Secret": "bg-amber-200 text-amber-900 dark:bg-amber-800/50 dark:text-amber-200",
  "Rare Shiny": "bg-gradient-to-r from-pink-100 to-blue-100 text-pink-800 dark:from-pink-900/50 dark:to-blue-900/50 dark:text-pink-300",
  "Illustration Rare": "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
  "Special Art Rare": "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
  "Hyper Rare": "bg-amber-200 text-amber-900 dark:bg-amber-800/50 dark:text-amber-200",
}

  const marketPrice = showPrice ? getMarketPrice(card) : null

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
                  rarityColors[card.rarity] || "bg-secondary text-secondary-foreground"
                )}
              >
                {card.rarity}
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
