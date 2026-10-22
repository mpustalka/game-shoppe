// Live TCGplayer market prices, via the tcgtracking.com mirror of TCGplayer's
// daily price data.
//
// Inventory items store the market value seen when the card was added, and
// that value never changes afterwards. Snapshots taken from it therefore look
// frozen, and the analytics page shows no price movement at all. This module
// looks up each owned card's current TCGplayer market price instead, and also
// records market-wide prices for the newest sets so Analytics can show what's
// trending even for cards nobody owns yet.
//
// Relative imports so the scheduled Netlify function can bundle this file too.
import { supabaseTable } from "./supabase"
import {
  recordPriceSnapshots,
  type SnapshotInput,
} from "./price-snapshots"

const BASE_URL = "https://tcgtracking.com/tcgapi/v1/3" // 3 = Pokémon
const SET_FETCH_CONCURRENCY = 8

// Market-wide tracking: the newest N main sets, single cards worth at least
// MARKET_MIN_PRICE. Stored in card_price_snapshots under card_id "tcgp-<id>",
// which never collides with pokemontcg.io card ids used for owned cards.
export const MARKET_CARD_PREFIX = "tcgp-"
const MARKET_SET_COUNT = 10
const MARKET_MIN_PRICE = 0.1

type TcgSet = {
  id: number
  name: string
  published_on: string | null
  is_supplemental?: boolean | null
  product_count?: number | null
}

type TcgProduct = {
  id: number
  name: string
  number: string | null
  rarity: string | null
}

type TcgSubtypePrice = { low?: number | null; market?: number | null }

type TcgPricing = Record<
  string,
  { tcg?: Record<string, TcgSubtypePrice | null> | null }
>

type TcgSetData = {
  set: TcgSet
  products: TcgProduct[]
  prices: TcgPricing
}

async function getJson<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    // `next.revalidate` lets Next.js cache these between requests; it is
    // ignored outside Next (e.g. in the scheduled function).
    const response = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate },
    } as RequestInit)
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function listTcgSets(): Promise<TcgSet[]> {
  const data = await getJson<{ sets?: TcgSet[] }>("/sets", 21_600)
  return Array.isArray(data?.sets) ? data.sets : []
}

async function loadTcgSet(set: TcgSet): Promise<TcgSetData> {
  const [details, pricing] = await Promise.all([
    getJson<{ products?: TcgProduct[] }>(`/sets/${set.id}`, 21_600),
    getJson<{ prices?: TcgPricing }>(`/sets/${set.id}/pricing`, 3_600),
  ])
  return {
    set,
    products: Array.isArray(details?.products) ? details.products : [],
    prices: pricing?.prices ?? {},
  }
}

async function loadTcgSets(sets: TcgSet[]): Promise<Map<number, TcgSetData>> {
  const result = new Map<number, TcgSetData>()
  for (let i = 0; i < sets.length; i += SET_FETCH_CONCURRENCY) {
    const batch = await Promise.all(
      sets.slice(i, i + SET_FETCH_CONCURRENCY).map(loadTcgSet),
    )
    for (const data of batch) result.set(data.set.id, data)
  }
  return result
}

// ---------------------------------------------------------------------------
// Matching pokemontcg.io sets/cards to TCGplayer products
// ---------------------------------------------------------------------------

