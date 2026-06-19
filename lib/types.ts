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
    updatedAt?: string
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
  Damaged: "DMG",
}

// Card finishes/types tracked per inventory listing.
// Card finishes tracked per inventory listing.
export type CardFinish =
  | "Normal"
  | "Reverse Holo"
  | "Pokeball Reverse Holo"
  | "Energy Symbol Reverse Holo"
  | "Masterball Reverse Holo"
  | "Other Reverse Holo"
  | "Holo"
  | "Non Holo"
  | "Rainbow Holo"
  | "Baby Shiny Holo"
  | "Cosmo Holo"
  | "Stamped"
  | "Other Holo"
  | "Full Art"

// Card variants/types.
export type CardVariant =
  | "EX"
  | "GX"
  | "V"
  | "VMAX"
  | "VSTAR"
  | "BREAK"
  | "LEGEND"
  | "Lv.X"
  | "Prime"
  | "Delta Species"
  | "TAG TEAM"

export const CARD_FINISHES: CardFinish[] = [
  "Normal",
  "Reverse Holo",
  "Pokeball Reverse Holo",
  "Energy Symbol Reverse Holo",
  "Masterball Reverse Holo",
  "Other Reverse Holo",
  "Holo",
  "Non Holo",
  "Rainbow Holo",
  "Baby Shiny Holo",
  "Cosmo Holo",
  "Stamped",
  "Other Holo",
  "Full Art",
]

export const CARD_VARIANTS: CardVariant[] = [
  "EX",
  "GX",
  "V",
  "VMAX",
  "VSTAR",
  "BREAK",
  "LEGEND",
  "Lv.X",
  "Prime",
  "Delta Species",
  "TAG TEAM",
]

export const FINISH_ABBREVIATIONS: Record<CardFinish, string> = {
  Normal: "NRM",
  "Reverse Holo": "RVH",
  "Pokeball Reverse Holo": "PBH",
  "Energy Symbol Reverse Holo": "ESH",
  "Masterball Reverse Holo": "MBH",
  "Other Reverse Holo": "ORH",
  Holo: "HOL",
  "Non Holo": "NON",
  "Rainbow Holo": "RNB",
  "Baby Shiny Holo": "BSH",
  "Cosmo Holo": "COS",
  Stamped: "STP",
  "Other Holo": "OTH",
  "Full Art": "FAR",
}

export const VARIANT_ABBREVIATIONS: Record<CardVariant, string> = {
  EX: "EX",
  GX: "GX",
  V: "V",
  VMAX: "VMX",
  VSTAR: "VST",
  BREAK: "BRK",
  LEGEND: "LEG",
  "Lv.X": "LVX",
  Prime: "PRM",
  "Delta Species": "DLT",
  "TAG TEAM": "TAG",
}

export function getDefaultCardFinish(
  card?: Pick<PokemonCard, "rarity" | "subtypes">,
): CardFinish {
  const rarity = card?.rarity?.toLowerCase() ?? ""

  if (rarity.includes("rainbow")) return "Rainbow Holo"
  if (rarity.includes("shiny")) return "Baby Shiny Holo"
  if (rarity.includes("holo")) return "Holo"

  return "Normal"
}

export function getDefaultCardVariant(
  card?: Pick<PokemonCard, "subtypes">,
): CardVariant | null {
  const subtypes = card?.subtypes?.map((subtype) => subtype.toLowerCase()) ?? []

  if (subtypes.includes("vmax")) return "VMAX"
  if (subtypes.includes("vstar")) return "VSTAR"
  if (subtypes.includes("gx")) return "GX"
  if (subtypes.includes("ex")) return "EX"
  if (subtypes.includes("v")) return "V"
  if (subtypes.includes("break")) return "BREAK"
  if (subtypes.includes("legend")) return "LEGEND"
  if (subtypes.includes("lv.x")) return "Lv.X"
  if (subtypes.includes("prime")) return "Prime"
  if (subtypes.includes("delta species")) return "Delta Species"
  if (subtypes.includes("tag team")) return "TAG TEAM"

  return null
}

// Price Tiers for Binder Organization
export type PriceTier = "budget" | "mid" | "premium"

export const PRICE_TIERS: {
  id: PriceTier
  label: string
  min: number
  max: number
  color: string
}[] = [
  {
    id: "budget",
    label: "$0 - $4.99",
    min: 0,
    max: 4.99,
    color: "bg-green-500",
  },
  { id: "mid", label: "$5 - $29.99", min: 5, max: 29.99, color: "bg-blue-500" },
  {
    id: "premium",
    label: "$30+",
    min: 30,
    max: Infinity,
    color: "bg-amber-500",
  },
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
  language: "en" | "ja"
  sku: string
  barcode: string
  condition: CardCondition
  finish: CardFinish
  variant?: CardVariant | null
  price: number
  purchasePrice?: number
  marketValue?: number
  quantity: number
  quantitySold: number
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
  language: "en" | "ja"
  condition: CardCondition
  finish: CardFinish
  variant?: CardVariant | null
  price: number
  purchasePrice?: number
  marketValue?: number
  quantity: number
  quantitySold?: number
  notes?: string
  customImage?: string
}

// Manual Card Entry (for cards not in Pokemon TCG API)
export interface ManualCardData {
  name: string
  language: "en" | "ja"
  setName: string
  setId?: string
  updatedAt?: string
  number?: string
  rarity?: string
  condition: CardCondition
  finish: CardFinish
  variant?: CardVariant | null
  price: number
  purchasePrice?: number
  marketValue?: number
  quantity: number
  quantitySold?: number
  notes?: string
  customImage?: string
}

// CSV Import Types
export interface CSVImportRow {
  name: string
  set: string
  updatedAt?: string
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
  updatedAt?: string
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
  updatedAt?: string
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
