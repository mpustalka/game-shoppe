import type { PokemonSet, PokemonCard } from "./types"

const BASE_URL = "https://tcgtracking.com/tcgapi/v1"
const JAPANESE_CATEGORY = 85

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

  const sorted = [...sets].sort((a: any, b: any) => {
    return (
      new Date(b.published_on || 0).getTime() -
      new Date(a.published_on || 0).getTime()
    )
  })

  return sorted.map(
    (set: any): PokemonSet => ({
      id: String(set.id ?? ""),
      name: set.name || "",
      series: "Pokemon Japan",
      printedTotal: set.product_count || 0,
      total: set.product_count || 0,
      releaseDate: set.published_on || "",
      updatedAt: set.modified_on || "",
      images: {
        symbol: set.set_symbol_url || "",
        logo: "",
      },
    }),
  )
}

export async function getJapaneseSetById(
  setId: string,
): Promise<PokemonSet | null> {
  const url = `${BASE_URL}/${JAPANESE_CATEGORY}/sets/${setId}`

  const response = await fetch(url, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()

  return {
    id: String(data.set_id ?? setId),
    name: data.set_name || "",
    series: "Pokemon Japan",
    printedTotal: data.product_count || 0,
    total: data.product_count || 0,
    releaseDate: data.set_released || "",
    updatedAt: data.data_modified || "",
    images: {
      symbol: "",
      logo: "",
    },
  }
}

export async function getJapaneseCardsBySet(
  setId: string,
): Promise<PokemonCard[]> {
  const url = `${BASE_URL}/${JAPANESE_CATEGORY}/sets/${setId}`

  const response = await fetch(url, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    const err = await response.text()
    console.error("Set API error:", err)
    throw new Error(`Failed to fetch cards for set ${setId}`)
  }

  const data = await response.json()

  return (data.products || [])
    .filter((card: any) => card.number != null && card.number !== "")
    .map(
      (card: any): PokemonCard => ({
        id: String(card.id ?? ""),
        name: card.name || "Unknown Card",
        number: String(card.number ?? ""),
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
        artist: undefined,
        rarity: card.rarity || undefined,
        flavorText: undefined,
        nationalPokedexNumbers: [],
        legalities: {},
        images: {
          small: card.image_url || "",
          large: card.image_url || "",
        },
        tcgplayer: undefined,
        cardmarket: undefined,
        set: {
          id: String(data.set_id ?? setId),
          name: data.set_name || "",
          series: "Pokemon Japan",
          printedTotal: data.product_count || data.products?.length || 0,
          total: data.product_count || data.products?.length || 0,
          releaseDate: data.set_released || "",
          updatedAt: data.data_modified || "",
          images: {
            symbol: "",
            logo: "",
          },
        },
      }),
    )
}
