import "server-only"

import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
import type {
  PokemonCard,
  PokemonSet,
  PriceData,
} from "@/lib/types"

/* =========================================================
 * DATABASE ROW TYPES
 * ======================================================= */

type PokemonSetRow = {
  id: string
  name: string
  series: string | null
  printed_total: number | null
  total: number | null
  release_date: string | null
  logo_url: string | null
  symbol_url: string | null
  data: Record<string, unknown> | null
  synced_at: string | null
  created_at: string | null
  updated_at: string | null

  cards_synced: boolean
  cards_synced_count: number
  cards_synced_at: string | null
}

type PokemonCardRow = {
  id: string
  set_id: string
  name: string
  number: string | null
  rarity: string | null
  image_small: string | null
  image_large: string | null
  data: Record<string, unknown> | null
  synced_at: string | null
  created_at: string | null
  updated_at: string | null
}

type UnknownRecord = Record<string, unknown>

/* =========================================================
 * BASIC HELPERS
 * ======================================================= */

function asRecord(
  value: unknown,
): UnknownRecord {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as UnknownRecord
  }

  return {}
}

function asString(
  value: unknown,
  fallback = "",
) {
  return typeof value === "string"
    ? value
    : fallback
}

function asNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed =
      Number(value)

    if (
      Number.isFinite(parsed)
    ) {
      return parsed
    }
  }

  return null
}

function asStringArray(
  value: unknown,
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const values =
    value.filter(
      (item): item is string =>
        typeof item === "string",
    )

  return values.length
    ? values
    : undefined
}

function getUpdatedAt(
  row: {
    updated_at?: string | null
    synced_at?: string | null
  },
) {
  return (
    row.updated_at ??
    row.synced_at ??
    new Date(0).toISOString()
  )
}

/* =========================================================
 * SET CONVERSION
 * ======================================================= */

function rowToPokemonSet(
  row: PokemonSetRow,
): PokemonSet {
  return {
    id: row.id,
    name: row.name,
    series:
      row.series ?? "Other",

    printedTotal:
      row.printed_total ?? 0,

    total:
      row.total ??
      row.cards_synced_count ??
      0,

    releaseDate:
      row.release_date ?? "",

    updatedAt:
      getUpdatedAt(row),

    images: {
      symbol:
        row.symbol_url ?? "",
      logo:
        row.logo_url ?? "",
    },
  }
}

/* =========================================================
 * TCGDEX PRICE CONVERSION
 * ======================================================= */

function toPriceData(
  value: unknown,
): PriceData | undefined {
  const source =
    asRecord(value)

  const low =
    asNumber(
      source.lowPrice ??
        source.low,
    )

  const mid =
    asNumber(
      source.midPrice ??
        source.mid,
    )

  const high =
    asNumber(
      source.highPrice ??
        source.high,
    )

  const market =
    asNumber(
      source.marketPrice ??
        source.market,
    )

  const directLow =
    asNumber(
      source.directLowPrice ??
        source.directLow,
    )

  if (
    low === null &&
    mid === null &&
    high === null &&
    market === null &&
    directLow === null
  ) {
    return undefined
  }

  return {
    low,
    mid,
    high,
    market,
    directLow,
  }
}

function buildTcgplayer(
  data: UnknownRecord,
): PokemonCard["tcgplayer"] {
  /*
   * TCGdex stores pricing under:
   *
   * pricing.tcgplayer
   */
  const pricing =
    asRecord(data.pricing)

  const tcgplayer =
    asRecord(
      pricing.tcgplayer,
    )

  if (
    Object.keys(tcgplayer).length ===
    0
  ) {
    /*
     * If this row was created by the old provider and
     * already contains a PokemonTCG.io-compatible
     * tcgplayer object, preserve it.
     */
    const legacy =
      asRecord(
        data.tcgplayer,
      )

    if (
      Object.keys(legacy).length ===
      0
    ) {
      return undefined
    }

    return legacy as unknown as PokemonCard["tcgplayer"]
  }

  const normal =
    toPriceData(
      tcgplayer.normal,
    )

  const reverse =
    toPriceData(
      tcgplayer[
        "reverse-holofoil"
      ] ??
        tcgplayer[
          "reverseHolofoil"
        ],
    )

  const holo =
    toPriceData(
      tcgplayer.holofoil,
    )

  const firstEditionHolo =
    toPriceData(
      tcgplayer[
        "1st-edition-holofoil"
      ] ??
        tcgplayer[
          "1stEditionHolofoil"
        ],
    )

  const firstEditionNormal =
    toPriceData(
      tcgplayer[
        "1st-edition-normal"
      ] ??
        tcgplayer[
          "1stEditionNormal"
        ],
    )

  const prices: NonNullable<
    PokemonCard["tcgplayer"]
  >["prices"] = {}

  if (normal) {
    prices.normal = normal
  }

  if (reverse) {
    prices.reverseHolofoil =
      reverse
  }

  if (holo) {
    prices.holofoil = holo
  }

  if (firstEditionHolo) {
    prices[
      "1stEditionHolofoil"
    ] = firstEditionHolo
  }

  if (firstEditionNormal) {
    prices[
      "1stEditionNormal"
    ] = firstEditionNormal
  }

  const updated =
    asString(
      tcgplayer.updated,
      getFallbackUpdatedAt(),
    )

  /*
   * TCGdex gives us productId but not necessarily a
   * complete public product URL.
   *
   * Leave URL blank instead of inventing one.
   */
  return {
    url: "",
    updatedAt: updated,
    prices:
      Object.keys(prices).length
        ? prices
        : undefined,
  }
}

