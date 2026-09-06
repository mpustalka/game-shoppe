import type { PokemonSet, PokemonCard } from "./types"

const BASE_URL = "https://tcgtracking.com/tcgapi/v1"
const JAPANESE_CATEGORY = 85
const TCGDEX_BASE_URL = "https://api.tcgdex.net/v2/ja"

type TrackingSet = {
  id?: number | string
  name?: string
  abbreviation?: string | null
  published_on?: string
  modified_on?: string
  product_count?: number
  set_symbol_url?: string | null
}

type TCGdexSetBrief = {
  id: string
  name: string
  logo?: string | null
  symbol?: string | null
}

type TCGdexSetDetail = TCGdexSetBrief & {
  releaseDate?: string
  serie?: {
    id?: string
    name?: string
  }
}

type JapaneseLogoMatch = {
  logo: string
  symbol: string
}

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/pokémon/g, "pokemon")
    .replace(/pokemon card game/g, "")
    .replace(/pokemon card/g, "")
    .replace(/pokemon/g, "")
    .replace(/mega expansion/g, "")
    .replace(/expansion/g, "")
    .replace(/special set/g, "")
    .replace(/enhanced expansion pack/g, "")
    .replace(/high class pack/g, "")
    .replace(/strength expansion pack/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim()
}

function tcgdexSetAsset(url?: string | null) {
  if (!url) return ""
  if (/\.(png|webp|jpg|jpeg)$/i.test(url)) return url
  return `${url}.webp`
}

async function getTrackingSetList(): Promise<TrackingSet[]> {
  const response = await fetch(`${BASE_URL}/${JAPANESE_CATEGORY}/sets`, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    const err = await response.text()
    console.error("Japanese API error:", err)
    throw new Error("Failed to fetch Japanese sets")
  }

  const data = await response.json()
  return (data.sets || []) as TrackingSet[]
}

async function getTCGdexJapaneseSets(): Promise<TCGdexSetBrief[]> {
  try {
    const response = await fetch(`${TCGDEX_BASE_URL}/sets`, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`TCGdex Japanese logo lookup failed: ${response.status}`)
      return []
    }

    return (await response.json()) as TCGdexSetBrief[]
  } catch (error) {
    console.warn("TCGdex Japanese logo lookup unavailable:", error)
    return []
  }
}

function findTCGdexSet(
  trackingSet: TrackingSet,
  tcgdexSets: TCGdexSetBrief[],
): TCGdexSetBrief | undefined {
  const abbreviation = normalize(trackingSet.abbreviation)
  const trackingName = normalize(trackingSet.name)

  if (abbreviation) {
    const byId = tcgdexSets.find(
      (set) => normalize(set.id) === abbreviation,
    )
    if (byId) return byId
  }

  if (trackingName) {
    const byName = tcgdexSets.find(
      (set) => normalize(set.name) === trackingName,
    )
    if (byName) return byName
  }

  if (trackingName.length >= 5) {
    const fuzzy = tcgdexSets.find((set) => {
      const dexName = normalize(set.name)
      return (
        dexName.length >= 5 &&
        (dexName.includes(trackingName) ||
          trackingName.includes(dexName))
      )
    })

    if (fuzzy) return fuzzy
  }

  return undefined
}

async function getTCGdexJapaneseSetDetail(
  setId: string,
): Promise<TCGdexSetDetail | null> {
  try {
    const response = await fetch(
      `${TCGDEX_BASE_URL}/sets/${encodeURIComponent(setId)}`,
      {
        next: { revalidate: 60 * 60 * 24 },
        signal: AbortSignal.timeout(5000),
      },
    )

    if (!response.ok) return null
    return (await response.json()) as TCGdexSetDetail
  } catch {
    return null
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= items.length) return

      results[currentIndex] = await worker(
        items[currentIndex],
        currentIndex,
      )
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => runWorker(),
    ),
  )

  return results
}

