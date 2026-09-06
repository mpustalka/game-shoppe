import { cache } from "react"

import type { PokemonSet, PokemonCard } from "./types"
import { getPrimaryMarketPrice } from "./card-metadata"

const BASE_URL = "https://api.pokemontcg.io/v2"
const API_KEY = process.env.POKEMON_TCG_API_KEY

const REQUEST_TIMEOUT_MS = 10_000
const MAX_ATTEMPTS = 3

const headers: HeadersInit = {
  "Content-Type": "application/json",
  ...(API_KEY && { "X-Api-Key": API_KEY }),
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

class PokemonTcgHttpError extends Error {
  status: number

  constructor(status: number, statusText: string, url: string) {
    super(
      `Pokemon TCG API request failed (${status} ${statusText || "Unknown"}): ${url}`,
    )
    this.name = "PokemonTcgHttpError"
    this.status = status
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryDelay(attempt: number) {
  return attempt === 1 ? 300 : 750
}

async function pokemonFetch<T>(
  path: string,
  options: {
    revalidate: number
    allowNotFound?: boolean
  },
): Promise<T | null> {
  const url = `${BASE_URL}${path}`

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        next: {
          revalidate: options.revalidate,
        },
      })

      if (response.status === 404 && options.allowNotFound) {
        return null
      }

      if (!response.ok) {
        const error = new PokemonTcgHttpError(
          response.status,
          response.statusText,
          url,
        )

        if (
          RETRYABLE_STATUS.has(response.status) &&
          attempt < MAX_ATTEMPTS
        ) {
          console.warn(
            `Pokemon TCG API temporary failure (${response.status}) on attempt ${attempt}/${MAX_ATTEMPTS}: ${url}`,
          )
          await sleep(retryDelay(attempt))
          continue
        }

        throw error
      }

      return (await response.json()) as T
    } catch (error) {
      const isAbort =
        error instanceof Error && error.name === "AbortError"

      const isHttpError = error instanceof PokemonTcgHttpError

      if (isHttpError) {
        throw error
      }

      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          isAbort
            ? `Pokemon TCG API timed out after ${REQUEST_TIMEOUT_MS}ms on attempt ${attempt}/${MAX_ATTEMPTS}: ${url}`
            : `Pokemon TCG API network failure on attempt ${attempt}/${MAX_ATTEMPTS}: ${url}`,
          isAbort ? undefined : error,
        )

        await sleep(retryDelay(attempt))
        continue
      }

      if (isAbort) {
        throw new Error(
          `Pokemon TCG API timed out after ${MAX_ATTEMPTS} attempts: ${url}`,
        )
      }

      throw error instanceof Error
        ? error
        : new Error(`Pokemon TCG API request failed: ${url}`)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(`Pokemon TCG API request failed: ${url}`)
}

async function getAllSetsInternal(): Promise<PokemonSet[]> {
  const data = await pokemonFetch<{ data?: PokemonSet[] }>(
    "/sets?orderBy=-releaseDate",
    {
      revalidate: 21_600,
    },
  )

  const sets = Array.isArray(data?.data) ? data.data : []

  return [...sets].sort(
    (a, b) =>
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
  )
}

export const getAllSets = cache(getAllSetsInternal)

async function getSetByIdInternal(
  setId: string,
): Promise<PokemonSet | null> {
  const safeSetId = encodeURIComponent(setId)

  const data = await pokemonFetch<{ data?: PokemonSet }>(
    `/sets/${safeSetId}`,
    {
      revalidate: 21_600,
      allowNotFound: true,
    },
  )

  if (!data?.data) return null
  return data.data
}

export const getSetById = cache(getSetByIdInternal)

export async function getCardsBySet(
  setId: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(250, Math.max(1, Math.floor(pageSize)))

  const query = new URLSearchParams({
    q: `set.id:${setId}`,
    page: String(safePage),
    pageSize: String(safePageSize),
    orderBy: "number",
  })

  const data = await pokemonFetch<{
    data?: PokemonCard[]
    totalCount?: number
  }>(`/cards?${query.toString()}`, {
    revalidate: 21_600,
  })

  return {
    cards: Array.isArray(data?.data) ? data.data : [],
    totalCount:
      typeof data?.totalCount === "number" ? data.totalCount : 0,
  }
}

export async function getAllCardsBySet(
  setId: string,
): Promise<PokemonCard[]> {
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

async function getCardByIdInternal(
  cardId: string,
): Promise<PokemonCard | null> {
  const safeCardId = encodeURIComponent(cardId)

  const data = await pokemonFetch<{ data?: PokemonCard }>(
    `/cards/${safeCardId}`,
    {
      revalidate: 21_600,
      allowNotFound: true,
    },
  )

  if (!data?.data) return null
  return data.data
}

export const getCardById = cache(getCardByIdInternal)

export async function searchCards(
  query: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return {
      cards: [],
      totalCount: 0,
    }
  }

  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(250, Math.max(1, Math.floor(pageSize)))

  const params = new URLSearchParams({
    q: `name:"*${trimmedQuery}*"`,
    page: String(safePage),
    pageSize: String(safePageSize),
  })

  const data = await pokemonFetch<{
    data?: PokemonCard[]
    totalCount?: number
  }>(`/cards?${params.toString()}`, {
    revalidate: 300,
  })

  return {
    cards: Array.isArray(data?.data) ? data.data : [],
    totalCount:
      typeof data?.totalCount === "number" ? data.totalCount : 0,
  }
}

export function getMarketPrice(card: PokemonCard): number | null {
  return getPrimaryMarketPrice(card)
}