function getFallbackUpdatedAt() {
  return new Date(0).toISOString()
}

/* =========================================================
 * CARD METADATA CONVERSION
 * ======================================================= */

function convertAttacks(
  value: unknown,
): PokemonCard["attacks"] {
  if (!Array.isArray(value)) {
    return undefined
  }

  const attacks =
    value
      .map((attack) => {
        const source =
          asRecord(attack)

        const name =
          asString(source.name)

        if (!name) {
          return null
        }

        const cost =
          asStringArray(
            source.cost,
          ) ?? []

        return {
          name,

          cost,

          convertedEnergyCost:
            asNumber(
              source.convertedEnergyCost,
            ) ??
            cost.length,

          damage:
            asString(
              source.damage,
            ),

          text:
            asString(
              source.effect ??
                source.text,
            ),
        }
      })
      .filter(
        (
          attack,
        ): attack is NonNullable<
          typeof attack
        > => Boolean(attack),
      )

  return attacks.length
    ? attacks
    : undefined
}

function convertWeaknesses(
  value: unknown,
): PokemonCard["weaknesses"] {
  if (!Array.isArray(value)) {
    return undefined
  }

  const weaknesses =
    value
      .map((weakness) => {
        const source =
          asRecord(weakness)

        const type =
          asString(source.type)

        if (!type) {
          return null
        }

        return {
          type,

          value:
            asString(
              source.value,
            ),
        }
      })
      .filter(
        (
          weakness,
        ): weakness is {
          type: string
          value: string
        } =>
          Boolean(weakness),
      )

  return weaknesses.length
    ? weaknesses
    : undefined
}

function convertResistances(
  value: unknown,
): PokemonCard["resistances"] {
  if (!Array.isArray(value)) {
    return undefined
  }

  const resistances =
    value
      .map((resistance) => {
        const source =
          asRecord(resistance)

        const type =
          asString(source.type)

        if (!type) {
          return null
        }

        return {
          type,

          value:
            asString(
              source.value,
            ),
        }
      })
      .filter(
        (
          resistance,
        ): resistance is {
          type: string
          value: string
        } =>
          Boolean(resistance),
      )

  return resistances.length
    ? resistances
    : undefined
}

/* =========================================================
 * CARDMARKET
 * ======================================================= */

function buildCardmarket(
  data: UnknownRecord,
): PokemonCard["cardmarket"] {
  /*
   * Preserve old PokemonTCG.io-compatible data when
   * present.
   */
  const legacy =
    asRecord(
      data.cardmarket,
    )

  if (
    Object.keys(legacy).length >
    0 &&
    typeof legacy.url ===
      "string"
  ) {
    return legacy as unknown as PokemonCard["cardmarket"]
  }

  /*
   * TCGdex pricing may also contain Cardmarket data.
   * We only map it when the fields needed by the current
   * PokemonCard interface exist.
   */
  const pricing =
    asRecord(data.pricing)

  const source =
    asRecord(
      pricing.cardmarket,
    )

  if (
    Object.keys(source).length ===
    0
  ) {
    return undefined
  }

  const averageSellPrice =
    asNumber(
      source.averageSellPrice,
    )

  const lowPrice =
    asNumber(
      source.lowPrice,
    )

  const trendPrice =
    asNumber(
      source.trendPrice,
    )

  if (
    averageSellPrice === null ||
    lowPrice === null ||
    trendPrice === null
  ) {
    return undefined
  }

  return {
    url: "",

    updatedAt:
      asString(
        source.updated,
        getFallbackUpdatedAt(),
      ),

    prices: {
      averageSellPrice,
      lowPrice,
      trendPrice,
    },
  }
}

