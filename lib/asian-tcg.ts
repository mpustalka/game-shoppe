import type { PokemonCard } from "@/lib/types"

const API_BASE = "https://api.tcgdex.net/v2"

export type AsianTcgLanguage = "ja" | "zh-tw" | "zh-cn"

export interface AsianTcgSet {
  id: string
  name: string
  series: string
  printedTotal: number
  total: number
  releaseDate: string
  images: { symbol: string; logo: string }
  language: AsianTcgLanguage
}

type TCGdexSetBrief = {
  id: string
  name: string
  logo?: string | null
  symbol?: string | null
  cardCount?: { total?: number; official?: number }
}

type TCGdexSet = TCGdexSetBrief & {
  releaseDate?: string
  serie?: { id?: string; name?: string }
  cards?: TCGdexCardBrief[]
}

type TCGdexCardBrief = {
  id: string
  localId: string
  name: string
  image?: string | null
  category?: string
}

type TCGdexCard = TCGdexCardBrief & {
  category?: string
  rarity?: string
  illustrator?: string
  set?: TCGdexSetBrief
  variants?: Record<string, boolean>
}

/**
 * TCGdex uses TWO different asset URL formats:
 *
 * Cards:
 *   .../136/high.webp
 *   .../136/low.webp
 *
 * Set logos / symbols:
 *   .../logo.webp
 *   .../symbol.webp
 *
 * Do not use the card quality suffix for logos or symbols.
 */
function cardAsset(
  url?: string | null,
  quality: "high" | "low" = "high",
) {
  if (!url) return ""
  if (/\.(png|webp|jpg|jpeg)$/i.test(url)) return url
  return `${url}/${quality}.webp`
}

function setAsset(url?: string | null) {
  if (!url) return ""
  if (/\.(png|webp|jpg|jpeg)$/i.test(url)) return url
  return `${url}.webp`
}

async function tcgdex<T>(
  language: AsianTcgLanguage,
  path: string,
): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}/${language}/${path}`, {
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) return null
    return (await response.json()) as T
  } catch (error) {
    console.warn(`[TCGdex:${language}] ${path} failed`, error)
    return null
  }
}

async function hydrateSet(
  language: AsianTcgLanguage,
  brief: TCGdexSetBrief,
): Promise<AsianTcgSet> {
  const full = await tcgdex<TCGdexSet>(
    language,
    `sets/${encodeURIComponent(brief.id)}`,
  )

  const source = full ?? brief

  return {
    id: source.id,
    name: source.name,
    series:
      full?.serie?.name ||
      (language === "ja"
        ? "Japanese Pokémon TCG"
        : "Chinese Pokémon TCG"),
    printedTotal: source.cardCount?.official ?? 0,
    total:
      source.cardCount?.total ??
      source.cardCount?.official ??
      0,
    releaseDate: full?.releaseDate ?? "1900-01-01",
    images: {
      symbol: setAsset(source.symbol),
      logo: setAsset(source.logo),
    },
    language,
  }
}

export async function getSetsByLanguage(
  language: AsianTcgLanguage,
): Promise<AsianTcgSet[]> {
  const briefs =
    (await tcgdex<TCGdexSetBrief[]>(language, "sets")) ?? []

  const hydrated: AsianTcgSet[] = []

  // Hydrate in modest chunks so we get release date + series
  // without hammering TCGdex.
  for (let i = 0; i < briefs.length; i += 12) {
    hydrated.push(
      ...(await Promise.all(
        briefs
          .slice(i, i + 12)
          .map((set) => hydrateSet(language, set)),
      )),
    )
  }

  return hydrated.sort(
    (a, b) =>
      b.releaseDate.localeCompare(a.releaseDate) ||
      a.name.localeCompare(b.name),
  )
}

export async function getSetByLanguage(
  language: AsianTcgLanguage,
  setId: string,
) {
  const set = await tcgdex<TCGdexSet>(
    language,
    `sets/${encodeURIComponent(setId)}`,
  )

  if (!set) return null
  return hydrateSet(language, set)
}

export async function getCardsByLanguageSet(
  language: AsianTcgLanguage,
  setId: string,
): Promise<PokemonCard[]> {
  const set = await tcgdex<TCGdexSet>(
    language,
    `sets/${encodeURIComponent(setId)}`,
  )

  if (!set?.cards?.length) return []

  const normalizedSet = await hydrateSet(language, set)
  const cards: PokemonCard[] = []

  for (let i = 0; i < set.cards.length; i += 16) {
    const details = await Promise.all(
      set.cards.slice(i, i + 16).map(async (brief) => {
        return (
          (await tcgdex<TCGdexCard>(
            language,
            `sets/${encodeURIComponent(
              setId,
            )}/${encodeURIComponent(brief.localId)}`,
          )) ?? brief
        )
      }),
    )

    for (const card of details) {
      cards.push({
        id: `${language}-${card.id}`,
        name: card.name,
        supertype:
          card.category === "Trainer"
            ? "Trainer"
            : card.category === "Energy"
              ? "Energy"
              : "Pokémon",
        set: {
          id: `${language}-${normalizedSet.id}`,
          name: normalizedSet.name,
          series: normalizedSet.series,
          printedTotal: normalizedSet.printedTotal,
          total: normalizedSet.total,
          releaseDate: normalizedSet.releaseDate,
          images: normalizedSet.images,
        },
        number: card.localId,
        rarity: "rarity" in card ? card.rarity : undefined,
        artist:
          "illustrator" in card ? card.illustrator : undefined,
        images: {
          small:
            cardAsset(card.image, "low") ||
            "/placeholder-card.png",
          large:
            cardAsset(card.image, "high") ||
            "/placeholder-card.png",
        },
      } as PokemonCard)
    }
  }

  return cards
}

export const getAllJapaneseSets = () =>
  getSetsByLanguage("ja")

export const getJapaneseSetById = (setId: string) =>
  getSetByLanguage("ja", setId)

export const getJapaneseCardsBySet = (setId: string) =>
  getCardsByLanguageSet("ja", setId)

export async function getAllChineseSets() {
  const [traditional, simplified] = await Promise.all([
    getSetsByLanguage("zh-tw"),
    getSetsByLanguage("zh-cn"),
  ])

  const seen = new Set<string>()

  return [...traditional, ...simplified].filter((set) => {
    const key = `${set.language}:${set.id}`

    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}