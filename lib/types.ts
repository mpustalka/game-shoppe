// Pokemon TCG API Types
export interface PokemonSet {
  id: string
  name: string
  series: string
  printedTotal: number
  total: number
  releaseDate: string
  updatedAt: string
  images: {
    symbol: string
    logo: string
  }
}

export interface PokemonCard {
  id: string
  name: string
  supertype: string
  subtypes?: string[]
  hp?: string
  types?: string[]
  evolvesFrom?: string
  evolvesTo?: string[]
  rules?: string[]
  attacks?: {
    name: string
    cost: string[]
    convertedEnergyCost: number
    damage: string
    text: string
  }[]
  weaknesses?: {
    type: string
    value: string
  }[]
  resistances?: {
    type: string
    value: string
  }[]
  retreatCost?: string[]
  convertedRetreatCost?: number
  set: {
    id: string
    name: string
    series: string
    printedTotal: number
    total: number
    releaseDate: string
    images: {
      symbol: string
      logo: string
    }
  }
  number: string
  artist?: string
  rarity?: string
  flavorText?: string
  nationalPokedexNumbers?: number[]
  legalities?: {
    unlimited?: string
    standard?: string
    expanded?: string
  }
  images: {
    small: string
    large: string
  }
  tcgplayer?: {
    url: string
    updatedAt: string
    prices?: {
      holofoil?: PriceData
      reverseHolofoil?: PriceData
      normal?: PriceData
      "1stEditionHolofoil"?: PriceData
      "1stEditionNormal"?: PriceData
    }
  }
  cardmarket?: {
    url: string
    updatedAt: string
    prices?: {
      averageSellPrice: number
      lowPrice: number
      trendPrice: number
    }
  }
}

export interface PriceData {
  low: number | null
  mid: number | null
  high: number | null
  market: number | null
  directLow?: number | null
}

export type CardPrintFinish = "Normal" | "Holofoil" | "Reverse Holofoil" | "1st Edition Normal" | "1st Edition Holofoil"

export const CARD_PRINT_FINISHES: CardPrintFinish[] = [
  "Normal",
  "Holofoil",
  "Reverse Holofoil",
  "1st Edition Normal",
  "1st Edition Holofoil",
]

export const RARITY_SORT_ORDER = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Double Rare",
  "Ultra Rare",
  "Rare Ultra",
  "Illustration Rare",
  "Special Illustration Rare",
  "Special Art Rare",
  "Secret Rare",
  "Rare Secret",
  "Hyper Rare",
  "Promo",
]

export function getDisplayRarity(rarity?: string, printFinish?: CardPrintFinish): string {
  if (!rarity) return printFinish || "Unknown"
  if (printFinish === "Reverse Holofoil") return `Reverse Holo ${rarity}`
  return rarity
}

export function compareCardRarity(a: { card: { rarity?: string; name: string }; printFinish?: CardPrintFinish }, b: { card: { rarity?: string; name: string }; printFinish?: CardPrintFinish }) {
  const aIndex = RARITY_SORT_ORDER.indexOf(a.card.rarity || "")
  const bIndex = RARITY_SORT_ORDER.indexOf(b.card.rarity || "")
  const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
  const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
  if (normalizedA !== normalizedB) return normalizedA - normalizedB
  const finishCompare = (a.printFinish || "").localeCompare(b.printFinish || "")
  if (finishCompare !== 0) return finishCompare
  return a.card.name.localeCompare(b.card.name)
}

// Card Conditions
export type CardCondition = 
  | "Near Mint"
  | "Lightly Played"
  | "Moderately Played"
  | "Heavily Played"
  | "Damaged"

export const CARD_CONDITIONS: CardCondition[] = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
]

export const CONDITION_ABBREVIATIONS: Record<CardCondition, string> = {
  "Near Mint": "NM",
  "Lightly Played": "LP",
  "Moderately Played": "MP",
  "Heavily Played": "HP",
  "Damaged": "DMG",
}

// Price Tiers for Binder Organization
export type PriceTier = "budget" | "mid" | "premium"

export const PRICE_TIERS: { id: PriceTier; label: string; min: number; max: number; color: string }[] = [
  { id: "budget", label: "$0 - $4.99", min: 0, max: 4.99, color: "bg-green-500" },
  { id: "mid", label: "$5 - $29.99", min: 5, max: 29.99, color: "bg-blue-500" },
  { id: "premium", label: "$30+", min: 30, max: Infinity, color: "bg-amber-500" },
]

export function getPriceTier(price: number): PriceTier {
  if (price < 5) return "budget"
  if (price < 30) return "mid"
  return "premium"
}

// Inventory Types
export interface InventoryItem {
  id: string
  cardId: string
  card: PokemonCard
  sku: string
  barcode: string
  condition: CardCondition
  price: number
  quantity: number
  quantitySold: number
  printFinish?: CardPrintFinish
  notes?: string
  customImage?: string // For manual entries with uploaded images
  isManualEntry?: boolean // Flag for manually added cards
  squareItemId?: string
  squareVariationId?: string
  syncedToSquare: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryFormData {
  cardId: string
  condition: CardCondition
  price: number
  quantity: number
  quantitySold?: number
  printFinish?: CardPrintFinish
  notes?: string
  customImage?: string
}

// Manual Card Entry (for cards not in Pokemon TCG API)
export interface ManualCardData {
  name: string
  setName: string
  setId?: string
  number?: string
  rarity?: string
  condition: CardCondition
  price: number
  quantity: number
  quantitySold?: number
  printFinish?: CardPrintFinish
  notes?: string
  customImage?: string
}

// CSV Import Types
export interface CSVImportRow {
  name: string
  set: string
  number?: string
  condition: string
  price: string | number
  quantity: string | number
  quantitySold?: string | number
  notes?: string
}

export interface ImportResult {
  success: number
  failed: number
  errors: { row: number; error: string }[]
}

// Search/Filter Types
export interface InventoryFilters {
  search: string
  setId?: string
  condition?: CardCondition
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  syncedToSquare?: boolean
}

// QR Code Data
export interface QRCodeData {
  id: string
  sku: string
  cardName: string
  setName: string
  condition: string
  price: number
  printFinish?: string
}

// Square Integration Types
export interface SquareSyncResult {
  success: boolean
  itemId?: string
  variationId?: string
  error?: string
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  count: number
  totalCount: number
}