/* =========================================================
 * CARD CONVERSION
 * ======================================================= */

function rowToPokemonCard(
  row: PokemonCardRow,
  set: PokemonSet,
): PokemonCard {
  const data =
    asRecord(row.data)

  /*
   * Some rows may still contain old PokemonTCG.io data,
   * while newly synced rows contain TCGdex data.
   *
   * These fallbacks allow both to coexist.
   */

  const supertype =
    asString(
      data.supertype,
      asString(
        data.category,
        "Pokémon",
      ),
    )

  const subtypes =
    asStringArray(
      data.subtypes,
    ) ??
    (
      asString(data.stage)
        ? [
            asString(
              data.stage,
            ),
          ]
        : undefined
    )

  const hpValue =
    data.hp

  const hp =
    typeof hpValue ===
      "number"
      ? String(hpValue)
      : typeof hpValue ===
          "string"
        ? hpValue
        : undefined

  const artist =
    asString(
      data.artist,
      asString(
        data.illustrator,
      ),
    ) || undefined

  const description =
    asString(
      data.flavorText,
      asString(
        data.description,
      ),
    ) || undefined

  const retreatCost =
    asStringArray(
      data.retreatCost,
    )

  const convertedRetreatCost =
    asNumber(
      data.convertedRetreatCost,
    ) ??
    (
      retreatCost
        ? retreatCost.length
        : undefined
    )

  const legacySet =
    asRecord(data.set)

  return {
    id: row.id,

    name:
      row.name,

    supertype,

    subtypes,

    hp,

    types:
      asStringArray(
        data.types,
      ),

    evolvesFrom:
      asString(
        data.evolvesFrom,
      ) || undefined,

    evolvesTo:
      asStringArray(
        data.evolvesTo,
      ),

    rules:
      asStringArray(
        data.rules,
      ),

    attacks:
      convertAttacks(
        data.attacks,
      ),

    weaknesses:
      convertWeaknesses(
        data.weaknesses,
      ),

    resistances:
      convertResistances(
        data.resistances,
      ),

    retreatCost,

    convertedRetreatCost:
      typeof convertedRetreatCost ===
        "number"
        ? convertedRetreatCost
        : undefined,

    set: {
      id:
        set.id,

      name:
        set.name,

      series:
        set.series,

      printedTotal:
        set.printedTotal,

      total:
        set.total,

      releaseDate:
        set.releaseDate,

      updatedAt:
        asString(
          legacySet.updatedAt,
          set.updatedAt,
        ),

      images: {
        symbol:
          set.images.symbol,

        logo:
          set.images.logo,
      },
    },

    number:
      row.number ??
      asString(
        data.number,
      ),

    artist,

    rarity:
  row.rarity ??
  (asString(
    data.rarity,
  ) || undefined),

    flavorText:
      description,

    nationalPokedexNumbers:
      Array.isArray(
        data.nationalPokedexNumbers,
      )
        ? data.nationalPokedexNumbers.filter(
            (
              value,
            ): value is number =>
              typeof value ===
                "number",
          )
        : Array.isArray(
              data.dexId,
            )
          ? data.dexId.filter(
              (
                value,
              ): value is number =>
                typeof value ===
                  "number",
            )
          : undefined,

    legalities:
      asRecord(
        data.legalities,
      ) as PokemonCard["legalities"],

    images: {
      small:
        row.image_small ??
        asString(
          asRecord(
            data.images,
          ).small,
        ),

      large:
        row.image_large ??
        asString(
          asRecord(
            data.images,
          ).large,
        ),
    },

    tcgplayer:
      buildTcgplayer(data),

    cardmarket:
      buildCardmarket(data),
  }
}

/* =========================================================
 * CARD NUMBER SORTING
 * ======================================================= */

