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
  notes?: string
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
  notes?: string
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
