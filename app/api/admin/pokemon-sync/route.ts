import { NextRequest, NextResponse } from "next/server"
import TCGdex from "@tcgdex/sdk"

import {
  createAdminClient,
  hasAdminConfig,
} from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const DEFAULT_BULK_SET_LIMIT = 3
const MAX_BULK_SET_LIMIT = 10

/*
 * Failed/unmatched sets are temporarily skipped so they
 * cannot block the rest of the bulk catalog import.
 */
const FAILURE_COOLDOWN_HOURS = 6

type CatalogSetRow = {
  id: string
  name: string
  series: string | null
  printed_total: number | null
  total: number | null
  release_date: string | null
  logo_url: string | null
  symbol_url: string | null
  data: Record<string, unknown> | null

  cards_synced: boolean
  cards_synced_count: number
  cards_synced_at: string | null

  cards_sync_next_page: number
  cards_sync_retry_after: string | null
  cards_sync_last_error: string | null
}

type ExistingCardRow = {
  id: string
  set_id: string
  number: string | null
}

type TcgdexSetSummary = {
  id?: string
  name?: string
}

type TcgdexCardResume = {
  id?: string
  localId?: string
  name?: string
  getCard?: () => Promise<unknown>
}

type PlainRecord = Record<string, unknown>

/* =========================================================
 * AUTH
 * ======================================================= */

function isAuthorized(request: NextRequest) {
  const configuredSecret =
    process.env.POKEMON_SYNC_SECRET

  if (!configuredSecret) {
    return false
  }

  return (
    request.headers.get("x-pokemon-sync-secret") ===
    configuredSecret
  )
}

/* =========================================================
 * GENERAL HELPERS
 * ======================================================= */

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown sync error"
}

function normalizeSetId(value: string) {
  return value
    .trim()
    .replace(/^["']+|["']+$/g, "")
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function normalizeCardNumber(value: unknown) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return ""
  }

  const raw = String(value).trim()

  if (!raw) {
    return ""
  }

  /*
   * Numeric card numbers compare independently of
   * zero-padding:
   *
   * 001 -> 1
   * 010 -> 10
   *
   * Alphanumeric numbers remain intact.
   */
  if (/^\d+$/.test(raw)) {
    return String(
      Number.parseInt(raw, 10),
    )
  }

  return raw.toLowerCase()
}

function buildCardVaultCardId(
  setId: string,
  localId: string,
) {
  const normalizedNumber =
    normalizeCardNumber(localId)

  return `${setId}-${normalizedNumber || localId}`
}

function getRetryAfterDate() {
  return new Date(
    Date.now() +
      FAILURE_COOLDOWN_HOURS *
        60 *
        60 *
        1000,
  ).toISOString()
}

/* =========================================================
 * SAFE SDK -> JSON CONVERSION
 * ======================================================= */

function toPlainValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return value ?? null
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value
  }

  if (typeof value === "bigint") {
    return value.toString()
  }

  if (
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return undefined
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        toPlainValue(item, seen),
      )
      .filter(
        (item) =>
          item !== undefined,
      )
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return undefined
    }

    seen.add(value)

    const source =
      value as Record<
        string,
        unknown
      >

    const output:
      Record<string, unknown> = {}

    for (
      const [key, item] of
        Object.entries(source)
    ) {
      /*
       * These SDK references create circular JSON
       * structures and must not be stored.
       */
      if (
        key === "tcgdex" ||
        key === "_tcgdex" ||
        key === "sdk"
      ) {
        continue
      }

      const plain =
        toPlainValue(
          item,
          seen,
        )

      if (plain !== undefined) {
        output[key] = plain
      }
    }

    seen.delete(value)

    return output
  }

  return undefined
}

function toPlainRecord(
  value: unknown,
): PlainRecord {
  const plain =
    toPlainValue(value)

  if (
    plain &&
    typeof plain === "object" &&
    !Array.isArray(plain)
  ) {
    return plain as PlainRecord
  }

  return {}
}

/* =========================================================
 * TCGDEX
 * ======================================================= */

