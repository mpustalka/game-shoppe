import { PokemonCard, PokemonSet } from "@/lib/types"

const BASE_URL = "https://tcgtracking.com/tcgapi/v1"

export const CATEGORY_IDS = {
  ENGLISH: 3,
  JAPANESE: 85,
}

export async function getSets(categoryId: number) {
  const res = await fetch(`${BASE_URL}/${categoryId}/sets`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error("Failed to fetch sets")
  }

  return res.json()
}

export async function getSet(categoryId: number, setId: string) {
  const res = await fetch(`${BASE_URL}/${categoryId}/sets/${setId}`)

  if (!res.ok) {
    throw new Error("Failed to fetch set")
  }

  return res.json()
}

export async function getSetPricing(categoryId: number, setId: string) {
  const res = await fetch(`${BASE_URL}/${categoryId}/sets/${setId}/pricing`)

  if (!res.ok) {
    throw new Error("Failed to fetch pricing")
  }

  return res.json()
}

export async function getSetSkus(categoryId: number, setId: string) {
  const res = await fetch(`${BASE_URL}/${categoryId}/sets/${setId}/skus`)

  if (!res.ok) {
    throw new Error("Failed to fetch skus")
  }

  return res.json()
}
