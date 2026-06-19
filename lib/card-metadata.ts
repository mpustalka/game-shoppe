import type { CardCondition, PokemonCard, PriceData } from "./types"

export const RARITY_ORDER = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo LV.X",
  "Rare Holo Star",
  "Rare Prime",
  "Rare ACE",
  "Rare BREAK",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Rare Holo ex",
  "Double Rare",
  "Ultra Rare",
  "Rare Ultra",
  "Illustration Rare",
  "Special Illustration Rare",
  "Special Art Rare",
  "Full Art",
  "Rare Rainbow",
  "Hyper Rare",
  "Secret Rare",
  "Rare Secret",
  "Amazing Rare",
  "Radiant Rare",
  "Rare Shiny",
  "Rare Shiny GX",
  "Promo",
  "LEGEND",
]

export const RARITY_ALIASES: Record<string, string> = {
  ex: "Rare Holo ex",
  EX: "Rare Holo EX",
  V: "Rare Holo V",
  VMAX: "Rare Holo VMAX",
  VSTAR: "Rare Holo VSTAR",
  IR: "Illustration Rare",
  SIR: "Special Illustration Rare",
  "Illustration rare": "Illustration Rare",
  "Special illustration rare": "Special Illustration Rare",
  "Full art": "Full Art",
}

export const rarityColors: Record<string, string> = {
  Common: "bg-secondary text-secondary-foreground",
  Uncommon: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  Rare: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  "Rare Holo": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
  "Rare Holo EX": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "Rare Holo ex": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "Rare Holo GX": "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300",
  "Rare Holo V": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
  "Rare Holo VMAX": "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  "Rare Holo VSTAR": "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  "Rare Ultra": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "Ultra Rare": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "Rare Secret": "bg-amber-200 text-amber-900 dark:bg-amber-800/50 dark:text-amber-200",
  "Secret Rare": "bg-amber-200 text-amber-900 dark:bg-amber-800/50 dark:text-amber-200",
  "Rare Rainbow": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300",
  "Rare Shiny": "bg-gradient-to-r from-pink-100 to-blue-100 text-pink-800 dark:from-pink-900/50 dark:to-blue-900/50 dark:text-pink-300",
  "Rare Shiny GX": "bg-gradient-to-r from-pink-100 to-blue-100 text-pink-800 dark:from-pink-900/50 dark:to-blue-900/50 dark:text-pink-300",
  "Illustration Rare": "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
  "Special Illustration Rare": "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
  "Special Art Rare": "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
  "Full Art": "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  "Hyper Rare": "bg-amber-200 text-amber-900 dark:bg-amber-800/50 dark:text-amber-200",
}

const conditionMultipliers: Record<CardCondition, number> = {
  "Near Mint": 1,
  "Lightly Played": 0.86,
  "Moderately Played": 0.72,
  "Heavily Played": 0.58,
  Damaged: 0.42,
}

const finishLabels: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse Holo",
  "1stEditionHolofoil": "1st Edition Holo",
  "1stEditionNormal": "1st Edition Normal",
}

export function normalizeRarity(rarity?: string): string {
  if (!rarity) return "Unknown"
  return RARITY_ALIASES[rarity] ?? rarity
}

export function getCardRarityLabel(card: PokemonCard): string {
  if (card.subtypes?.some((subtype) => subtype.toLowerCase() === "full art")) {
    return "Full Art"
  }
  return normalizeRarity(card.rarity)
}

export function compareRarity(a?: string, b?: string): number {
  const normalizedA = normalizeRarity(a)
  const normalizedB = normalizeRarity(b)
  const indexA = RARITY_ORDER.indexOf(normalizedA)
  const indexB = RARITY_ORDER.indexOf(normalizedB)
  const rankA = indexA === -1 ? RARITY_ORDER.length : indexA
  const rankB = indexB === -1 ? RARITY_ORDER.length : indexB
  return rankA === rankB ? normalizedA.localeCompare(normalizedB) : rankA - rankB
}

export function getAvailableRarities(cards: PokemonCard[]): string[] {
  const rarities = new Set(cards.map((card) => getCardRarityLabel(card)).filter((rarity) => rarity !== "Unknown"))
  return Array.from(rarities).sort(compareRarity)
}

export function getAvailableSets(
  cards: PokemonCard[],
): { id: string; name: string }[] {
  const map = new Map<string, string>()
  for (const card of cards) {
    const id = card.set?.id || card.set?.name
    const name = card.set?.name
    if (id && name && !map.has(id)) map.set(id, name)
  }
  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

export function getTcgPriceRows(card: PokemonCard) {
  const prices = card.tcgplayer?.prices
  if (!prices) return []

  return Object.entries(prices)
    .filter((entry): entry is [string, PriceData] => Boolean(entry[1]))
    .map(([finish, price]) => ({
      finish,
      label: finishLabels[finish] ?? finish,
      low: price.low,
      mid: price.mid,
      high: price.high,
      market: price.market,
      directLow: price.directLow,
    }))
}

export function getConditionPrice(price: number | null | undefined, condition: CardCondition): number | null {
  if (price == null) return null
  return Number((price * conditionMultipliers[condition]).toFixed(2))
}

export function getConditionPriceRows(card: PokemonCard, condition: CardCondition) {
  return getTcgPriceRows(card).map((row) => ({
    ...row,
    condition,
    estimatedMarket: getConditionPrice(row.market ?? row.mid ?? row.low, condition),
  }))
}

export function getPrimaryMarketPrice(card: PokemonCard): number | null {
  const rows = getTcgPriceRows(card)
  for (const row of rows) {
    if (row.market != null) return row.market
  }
  return card.cardmarket?.prices?.trendPrice ?? null
}