function createTcgdex() {
  const tcgdex =
    new TCGdex("en")

  /*
   * Cache SDK responses for one hour.
   */
  tcgdex.setCacheTTL(3600)

  return tcgdex
}

/*
 * Old PokemonTCG.io IDs commonly omit the zero-padding
 * used by TCGdex.
 *
 * Examples:
 *
 * me4  -> me04
 * sv6  -> sv06
 * sv10 -> sv10
 *
 * This is only a candidate. We also verify using the set
 * name whenever possible.
 */
function getTcgdexIdCandidates(
  cardVaultId: string,
) {
  const id =
    normalizeSetId(
      cardVaultId,
    )

  const candidates =
    new Set<string>()

  candidates.add(id)

  const match =
    id.match(
      /^([a-z]+)(\d+)(.*)$/i,
    )

  if (match) {
    const [
      ,
      prefix,
      numericPart,
      suffix,
    ] = match

    const padded =
      numericPart.padStart(
        2,
        "0",
      )

    candidates.add(
      `${prefix}${padded}${suffix}`,
    )
  }

  return [...candidates]
}

async function getTcgdexSetCatalog() {
  const tcgdex =
    createTcgdex()

  const sets =
    await tcgdex.set.list()

  return {
    tcgdex,

    sets:
      (
        Array.isArray(sets)
          ? sets
          : []
      ) as TcgdexSetSummary[],
  }
}

function findTcgdexSet(
  catalogSet: CatalogSetRow,
  tcgdexSets: TcgdexSetSummary[],
) {
  const candidates =
    getTcgdexIdCandidates(
      catalogSet.id,
    ).map((id) =>
      id.toLowerCase(),
    )

  const targetName =
    normalizeName(
      catalogSet.name,
    )

  /*
   * Best match:
   *
   * ID candidate + exact normalized name.
   */
  const exact =
    tcgdexSets.find(
      (set) => {
        const id =
          typeof set.id ===
          "string"
            ? set.id.toLowerCase()
            : ""

        const name =
          typeof set.name ===
          "string"
            ? normalizeName(
                set.name,
              )
            : ""

        return (
          candidates.includes(
            id,
          ) &&
          name === targetName
        )
      },
    )

  if (exact) {
    return {
      match: exact,
      method: "id+name",
    }
  }

  /*
   * Next preference:
   *
   * Unique exact normalized-name match.
   *
   * This catches special sets such as:
   *
   * me2pt5   -> me02.5
   * sv8pt5   -> sv08.5
   * rsv10pt5 -> sv10.5w
   * zsv10pt5 -> sv10.5b
   */
  const nameMatches =
    tcgdexSets.filter(
      (set) => {
        return (
          typeof set.name ===
            "string" &&
          normalizeName(
            set.name,
          ) === targetName
        )
      },
    )

  if (
    nameMatches.length === 1
  ) {
    return {
      match:
        nameMatches[0],
      method: "name",
    }
  }

  /*
   * Final safe automatic option:
   *
   * Unique matching ID.
   *
   * Example:
   *
   * sve = Scarlet & Violet Energies
   * TCGdex calls it Scarlet & Violet Energy.
   */
  const idMatches =
    tcgdexSets.filter(
      (set) => {
        const id =
          typeof set.id ===
          "string"
            ? set.id.toLowerCase()
            : ""

        return candidates.includes(
          id,
        )
      },
    )

  if (
    idMatches.length === 1
  ) {
    return {
      match:
        idMatches[0],
      method: "id",
    }
  }

  return {
    match: null,
    method: null,
  }
}

/* =========================================================
 * CATALOG DATABASE
 * ======================================================= */

const CATALOG_COLUMNS = `
  id,
  name,
  series,
  printed_total,
  total,
  release_date,
  logo_url,
  symbol_url,
  data,
  cards_synced,
  cards_synced_count,
  cards_synced_at,
  cards_sync_next_page,
  cards_sync_retry_after,
  cards_sync_last_error
`

async function getCatalogSets():
Promise<CatalogSetRow[]> {
  const supabase =
    createAdminClient()

  const {
    data,
    error,
  } =
    await supabase
      .from("pokemon_sets")
      .select(
        CATALOG_COLUMNS,
      )
      .order(
        "release_date",
        {
          ascending: false,
        },
      )

  if (error) {
    throw new Error(
      `Unable to load Pokemon catalog: ${error.message}`,
    )
  }

  return (
    (data ?? []) as CatalogSetRow[]
  )
}