async function buildJapaneseImageMap(
  trackingSets: TrackingSet[],
  tcgdexSets: TCGdexSetBrief[],
): Promise<Map<string, JapaneseLogoMatch>> {
  const matches = trackingSets
    .map((trackingSet) => {
      const tcgdexSet = findTCGdexSet(trackingSet, tcgdexSets)
      if (!tcgdexSet) return null

      return {
        trackingId: String(trackingSet.id ?? ""),
        trackingSet,
        tcgdexSet,
      }
    })
    .filter(
      (
        value,
      ): value is {
        trackingId: string
        trackingSet: TrackingSet
        tcgdexSet: TCGdexSetBrief
      } => Boolean(value),
    )

  const resolved = await mapWithConcurrency(
    matches,
    8,
    async (match) => {
      let detail: TCGdexSetDetail | null = null

      if (!match.tcgdexSet.logo) {
        detail = await getTCGdexJapaneseSetDetail(
          match.tcgdexSet.id,
        )
      }

      return {
        trackingId: match.trackingId,
        images: {
          symbol:
            match.trackingSet.set_symbol_url ||
            tcgdexSetAsset(
              detail?.symbol || match.tcgdexSet.symbol,
            ) ||
            "",
          logo:
            tcgdexSetAsset(
              detail?.logo || match.tcgdexSet.logo,
            ) || "",
        } satisfies JapaneseLogoMatch,
      }
    },
  )

  return new Map(
    resolved.map((entry) => [
      entry.trackingId,
      entry.images,
    ]),
  )
}

function trackingFallbackImages(
  set: TrackingSet,
): JapaneseLogoMatch {
  return {
    logo: "",
    symbol: set.set_symbol_url || "",
  }
}

export async function getAllJapaneseSets(): Promise<PokemonSet[]> {
  const [sets, tcgdexSets] = await Promise.all([
    getTrackingSetList(),
    getTCGdexJapaneseSets(),
  ])

  const imageMap =
    tcgdexSets.length > 0
      ? await buildJapaneseImageMap(sets, tcgdexSets)
      : new Map<string, JapaneseLogoMatch>()

  const sorted = [...sets].sort((a, b) => {
    return (
      new Date(b.published_on || 0).getTime() -
      new Date(a.published_on || 0).getTime()
    )
  })

  return sorted.map((set): PokemonSet => {
    const setId = String(set.id ?? "")
    const images =
      imageMap.get(setId) || trackingFallbackImages(set)

    return {
      id: setId,
      name: set.name || "",
      series: "Pokemon Japan",
      printedTotal: set.product_count || 0,
      total: set.product_count || 0,
      releaseDate: set.published_on || "",
      updatedAt: set.modified_on || "",
      images,
    }
  })
}

export async function getJapaneseSetById(
  setId: string,
): Promise<PokemonSet | null> {
  const url = `${BASE_URL}/${JAPANESE_CATEGORY}/sets/${setId}`

  const [response, trackingSets, tcgdexSets] =
    await Promise.all([
      fetch(url, {
        next: { revalidate: 3600 },
      }),
      getTrackingSetList().catch(() => []),
      getTCGdexJapaneseSets(),
    ])

  if (!response.ok) return null

  const data = await response.json()

  const listSet = trackingSets.find(
    (set) => String(set.id ?? "") === String(setId),
  )

  const trackingSet: TrackingSet = {
    id: data.set_id ?? setId,
    name: data.set_name || listSet?.name || "",
    abbreviation:
      data.abbreviation ||
      data.set_abbreviation ||
      listSet?.abbreviation ||
      "",
    published_on:
      data.set_released ||
      listSet?.published_on ||
      "",
    modified_on:
      data.data_modified ||
      listSet?.modified_on ||
      "",
    product_count:
      data.product_count ??
      listSet?.product_count ??
      0,
    set_symbol_url:
      data.set_symbol_url ||
      listSet?.set_symbol_url ||
      "",
  }

  let images = trackingFallbackImages(trackingSet)

  const tcgdexMatch = findTCGdexSet(
    trackingSet,
    tcgdexSets,
  )

  if (tcgdexMatch) {
    const detail = await getTCGdexJapaneseSetDetail(
      tcgdexMatch.id,
    )

    images = {
      symbol:
        trackingSet.set_symbol_url ||
        tcgdexSetAsset(
          detail?.symbol || tcgdexMatch.symbol,
        ) ||
        "",
      logo:
        tcgdexSetAsset(
          detail?.logo || tcgdexMatch.logo,
        ) || "",
    }
  }

  return {
    id: String(data.set_id ?? setId),
    name: data.set_name || listSet?.name || "",
    series: "Pokemon Japan",
    printedTotal:
      data.product_count ||
      listSet?.product_count ||
      0,
    total:
      data.product_count ||
      listSet?.product_count ||
      0,
    releaseDate:
      data.set_released ||
      listSet?.published_on ||
      "",
    updatedAt:
      data.data_modified ||
      listSet?.modified_on ||
      "",
    images,
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
    .filter(
      (card: any) =>
        card.number != null &&
        card.number !== "",
    )
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
          printedTotal:
            data.product_count ||
            data.products?.length ||
            0,
          total:
            data.product_count ||
            data.products?.length ||
            0,
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