/** "SV10: Destined Rivals" / "XY - Roaring Skies" / "EX Sandstorm" → "destined rivals" … */
function normalizeSetName(name: string) {
  return name
    .toLowerCase()
    .replace(/^\[inactive\]\s*/, "")
    .replace(/pok[eé]mon/g, "pokemon")
    .replace(/&/g, " and ")
    .replace(/^[a-z0-9]{1,6}:\s*/, "")
    .replace(/^(xy|sm|bw|dp|hgss|swsh|sv|me|ex)\s+-\s+/, "")
    .replace(/^ex\s+/, "")
    .replace(/\bblack star\b/g, "")
    .replace(/\bpromos?\b(\s+cards)?/g, "promo")
    .replace(/\band\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// pokemontcg.io names whose TCGplayer set name differs beyond normalization.
const SET_NAME_ALIASES: Record<string, string> = {
  "swsh promo": "sword shield promo",
}

/** Display name without the TCGplayer code prefix ("ME05: Pitch Black" → "Pitch Black"). */
export function displaySetName(name: string) {
  return name.replace(/^\[inactive\]\s*/i, "").replace(/^[A-Za-z0-9]{1,6}:\s*/, "")
}

function isoDay(value: string | null | undefined) {
  return String(value || "").replace(/\//g, "-").slice(0, 10)
}

function buildSetMatcher(sets: TcgSet[]) {
  const byName = new Map<string, TcgSet[]>()
  for (const set of sets) {
    const key = normalizeSetName(set.name)
    const list = byName.get(key) ?? []
    list.push(set)
    byName.set(key, list)
  }

  // Prefer active sets, then the one released on the same day.
  const choose = (candidates: TcgSet[], releaseDate: string) =>
    [...candidates].sort((a, b) => {
      const inactive =
        Number(/^\[inactive\]/i.test(a.name)) -
        Number(/^\[inactive\]/i.test(b.name))
      if (inactive !== 0) return inactive
      return (
        Number(isoDay(b.published_on) === releaseDate) -
        Number(isoDay(a.published_on) === releaseDate)
      )
    })[0] ?? null

  return (name: string, releaseDate: string): TcgSet | null => {
    let key = normalizeSetName(name)
    key = SET_NAME_ALIASES[key] ?? key
    if (!key) return null

    const exact = byName.get(key)
    if (exact?.length) return choose(exact, isoDay(releaseDate))

    // Same release day and one name contains the other (e.g. "Galarian Gallery").
    const day = isoDay(releaseDate)
    const fuzzy = sets.filter((set) => {
      if (!day || isoDay(set.published_on) !== day) return false
      const other = normalizeSetName(set.name)
      return other.includes(key) || key.includes(other)
    })
    return fuzzy.length ? choose(fuzzy, day) : null
  }
}

/** "025/165" → "25", "SWSH001" → "swsh1", "77a" → "77a" */
function numberKey(value: string | null | undefined) {
  const raw = String(value || "").split("/")[0].trim().toLowerCase()
  const match = raw.match(/^([a-z]*)0*(\d+)([a-z]*)$/)
  return match ? `${match[1]}${Number(match[2])}${match[3]}` : raw
}

function simpleName(value: string) {
  return value
    .toLowerCase()
    .replace(/[éè]/g, "e")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function pickProduct(
  candidates: TcgProduct[],
  cardName: string,
  finish: string,
): TcgProduct | null {
  const name = simpleName(cardName)
  // Require the card name to match so a numbering quirk can't price the
  // wrong card.
  const named = candidates.filter((p) => simpleName(p.name).startsWith(name))
  if (named.length === 0) return null

  // Poké Ball / Master Ball pattern reverse holos are separate products.
  const lower = finish.toLowerCase()
  const pattern = lower.includes("poke")
    ? "poke ball"
    : lower.includes("master")
      ? "master ball"
      : null
  if (pattern) {
    const patterned = named.find((p) => simpleName(p.name).includes(pattern))
    if (patterned) return patterned
  }

  return named.find((p) => !/ball pattern/i.test(p.name)) ?? named[0]
}

/** Map an inventory finish to TCGplayer's price subtypes, best match first. */
function pickMarketPrice(
  subtypes: Record<string, TcgSubtypePrice | null> | null | undefined,
  finish: string,
): number | null {
  if (!subtypes) return null
  const lower = finish.toLowerCase()
  const order = lower.includes("reverse")
    ? ["Reverse Holofoil", "Holofoil", "Normal"]
    : ["normal", "non holo", "stamped"].includes(lower)
      ? ["Normal", "Unlimited", "Holofoil", "Unlimited Holofoil"]
      : ["Holofoil", "Unlimited Holofoil", "1st Edition Holofoil", "Normal"]

  for (const key of order) {
    const market = Number(subtypes[key]?.market)
    if (market > 0) return market
  }
  for (const price of Object.values(subtypes)) {
    const market = Number(price?.market)
    if (market > 0) return market
  }
  return null
}

// ---------------------------------------------------------------------------
// Snapshot capture
// ---------------------------------------------------------------------------

type StoredItem = {
  cardId?: unknown
  finish?: unknown
  marketValue?: unknown
  price?: unknown
  card?: {
    name?: unknown
    number?: unknown
    set?: {
      name?: unknown
      releaseDate?: unknown
    }
  }
}

function str(value: unknown) {
  return typeof value === "string" ? value : ""
}

function storedMarketValue(item: StoredItem): number {
  const market = Number(item.marketValue)
  if (Number.isFinite(market) && market > 0) return market
  const price = Number(item.price)
  return Number.isFinite(price) && price > 0 ? price : 0
}

/**
 * Record today's reading for each inventory card + finish. Cards matched to a
 * TCGplayer product get the live market price (replacing any earlier reading
 * today); the rest fall back to the stored market value.
 */
export async function snapshotInventoryItems(
  items: Array<StoredItem | null | undefined>,
) {
  const parsed = items
    .filter((item): item is StoredItem => Boolean(item))
    .map((item) => ({
      cardId: str(item.cardId),
      finish: str(item.finish) || "Normal",
      name: str(item.card?.name),
      number: str(item.card?.number),
      setName: str(item.card?.set?.name),
      releaseDate: str(item.card?.set?.releaseDate),
      stored: storedMarketValue(item),
    }))
    .filter((item) => item.cardId)

  const tcgSets = await listTcgSets()
  const matchSet = buildSetMatcher(tcgSets)

  const setFor = new Map<string, TcgSet | null>()
  for (const item of parsed) {
    const key = `${item.setName}|${item.releaseDate}`
    if (!setFor.has(key)) setFor.set(key, matchSet(item.setName, item.releaseDate))
  }

  const needed = new Map<number, TcgSet>()
  for (const set of setFor.values()) if (set) needed.set(set.id, set)
  const setData = await loadTcgSets(Array.from(needed.values()))

  // Index each set's products by card number once.
  const byNumber = new Map<number, Map<string, TcgProduct[]>>()
  for (const [id, data] of setData) {
    const index = new Map<string, TcgProduct[]>()
    for (const product of data.products) {
      if (!product.number) continue
      const key = numberKey(product.number)
      const list = index.get(key) ?? []
      list.push(product)
      index.set(key, list)
    }
    byNumber.set(id, index)
  }

  const live: SnapshotInput[] = []
  const fallback: SnapshotInput[] = []

  for (const item of parsed) {
    const base = {
      card_id: item.cardId,
      card_name: item.name || null,
      set_name: item.setName || null,
      finish: item.finish,
    }

    const set = setFor.get(`${item.setName}|${item.releaseDate}`)
    const data = set ? setData.get(set.id) : undefined
    const product =
      set && data
        ? pickProduct(
            byNumber.get(set.id)?.get(numberKey(item.number)) ?? [],
            item.name,
            item.finish,
          )
        : null
    const market = product
      ? pickMarketPrice(data?.prices[String(product.id)]?.tcg, item.finish)
      : null

    if (market && market > 0) {
      live.push({ ...base, market_price: market })
    } else if (item.stored > 0) {
      fallback.push({ ...base, market_price: item.stored })
    }
  }

  // Live prices first so they win; stored values only fill gaps.
  const livePriced = await recordPriceSnapshots(live, { overwrite: true })
  const storedPriced = await recordPriceSnapshots(fallback)

  return {
    tracked: parsed.length,
    livePriced: live.length,
    storedOnly: fallback.length,
    written: livePriced + storedPriced,
  }
}

/** The newest main sets that are already released. */
export async function recentMarketSets(): Promise<TcgSet[]> {
  const today = new Date().toISOString().slice(0, 10)
  return (await listTcgSets())
    .filter(
      (set) =>
        !set.is_supplemental &&
        !/^\[inactive\]/i.test(set.name) &&
        (set.product_count ?? 0) >= 50 &&
        isoDay(set.published_on) !== "" &&
        isoDay(set.published_on) <= today,
    )
    .sort((a, b) => isoDay(b.published_on).localeCompare(isoDay(a.published_on)))
    .slice(0, MARKET_SET_COUNT)
}

/** Record today's market price for every single card in the newest sets. */
export async function snapshotMarketSets() {
  const sets = await recentMarketSets()
  const setData = await loadTcgSets(sets)
  const rows: SnapshotInput[] = []

  for (const { set, products, prices } of setData.values()) {
    for (const product of products) {
      if (!product.number) continue // sealed product
      const subtypes = prices[String(product.id)]?.tcg
      if (!subtypes) continue
      for (const [subtype, price] of Object.entries(subtypes)) {
        const market = Number(price?.market)
        if (!(market >= MARKET_MIN_PRICE)) continue
        rows.push({
          card_id: `${MARKET_CARD_PREFIX}${product.id}`,
          card_name: product.name,
          set_name: displaySetName(set.name),
          finish: subtype,
          market_price: market,
        })
      }
    }
  }

  const written = await recordPriceSnapshots(rows, { overwrite: true })
  return { sets: sets.length, cards: rows.length, written }
}

/**
 * Daily market-history capture, used by the scheduled daily-snapshot function
 * and the /api/analytics/snapshot-daily route: every account's inventory plus
 * the market-wide newest-set prices.
 */
export async function captureDailySnapshots() {
  const rows = (await supabaseTable("inventory_items", {
    select: "item",
    order: "created_at.asc",
    limit: 100000,
  })) as Array<{ item: StoredItem | null }>

  const inventory = await snapshotInventoryItems(
    (rows || []).map((row) => row?.item),
  )
  const market = await snapshotMarketSets()

  return { inventory, market }
}