async function getCatalogSet(
  setId: string,
): Promise<
  CatalogSetRow | null
> {
  const supabase =
    createAdminClient()

  const {
    data,
    error,
  } =
    await supabase
      .from("pokemon_sets")
      .select(
        CATALOG_COLUMNS,
      )
      .eq("id", setId)
      .maybeSingle()

  if (error) {
    throw new Error(
      `Unable to load Pokemon set ${setId}: ${error.message}`,
    )
  }

  return (
    data as
      | CatalogSetRow
      | null
  )
}

/*
 * Select unsynced sets without allowing a failed set to
 * monopolize every bulk request.
 *
 * Priority:
 *
 * 1. Unsynced sets with no retry delay.
 * 2. Failed sets whose retry delay has expired.
 */
async function getUnsyncedSets(
  limit: number,
): Promise<CatalogSetRow[]> {
  const supabase =
    createAdminClient()

  const now =
    new Date().toISOString()

  const {
    data: ready,
    error: readyError,
  } =
    await supabase
      .from("pokemon_sets")
      .select(
        CATALOG_COLUMNS,
      )
      .eq(
        "cards_synced",
        false,
      )
      .is(
        "cards_sync_retry_after",
        null,
      )
      .order(
        "release_date",
        {
          ascending: false,
        },
      )
      .limit(limit)

  if (readyError) {
    throw new Error(
      `Unable to load unsynced Pokemon sets: ${readyError.message}`,
    )
  }

  const results =
    [
      ...(
        (ready ?? []) as CatalogSetRow[]
      ),
    ]

  /*
   * If there are fewer fresh sets than requested, fill the
   * remaining slots with failures whose cooldown expired.
   */
  if (
    results.length < limit
  ) {
    const remainingSlots =
      limit -
      results.length

    const {
      data: retryable,
      error: retryError,
    } =
      await supabase
        .from("pokemon_sets")
        .select(
          CATALOG_COLUMNS,
        )
        .eq(
          "cards_synced",
          false,
        )
        .not(
          "cards_sync_retry_after",
          "is",
          null,
        )
        .lte(
          "cards_sync_retry_after",
          now,
        )
        .order(
          "cards_sync_retry_after",
          {
            ascending: true,
          },
        )
        .limit(
          remainingSlots,
        )

    if (retryError) {
      throw new Error(
        `Unable to load retryable Pokemon sets: ${retryError.message}`,
      )
    }

    results.push(
      ...(
        (retryable ?? []) as CatalogSetRow[]
      ),
    )
  }

  return results
}

/* =========================================================
 * EXISTING CARD ID PRESERVATION
 * ======================================================= */

async function getExistingCardsForSet(
  setId: string,
) {
  const supabase =
    createAdminClient()

  const {
    data,
    error,
  } =
    await supabase
      .from("pokemon_cards")
      .select(
        "id,set_id,number",
      )
      .eq(
        "set_id",
        setId,
      )

  if (error) {
    throw new Error(
      `Unable to load existing cards for ${setId}: ${error.message}`,
    )
  }

  return (
    (data ?? []) as ExistingCardRow[]
  )
}

function createExistingCardNumberMap(
  cards: ExistingCardRow[],
) {
  const map =
    new Map<
      string,
      string
    >()

  for (const card of cards) {
    const number =
      normalizeCardNumber(
        card.number,
      )

    if (!number) {
      continue
    }

    /*
     * Preserve the first existing ID if duplicate numbers
     * somehow exist.
     */
    if (
      !map.has(number)
    ) {
      map.set(
        number,
        card.id,
      )
    }
  }

  return map
}

async function getStoredCardCount(
  setId: string,
) {
  const supabase =
    createAdminClient()

  const {
    count,
    error,
  } =
    await supabase
      .from("pokemon_cards")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .eq(
        "set_id",
        setId,
      )

  if (error) {
    throw new Error(
      `Unable to count cards for ${setId}: ${error.message}`,
    )
  }

  return count ?? 0
}