function compareCardNumbers(
  a: PokemonCard,
  b: PokemonCard,
) {
  const aNumber =
    a.number?.trim() ?? ""

  const bNumber =
    b.number?.trim() ?? ""

  const aNumeric =
    Number.parseInt(
      aNumber,
      10,
    )

  const bNumeric =
    Number.parseInt(
      bNumber,
      10,
    )

  const aHasNumber =
    Number.isFinite(
      aNumeric,
    )

  const bHasNumber =
    Number.isFinite(
      bNumeric,
    )

  if (
    aHasNumber &&
    bHasNumber &&
    aNumeric !== bNumeric
  ) {
    return (
      aNumeric -
      bNumeric
    )
  }

  return aNumber.localeCompare(
    bNumber,
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    },
  )
}

/* =========================================================
 * PUBLIC SERVER FUNCTIONS
 * ======================================================= */

async function getAllCatalogSetsInternal():
Promise<PokemonSet[]> {
  const supabase =
    createAdminClient()

  const {
    data,
    error,
  } =
    await supabase
      .from("pokemon_sets")
      .select(`
        id,
        name,
        series,
        printed_total,
        total,
        release_date,
        logo_url,
        symbol_url,
        data,
        synced_at,
        created_at,
        updated_at,
        cards_synced,
        cards_synced_count,
        cards_synced_at
      `)
      .order(
        "release_date",
        {
          ascending: false,
        },
      )

  if (error) {
    console.error(
      "Unable to load Pokemon sets from Supabase:",
      error,
    )

    return []
  }

  return (
    (data ?? []) as PokemonSetRow[]
  ).map(rowToPokemonSet)
}

export const getAllCatalogSets =
  cache(
    getAllCatalogSetsInternal,
  )

async function getCatalogSetByIdInternal(
  setId: string,
): Promise<PokemonSet | null> {
  const normalizedSetId =
    setId.trim()

  if (
    !normalizedSetId ||
    normalizedSetId ===
      "undefined" ||
    normalizedSetId ===
      "null"
  ) {
    return null
  }

  const supabase =
    createAdminClient()

  const {
    data,
    error,
  } =
    await supabase
      .from("pokemon_sets")
      .select(`
        id,
        name,
        series,
        printed_total,
        total,
        release_date,
        logo_url,
        symbol_url,
        data,
        synced_at,
        created_at,
        updated_at,
        cards_synced,
        cards_synced_count,
        cards_synced_at
      `)
      .eq(
        "id",
        normalizedSetId,
      )
      .maybeSingle()

  if (error) {
    console.error(
      `Unable to load Pokemon set ${normalizedSetId} from Supabase:`,
      error,
    )

    return null
  }

  if (!data) {
    return null
  }

  return rowToPokemonSet(
    data as PokemonSetRow,
  )
}

export const getCatalogSetById =
  cache(
    getCatalogSetByIdInternal,
  )

async function getCatalogCardsBySetInternal(
  setId: string,
): Promise<PokemonCard[]> {
  const normalizedSetId =
    setId.trim()

  if (
    !normalizedSetId ||
    normalizedSetId ===
      "undefined" ||
    normalizedSetId ===
      "null"
  ) {
    return []
  }

  /*
   * Load the set first.
   *
   * This also gives every PokemonCard its existing
   * PokemonSet-compatible nested set object.
   */
  const set =
    await getCatalogSetById(
      normalizedSetId,
    )

  if (!set) {
    return []
  }

  const supabase =
    createAdminClient()

  /*
   * Only serve cards for a catalog set after the importer
   * has verified the complete set.
   *
   * This prevents users from seeing a partially imported
   * set if a future sync fails midway.
   */
  const {
    data: syncState,
    error: syncStateError,
  } =
    await supabase
      .from("pokemon_sets")
      .select(
        "cards_synced",
      )
      .eq(
        "id",
        normalizedSetId,
      )
      .maybeSingle()

  if (syncStateError) {
    console.error(
      `Unable to read sync state for ${normalizedSetId}:`,
      syncStateError,
    )

    return []
  }

  if (
    !syncState?.cards_synced
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("pokemon_cards")
      .select(`
        id,
        set_id,
        name,
        number,
        rarity,
        image_small,
        image_large,
        data,
        synced_at,
        created_at,
        updated_at
      `)
      .eq(
        "set_id",
        normalizedSetId,
      )

  if (error) {
    console.error(
      `Unable to load cards for ${normalizedSetId} from Supabase:`,
      error,
    )

    return []
  }

  const cards =
    (
      (data ?? []) as PokemonCardRow[]
    ).map(
      (row) =>
        rowToPokemonCard(
          row,
          set,
        ),
    )

  cards.sort(
    compareCardNumbers,
  )

  return cards
}

export const getCatalogCardsBySet =
  cache(
    getCatalogCardsBySetInternal,
  )