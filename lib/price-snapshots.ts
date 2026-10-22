// Relative import so the scheduled Netlify function can bundle this file too.
import { supabaseTable } from "./supabase"

// ---------------------------------------------------------------------------
// Shared helpers for the card_price_snapshots market-history table.
//
// The table is global (one reading per card + finish + day for every account),
// so it grows with every tenant's inventory. Analytics routes must only read
// the rows for cards the signed-in account owns — loading the whole window and
// filtering in memory eventually hits row limits/timeouts and the analytics
// page comes back empty.
// ---------------------------------------------------------------------------

export type SnapshotInput = {
  card_id: string
  card_name: string | null
  set_name: string | null
  finish: string
  market_price: number
}

// Keeps each card_id=in.(...) request URL comfortably short.
const IDS_PER_REQUEST = 100
const PARALLEL_REQUESTS = 6
const INSERT_BATCH = 500

export function todaySnapshotDate() {
  return new Date().toISOString().slice(0, 10)
}

function inFilter(column: string, values: string[]) {
  const quoted = values.map(
    (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  )
  return `${column}=in.${encodeURIComponent(`(${quoted.join(",")})`)}`
}

/**
 * Load snapshot rows captured on/after `sinceDay` (YYYY-MM-DD) for the given
 * card ids only, sorted ascending by captured_on.
 */
export async function loadSnapshotsForCards<T extends { captured_on: string }>(
  cardIds: Iterable<string>,
  sinceDay: string,
  select: string,
): Promise<T[]> {
  const ids = Array.from(new Set(cardIds)).filter(Boolean)
  if (ids.length === 0) return []

  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) {
    chunks.push(ids.slice(i, i + IDS_PER_REQUEST))
  }

  const rows: T[] = []
  for (let i = 0; i < chunks.length; i += PARALLEL_REQUESTS) {
    const pages = await Promise.all(
      chunks.slice(i, i + PARALLEL_REQUESTS).map(
        (chunk) =>
          supabaseTable("card_price_snapshots", {
            select,
            filters: [inFilter("card_id", chunk), `captured_on=gte.${sinceDay}`],
            order: "captured_on.asc",
            // ~100 cards × a year of daily readings.
            limit: chunk.length * 400,
          }) as Promise<T[]>,
      ),
    )
    for (const page of pages) {
      if (Array.isArray(page)) rows.push(...page)
    }
  }

  // Chunks are each sorted; restore a single ascending order across them.
  rows.sort((a, b) =>
    a.captured_on < b.captured_on ? -1 : a.captured_on > b.captured_on ? 1 : 0,
  )
  return rows
}

/**
 * Record today's reading for each card + finish. Rows already captured today
 * are skipped by the database (unique card_id + finish + captured_on), so this
 * is safe to call repeatedly and concurrently. Returns the number inserted.
 */
export async function recordPriceSnapshots(
  snapshots: SnapshotInput[],
): Promise<number> {
  // Collapse to one row per card + finish, keeping the highest observed price.
  const deduped = new Map<string, SnapshotInput>()
  for (const snap of snapshots) {
    if (!snap.card_id || !(snap.market_price > 0)) continue
    const key = `${snap.card_id}|${snap.finish}`
    const existing = deduped.get(key)
    if (existing && existing.market_price >= snap.market_price) continue
    deduped.set(key, {
      ...snap,
      market_price: Number(snap.market_price.toFixed(2)),
    })
  }

  const captured_on = todaySnapshotDate()
  const rows = Array.from(deduped.values()).map((row) => ({
    ...row,
    captured_on,
  }))

  let inserted = 0
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const result = await supabaseTable("card_price_snapshots", {
      method: "POST",
      body: rows.slice(i, i + INSERT_BATCH),
      onConflict: "card_id,finish,captured_on",
      resolution: "ignore-duplicates",
    })
    inserted += Array.isArray(result) ? result.length : 0
  }
  return inserted
}

type StoredItem = {
  cardId?: unknown
  finish?: unknown
  marketValue?: unknown
  price?: unknown
  card?: {
    name?: unknown
    set?: {
      name?: unknown
    }
  }
}

function marketValueOf(item: StoredItem): number {
  const market = Number(item.marketValue)
  if (Number.isFinite(market) && market > 0) return market
  const price = Number(item.price)
  return Number.isFinite(price) && price > 0 ? price : 0
}

/**
 * Daily market-history capture: one reading per card + finish across every
 * account's stored inventory. Used by the scheduled daily-snapshot function
 * and the /api/analytics/snapshot-daily route.
 */
export async function captureDailySnapshots() {
  const rows = (await supabaseTable("inventory_items", {
    select: "item",
    order: "created_at.asc",
    limit: 100000,
  })) as Array<{ item: StoredItem | null }>

  const snapshots: SnapshotInput[] = []

  for (const row of rows || []) {
    const item = row?.item
    if (!item) continue

    const cardId = typeof item.cardId === "string" ? item.cardId : ""
    const price = marketValueOf(item)
    if (!cardId || price <= 0) continue

    snapshots.push({
      card_id: cardId,
      card_name:
        item.card && typeof item.card.name === "string" ? item.card.name : null,
      set_name:
        item.card && item.card.set && typeof item.card.set.name === "string"
          ? item.card.set.name
          : null,
      finish:
        typeof item.finish === "string" && item.finish ? item.finish : "Normal",
      market_price: price,
    })
  }

  const inserted = await recordPriceSnapshots(snapshots)

  return { inserted, tracked: snapshots.length }
}