/* =========================================================
 * IMAGE HELPERS
 * ======================================================= */

function getCardImage(
  card: unknown,
  quality:
    | "high"
    | "low",
  extension:
    | "png"
    | "webp",
) {
  const source =
    card as {
      getImageURL?: (
        quality:
          | "high"
          | "low",
        extension:
          | "png"
          | "webp",
      ) =>
        | string
        | undefined
        | null
    }

  if (
    typeof source.getImageURL !==
    "function"
  ) {
    return null
  }

  try {
    return (
      source.getImageURL(
        quality,
        extension,
      ) ?? null
    )
  } catch {
    return null
  }
}

/* =========================================================
 * UPSERT TCGDEX CARDS
 * ======================================================= */

async function upsertTcgdexCards(
  cardVaultSet: CatalogSetRow,
  tcgdexSetId: string,
  cardResumes: TcgdexCardResume[],
) {
  const supabase =
    createAdminClient()

  const existingCards =
    await getExistingCardsForSet(
      cardVaultSet.id,
    )

  const existingByNumber =
    createExistingCardNumberMap(
      existingCards,
    )

  const now =
    new Date().toISOString()

  let fetched = 0
  let saved = 0

  /*
   * Full TCGdex card JSON can contain substantial metadata
   * and pricing, so keep DB write batches moderate.
   */
  const writeBatchSize = 50

  let pendingRows:
    Record<
      string,
      unknown
    >[] = []

  const flush =
    async () => {
      if (
        !pendingRows.length
      ) {
        return
      }

      const { error } =
        await supabase
          .from(
            "pokemon_cards",
          )
          .upsert(
            pendingRows,
            {
              onConflict:
                "id",
            },
          )

      if (error) {
        throw new Error(
          `Unable to save TCGdex cards for ${cardVaultSet.id}: ${error.message}`,
        )
      }

      saved +=
        pendingRows.length

      pendingRows = []
    }

  /*
   * Intentionally sequential.
   *
   * This avoids firing 100+ simultaneous requests at
   * TCGdex for a single set.
   */
  for (
    const resume of
      cardResumes
  ) {
    if (
      typeof resume.id !==
        "string" ||
      !resume.id.trim() ||
      typeof resume.name !==
        "string" ||
      !resume.name.trim() ||
      typeof resume.getCard !==
        "function"
    ) {
      throw new Error(
        `TCGdex returned an invalid card resume for ${tcgdexSetId}`,
      )
    }

    const fullCard =
      await resume.getCard()

    if (!fullCard) {
      throw new Error(
        `TCGdex returned no full card for ${resume.id}`,
      )
    }

    const raw =
      fullCard as unknown as Record<
        string,
        unknown
      >

    const localId =
      typeof raw.localId ===
      "string"
        ? raw.localId
        : typeof resume.localId ===
            "string"
          ? resume.localId
          : ""

    if (!localId) {
      throw new Error(
        `TCGdex card ${resume.id} has no localId`,
      )
    }

    const normalizedNumber =
      normalizeCardNumber(
        localId,
      )

    /*
     * CRITICAL:
     *
     * If this card already exists in the Card Vault
     * catalog, preserve its current ID.
     *
     * This prevents us from changing identity underneath
     * inventory records.
     */
    const existingId =
      existingByNumber.get(
        normalizedNumber,
      )

    const cardVaultCardId =
      existingId ??
      buildCardVaultCardId(
        cardVaultSet.id,
        localId,
      )

    const name =
      typeof raw.name ===
      "string"
        ? raw.name
        : resume.name

    const rarity =
      typeof raw.rarity ===
      "string"
        ? raw.rarity
        : null

    const imageLarge =
      getCardImage(
        fullCard,
        "high",
        "png",
      )

    const imageSmall =
      getCardImage(
        fullCard,
        "low",
        "webp",
      )

    const plainCard =
      toPlainRecord(
        fullCard,
      )

    /*
     * Keep the TCGdex data—including pricing—while
     * providing compatibility fields expected by the
     * existing Card Vault code.
     *
     * The pricing object we verified includes:
     *
     * pricing.tcgplayer.normal.marketPrice
     * pricing.tcgplayer.reverse-holofoil.marketPrice
     * pricing.tcgplayer.*.productId
     */
    const storedData = {
      ...plainCard,

      /*
       * Card Vault identity.
       */
      id:
        cardVaultCardId,

      number:
        localId,

      images: {
        small:
          imageSmall,
        large:
          imageLarge,
      },

      /*
       * Preserve original TCGdex identity separately.
       */
      tcgdex: {
        id:
          resume.id,
        setId:
          tcgdexSetId,
        localId,
      },

      /*
       * Compatibility with existing code expecting
       * card.set.id and card.set.name.
       */
      set: {
        ...(
          plainCard.set &&
          typeof plainCard.set ===
            "object" &&
          !Array.isArray(
            plainCard.set,
          )
            ? plainCard.set as PlainRecord
            : {}
        ),

        id:
          cardVaultSet.id,

        tcgdexId:
          tcgdexSetId,

        name:
          cardVaultSet.name,
      },
    }

    pendingRows.push({
      id:
        cardVaultCardId,

      set_id:
        cardVaultSet.id,

      name,

      number:
        localId,

      rarity,

      image_small:
        imageSmall,

      image_large:
        imageLarge,

      data:
        storedData,

      synced_at:
        now,

      updated_at:
        now,
    })

    fetched += 1

    if (
      pendingRows.length >=
      writeBatchSize
    ) {
      await flush()
    }
  }

  await flush()

  return {
    fetched,
    saved,
  }
}

