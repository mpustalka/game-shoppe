import type { PokemonSet, PokemonCard } from "./types"
import { getPrimaryMarketPrice } from "./card-metadata"
import { CUSTOM_SETS, getCustomSetById } from "./custom-sets" 

// Merge any locally-defined custom sets (brand-new releases the upstream API
// doesn't serve yet) with the live API results, newest first, de-duplicated by
// id so a set that later appears in the API doesn't show up twice. before ...apiSets add back ...extras to bring back loll
function mergeCustomSets(apiSets: PokemonSet[]): PokemonSet[] {
  const apiIds = new Set(apiSets.map((set) => set.id))
  const extras = CUSTOM_SETS.filter((set) => !apiIds.has(set.id))
  return [...apiSets].sort(
    (a, b) =>
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
  )
}

const BASE_URL = "https://api.pokemontcg.io/v2"

// Optional API key for higher rate limits
const API_KEY = process.env.POKEMON_TCG_API_KEY

const headers: HeadersInit = {
  "Content-Type": "application/json",
  ...(API_KEY && { "X-Api-Key": API_KEY }),
}

export async function getAllSets(): Promise<PokemonSet[]> {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 8000)

  try {
    const response = await fetch(
      `${BASE_URL}/sets?orderBy=-releaseDate`,
      {
        headers,
        signal: controller.signal,
        next: {
          revalidate: 3600,
        },
      },
    )

    if (response.status === 404) {
      return mergeCustomSets([])
    }

    if (!response.ok) {
      console.error(
        "Pokemon TCG sets request failed:",
        response.status,
        response.statusText,
      )

      return mergeCustomSets([])
    }

    const data = await response.json()

    const sets = Array.isArray(data?.data)
      ? (data.data as PokemonSet[])
      : []

    return mergeCustomSets(sets)
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      console.error(
        "Pokemon TCG sets request timed out after 8 seconds",
      )
    } else {
      console.error(
        "Pokemon TCG sets request failed:",
        error,
      )
    }

    return mergeCustomSets([])
  } finally {
    clearTimeout(timeout)
  }
}

export async function getSetById(setId: string): Promise<PokemonSet | null> {
  // Custom (locally-defined) sets short-circuit the upstream lookup.

  // const custom = getCustomSetById(setId) //  IF you want to add custom set here comment and add back lib/custom-sets.ts
  // if (custom) return custom

  const response = await fetch(`${BASE_URL}/sets/${setId}`, {
    headers,
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`Failed to fetch set: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data as PokemonSet
}

export async function getCardsBySet(
  setId: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const response = await fetch(
    `${BASE_URL}/cards?q=set.id:${setId}&page=${page}&pageSize=${pageSize}&orderBy=number`,
    {
      headers,
      next: { revalidate: 3600 },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch cards: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    cards: data.data as PokemonCard[],
    totalCount: data.totalCount as number,
  }
}

export async function getAllCardsBySet(setId: string): Promise<PokemonCard[]> {
  const pageSize = 250
  const firstPage = await getCardsBySet(setId, 1, pageSize)
  const totalPages = Math.ceil(firstPage.totalCount / pageSize)

  if (totalPages <= 1) {
    return firstPage.cards
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getCardsBySet(setId, index + 2, pageSize),
    ),
  )

  return [
    ...firstPage.cards,
    ...remainingPages.flatMap((pageData) => pageData.cards),
  ]
}

export async function getCardById(cardId: string): Promise<PokemonCard | null> {
  const response = await fetch(`${BASE_URL}/cards/${cardId}`, {
    headers,
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`Failed to fetch card: ${response.statusText}`)
  }

  const data = await response.json()
  console.log("API CARD", data.data.id, data.data.tcgplayer)
  return data.data as PokemonCard
}

export async function searchCards(
  query: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  // Build search query - search by name
  const encodedQuery = encodeURIComponent(`name:"*${query}*"`)

  const response = await fetch(
    `${BASE_URL}/cards?q=${encodedQuery}&page=${page}&pageSize=${pageSize}`,
    {
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to search cards: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    cards: data.data as PokemonCard[],
    totalCount: data.totalCount as number,
  }
}

// Get market price for a card
export function getMarketPrice(card: PokemonCard): number | null {
  return getPrimaryMarketPrice(card)
}
