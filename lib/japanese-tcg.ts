import type { PokemonSet, PokemonCard } from "./types"

const BASE_URL = "https://tcgtracking.com/tcgapi/v1"
const JAPANESE_CATEGORY = 85

console.log("JAPANESE FILE LOADED")
console.log("BASE_URL VALUE:", BASE_URL)
console.log("SETS URL:", `${BASE_URL}/${JAPANESE_CATEGORY}/sets`)

/**
 * GET ALL JAPANESE SETS
 */
export async function getAllJapaneseSets(): Promise<PokemonSet[]> {
  const url = `${BASE_URL}/${JAPANESE_CATEGORY}/sets`

  const response = await fetch(url, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    const err = await response.text()
    console.error("Japanese API error:", err)
    throw new Error("Failed to fetch Japanese sets")
  }

  const data = await response.json()

  const sets = data.sets || []

  // sort newest → oldest
  const sorted = sets.sort((a: any, b: any) => {
    return (
      new Date(b.releaseDate || b.published_on || 0).getTime() -
      new Date(a.releaseDate || a.published_on || 0).getTime()
    )
  })

  return sorted.map(
    (set: any): PokemonSet => ({
      id: set.id,
      name: set.name,
      series: "Pokemon Japan",
      printedTotal: set.product_count || 0,
      total: set.product_count || 0,
      releaseDate: set.releaseDate || set.published_on || "",
      updatedAt: set.modified_on || set.updated_on || "",
      images: {
        symbol: set.images?.symbol || set.set_symbol_url || "",
        logo: set.images?.logo || set.set_logo_url || "",
      },
    }),
  )
}

/**
 * GET SET BY ID
 */
export async function getJapaneseSetById(
  setId: string,
): Promise<PokemonSet | null> {
  const sets = await getAllJapaneseSets()
  return sets.find((s) => s.id === setId) || null
}

/**
 * GET CARDS (SKU LEVEL)
 */
export async function getJapaneseCardsBySet(
  setId: string,
): Promise<PokemonCard[]> {
  const url = `${BASE_URL}/${JAPANESE_CATEGORY}/sets/${setId}/skus`

  const response = await fetch(url, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    const err = await response.text()
    console.error("SKU API error:", err)
    throw new Error(`Failed to fetch SKUs for set ${setId}`)
  }

  const data = await response.json()

  return (data.skus || []).map(
    (card: any): PokemonCard => ({
      id: card.product_id || card.id,
      name: card.name || "Unknown Card",
      number: card.number || "",

      // REQUIRED by your PokemonCard type
      supertype: "Pokémon",
      subtypes: [],

      hp: undefined,
      types: [],
      evolvesFrom: undefined,
      evolvesTo: [],
      rules: [],
      attacks: [],
      weaknesses: [],
      resistances: [],
      retreatCost: [],
      convertedRetreatCost: 0,

      images: {
        small: card.image_url || "",
        large: card.image_url || "",
      },

      rarity: card.rarity || undefined,

      set: {
        id: setId,
        name: data.set_name || "",
        series: "Pokemon Japan",
        printedTotal: data.product_count || 0,
        total: data.product_count || 0,
        releaseDate: data.set_released || "",
        updatedAt: data.updated_on || "",
        images: {
          symbol: "",
          logo: "",
        },
      },
    }),
  )
}