/* =========================================================
 * SYNC STATE
 * ======================================================= */

async function markSetSynced(
  setId: string,
  count: number,
) {
  const supabase =
    createAdminClient()

  const now =
    new Date().toISOString()

  const { error } =
    await supabase
      .from("pokemon_sets")
      .update({
        cards_synced:
          true,

        cards_synced_count:
          count,

        cards_synced_at:
          now,

        /*
         * Old pagination state is no longer needed by
         * TCGdex, but reset it for consistency.
         */
        cards_sync_next_page:
          1,

        cards_sync_retry_after:
          null,

        cards_sync_last_error:
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        setId,
      )

  if (error) {
    throw new Error(
      `Unable to mark ${setId} as synced: ${error.message}`,
    )
  }
}

async function markSetFailure(
  setId: string,
  message: string,
) {
  const supabase =
    createAdminClient()

  const count =
    await getStoredCardCount(
      setId,
    )

  const retryAfter =
    getRetryAfterDate()

  const { error } =
    await supabase
      .from("pokemon_sets")
      .update({
        cards_synced:
          false,

        cards_synced_count:
          count,

        cards_sync_next_page:
          1,

        /*
         * This is the important bulk-safety change.
         *
         * Failed or unmatched sets get put aside for six
         * hours so the next bulk request advances to other
         * sets instead of getting stuck.
         */
        cards_sync_retry_after:
          retryAfter,

        cards_sync_last_error:
          message.slice(
            0,
            2000,
          ),

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        setId,
      )

  if (error) {
    throw new Error(
      `Unable to record sync failure for ${setId}: ${error.message}`,
    )
  }

  return count
}

/* =========================================================
 * ONE SET
 * ======================================================= */

async function syncCardsForSet(
  setId: string,
  force = false,
) {
  const normalizedSetId =
    normalizeSetId(
      setId,
    )

  if (!normalizedSetId) {
    throw new Error(
      "A set ID is required",
    )
  }

  const catalogSet =
    await getCatalogSet(
      normalizedSetId,
    )

  if (!catalogSet) {
    throw new Error(
      `Pokemon set "${normalizedSetId}" does not exist in pokemon_sets.`,
    )
  }

  /*
   * Skip an already verified set unless force:true was
   * explicitly requested.
   */
  if (
    catalogSet.cards_synced &&
    !force
  ) {
    const storedCount =
      await getStoredCardCount(
        catalogSet.id,
      )

    return {
      setId:
        catalogSet.id,

      setName:
        catalogSet.name,

      tcgdexSetId:
        null as
          | string
          | null,

      matchMethod:
        null as
          | string
          | null,

      skipped: true,
      completed: true,
      verified: true,

      expectedCards:
        storedCount,

      fetchedThisRun:
        0,

      savedThisRun:
        0,

      storedInSupabase:
        storedCount,

      error:
        null as
          | string
          | null,
    }
  }

  const {
    tcgdex,
    sets: tcgdexSets,
  } =
    await getTcgdexSetCatalog()

  const found =
    findTcgdexSet(
      catalogSet,
      tcgdexSets,
    )

  /*
   * No safe match:
   *
   * Record the failure and move on.
   */
  if (
    !found.match ||
    typeof found.match.id !==
      "string"
  ) {
    const message =
      `Unable to safely match "${catalogSet.name}" (${catalogSet.id}) to a TCGdex set`

    const storedCount =
      await markSetFailure(
        catalogSet.id,
        message,
      )

    return {
      setId:
        catalogSet.id,

      setName:
        catalogSet.name,

      tcgdexSetId:
        null,

      matchMethod:
        null,

      skipped: false,
      completed: false,
      verified: false,

      expectedCards:
        null,

      fetchedThisRun:
        0,

      savedThisRun:
        0,

      storedInSupabase:
        storedCount,

      error:
        message,
    }
  }

  const tcgdexSetId =
    found.match.id

  const tcgdexSet =
    await tcgdex.set.get(
      tcgdexSetId,
    )

  if (!tcgdexSet) {
    const message =
      `TCGdex set "${tcgdexSetId}" could not be loaded`

    const storedCount =
      await markSetFailure(
        catalogSet.id,
        message,
      )

    return {
      setId:
        catalogSet.id,

      setName:
        catalogSet.name,

      tcgdexSetId,

      matchMethod:
        found.method,

      skipped: false,
      completed: false,
      verified: false,

      expectedCards:
        null,

      fetchedThisRun:
        0,

      savedThisRun:
        0,

      storedInSupabase:
        storedCount,

      error:
        message,
    }
  }

  const cardResumes =
    (
      Array.isArray(
        tcgdexSet.cards,
      )
        ? tcgdexSet.cards
        : []
    ) as TcgdexCardResume[]

  const expectedCards =
    cardResumes.length

  if (!expectedCards) {
    const message =
      `TCGdex returned zero cards for ${tcgdexSetId}`

    const storedCount =
      await markSetFailure(
        catalogSet.id,
        message,
      )

    return {
      setId:
        catalogSet.id,

      setName:
        catalogSet.name,

      tcgdexSetId,

      matchMethod:
        found.method,

      skipped: false,
      completed: false,
      verified: false,

      expectedCards: 0,

      fetchedThisRun: 0,
      savedThisRun: 0,

      storedInSupabase:
        storedCount,

      error:
        message,
    }
  }

  console.log(
    `[TCGdex Sync] ${catalogSet.id} (${catalogSet.name}) -> ${tcgdexSetId}; expected ${expectedCards} cards`,
  )

  try {
    const result =
      await upsertTcgdexCards(
        catalogSet,
        tcgdexSetId,
        cardResumes,
      )

    const storedCount =
      await getStoredCardCount(
        catalogSet.id,
      )

    /*
     * We do NOT delete existing rows.
     *
     * Therefore storedCount may legitimately be greater
     * than the current TCGdex expected count.
     *
     * Completion requires:
     *
     * - every TCGdex card fetched this run
     * - Supabase contains at least that many cards
     */
    const verified =
      result.fetched ===
        expectedCards &&
      storedCount >=
        expectedCards

    if (!verified) {
      const message =
        `Verification failed for ${catalogSet.id}: TCGdex expected ${expectedCards}, fetched ${result.fetched}, Supabase contains ${storedCount}`

      await markSetFailure(
        catalogSet.id,
        message,
      )

      return {
        setId:
          catalogSet.id,

        setName:
          catalogSet.name,

        tcgdexSetId,

        matchMethod:
          found.method,

        skipped: false,
        completed: false,
        verified: false,

        expectedCards,

        fetchedThisRun:
          result.fetched,

        savedThisRun:
          result.saved,

        storedInSupabase:
          storedCount,

        error:
          message,
      }
    }

    await markSetSynced(
      catalogSet.id,
      storedCount,
    )

    return {
      setId:
        catalogSet.id,

      setName:
        catalogSet.name,

      tcgdexSetId,

      matchMethod:
        found.method,

      skipped: false,
      completed: true,
      verified: true,

      expectedCards,

      fetchedThisRun:
        result.fetched,

      savedThisRun:
        result.saved,

      storedInSupabase:
        storedCount,

      error: null,
    }
  } catch (error) {
    const message =
      getErrorMessage(
        error,
      )

    const storedCount =
      await markSetFailure(
        catalogSet.id,
        message,
      )

    return {
      setId:
        catalogSet.id,

      setName:
        catalogSet.name,

      tcgdexSetId,

      matchMethod:
        found.method,

      skipped: false,
      completed: false,
      verified: false,

      expectedCards,

      fetchedThisRun:
        0,

      savedThisRun:
        0,

      storedInSupabase:
        storedCount,

      error:
        message,
    }
  }
}

/* =========================================================
 * BULK
 * ======================================================= */

async function syncBulk(
  requestedLimit?: number,
) {
  const parsedLimit =
    typeof requestedLimit ===
      "number" &&
    Number.isFinite(
      requestedLimit,
    )
      ? Math.floor(
          requestedLimit,
        )
      : DEFAULT_BULK_SET_LIMIT

  const limit =
    Math.min(
      MAX_BULK_SET_LIMIT,
      Math.max(
        1,
        parsedLimit,
      ),
    )

  const unsynced =
    await getUnsyncedSets(
      limit,
    )

  const results: Awaited<
    ReturnType<
      typeof syncCardsForSet
    >
  >[] = []

  let completed = 0
  let partial = 0
  let failed = 0

  /*
   * Sequential intentionally.
   *
   * Each set can require many full-card requests. We do not
   * want to hammer TCGdex with several sets simultaneously.
   */
  for (
    const set of unsynced
  ) {
    console.log(
      `[TCGdex Bulk] Starting ${set.id} - ${set.name}`,
    )

    try {
      const result =
        await syncCardsForSet(
          set.id,
        )

      results.push(
        result,
      )

      if (
        result.completed &&
        result.verified
      ) {
        completed += 1
      } else if (
        result.storedInSupabase >
        0
      ) {
        partial += 1
      } else {
        failed += 1
      }
    } catch (error) {
      failed += 1

      const message =
        getErrorMessage(
          error,
        )

      let storedCount = 0

      try {
        storedCount =
          await markSetFailure(
            set.id,
            message,
          )
      } catch (
        stateError
      ) {
        console.error(
          `[TCGdex Bulk] Unable to record failure for ${set.id}:`,
          stateError,
        )
      }

      results.push({
        setId:
          set.id,

        setName:
          set.name,

        tcgdexSetId:
          null,

        matchMethod:
          null,

        skipped:
          false,

        completed:
          false,

        verified:
          false,

        expectedCards:
          null,

        fetchedThisRun:
          0,

        savedThisRun:
          0,

        storedInSupabase:
          storedCount,

        error:
          message,
      })
    }

    /*
     * Small pause between sets.
     */
    await sleep(250)
  }

  const catalog =
    await getCatalogSets()

  const completeSets =
    catalog.filter(
      (set) =>
        set.cards_synced,
    ).length

  const remaining =
    catalog.length -
    completeSets

  const coolingDown =
    catalog.filter(
      (set) =>
        !set.cards_synced &&
        set.cards_sync_retry_after !==
          null &&
        new Date(
          set.cards_sync_retry_after,
        ).getTime() >
          Date.now(),
    ).length

  return {
    done:
      remaining === 0,

    /*
     * This tells us whether the remaining catalog consists
     * only of sets currently waiting for retry/manual work.
     */
    waitingForRetries:
      remaining > 0 &&
      unsynced.length === 0,

    limit,

    totalCatalogSets:
      catalog.length,

    completeSets,
    remaining,
    coolingDown,

    processed:
      results.length,

    completed,
    partial,
    failed,

    results,
  }
}

/* =========================================================
 * STATUS
 * ======================================================= */

async function getStatus() {
  const catalog =
    await getCatalogSets()

  const completeSets =
    catalog.filter(
      (set) =>
        set.cards_synced,
    ).length

  const unsyncedSets =
    catalog.filter(
      (set) =>
        !set.cards_synced,
    )

  const coolingDown =
    unsyncedSets.filter(
      (set) =>
        set.cards_sync_retry_after !==
          null &&
        new Date(
          set.cards_sync_retry_after,
        ).getTime() >
          Date.now(),
    )

  const failedSets =
    unsyncedSets.filter(
      (set) =>
        Boolean(
          set.cards_sync_last_error,
        ),
    )

  return {
    totalCatalogSets:
      catalog.length,

    completeSets,

    remaining:
      catalog.length -
      completeSets,

    coolingDown:
      coolingDown.length,

    failedSets:
      failedSets.map(
        (set) => ({
          id:
            set.id,

          name:
            set.name,

          storedCards:
            set.cards_synced_count,

          retryAfter:
            set.cards_sync_retry_after,

          error:
            set.cards_sync_last_error,
        }),
      ),
  }
}

/* =========================================================
 * MATCH PREVIEW
 * ======================================================= */

async function previewMatches(
  limit = 25,
) {
  const catalog =
    await getCatalogSets()

  const { sets } =
    await getTcgdexSetCatalog()

  return catalog
    .slice(
      0,
      Math.max(
        1,
        limit,
      ),
    )
    .map(
      (set) => {
        const found =
          findTcgdexSet(
            set,
            sets,
          )

        return {
          cardVaultId:
            set.id,

          cardVaultName:
            set.name,

          tcgdexId:
            found.match?.id ??
            null,

          tcgdexName:
            found.match?.name ??
            null,

          matchMethod:
            found.method,
        }
      },
    )
}

/* =========================================================
 * POST
 * ======================================================= */

export async function POST(
  request: NextRequest,
) {
  if (
    !hasAdminConfig()
  ) {
    return NextResponse.json(
      {
        error:
          "Supabase admin configuration is missing.",
      },
      {
        status: 500,
      },
    )
  }

  if (
    !isAuthorized(request)
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    )
  }

  let body: {
    action?: string
    setId?: string
    limit?: number
    force?: boolean
  }

  try {
    body =
      await request.json()
  } catch {
    body = {}
  }

  try {
    /*
     * CARD SYNC
     */
    if (
      body.action ===
      "cards"
    ) {
      if (
        typeof body.setId !==
          "string" ||
        !body.setId.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "setId is required when action is cards.",
          },
          {
            status: 400,
          },
        )
      }

      const result =
        await syncCardsForSet(
          body.setId,
          body.force === true,
        )

      return NextResponse.json({
        ok:
          result.completed &&
          result.verified,

        partial:
          !result.completed,

        action:
          "cards",

        ...result,
      })
    }

    /*
     * BULK SYNC
     */
    if (
      body.action ===
      "bulk"
    ) {
      const result =
        await syncBulk(
          body.limit,
        )

      return NextResponse.json({
        ok: true,
        action:
          "bulk",
        ...result,
      })
    }

    /*
     * STATUS
     */
    if (
      body.action ===
      "status"
    ) {
      const result =
        await getStatus()

      return NextResponse.json({
        ok: true,
        action:
          "status",
        ...result,
      })
    }

    /*
     * MATCH PREVIEW
     */
    if (
      body.action ===
      "preview-matches"
    ) {
      const result =
        await previewMatches(
          body.limit,
        )

      return NextResponse.json({
        ok: true,

        action:
          "preview-matches",

        matches:
          result,
      })
    }

    return NextResponse.json(
      {
        error:
          'Invalid action. Use "cards", "bulk", "status", or "preview-matches".',
      },
      {
        status: 400,
      },
    )
  } catch (error) {
    console.error(
      "TCGdex catalog sync failed:",
      error,
    )

    return NextResponse.json(
      {
        ok: false,

        error:
          getErrorMessage(
            error,
          ),
      },
      {
        status: 500,
      },
    )
  }
}