import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import {
  scopeFilters,
  type DataScope,
} from "@/lib/user-scope"
import { resolveInventoryScope } from "@/lib/inventory-scope"
import { requireFeature } from "@/lib/subscription-server"
import { loadSnapshotsForCards } from "@/lib/price-snapshots"

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function dayLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  })
}

type SearchRow = {
  normalized_query: string
  result_count: number
}

type SaleRow = {
  card_id: string
  card_name: string | null
  set_name: string | null
  quantity: number
  unit_price: number
  purchase_price: number
  sold_at: string
}

type SnapshotRow = {
  card_id: string
  card_name: string | null
  set_name: string | null
  finish: string | null
  market_price: number
  captured_on: string
}

type InventoryRow = {
  item: Record<string, unknown>
}

const EMPTY_SEARCHES = {
  topSearches: [] as Array<{
    query: string
    searches: number
    last_result_count: number
  }>,
  dailySearches: [] as Array<{
    day: string
    searches: number
  }>,
  totalSearches: 0,
  unmetDemand: [] as Array<{
    query: string
    searches: number
    last_result_count: number
  }>,
}

const EMPTY_SALES = {
  hasData: false,
  revenue: 0,
  cost: 0,
  profit: 0,
  units: 0,
  roi: 0,
  margin: 0,
  avgSalePrice: 0,
  daily: [] as Array<{
    day: string
    revenue: number
    cost: number
    profit: number
    units: number
    margin: number
    roi: number
  }>,
  topByRevenue: [] as Array<{
    name: string
    set: string
    units: number
    revenue: number
    profit: number
  }>,
}

const EMPTY_PRICE_MOVERS = {
  trackedCards: 0,
  gainers: [] as Array<Record<string, unknown>>,
  losers: [] as Array<Record<string, unknown>>,
}

function normalizedFinish(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "Normal"
}

function inventoryOwnershipKey(item: Record<string, unknown>) {
  const cardId =
    typeof item.cardId === "string"
      ? item.cardId
      : ""

  if (!cardId) {
    return null
  }

  return `${cardId}|${normalizedFinish(item.finish)}`
}

async function getOwnedCardKeys(scope: DataScope) {
  const inventoryRows = (await supabaseTable("inventory_items", {
    select: "item",
    filters: scopeFilters(scope),
    order: "created_at.desc",
    limit: 50000,
  }).catch(() => [])) as InventoryRow[]

  const ownedKeys = new Set<string>()

  for (const row of inventoryRows) {
    const item = row.item || {}
    const quantity = Number(item.quantity ?? 1)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue
    }

    const key = inventoryOwnershipKey(item)

    if (key) {
      ownedKeys.add(key)
    }
  }

  return ownedKeys
}

async function buildSearches(
  windowIso: string,
  fourteenIso: string,
  scope: DataScope,
) {
  const rows = (await supabaseTable("card_search_events", {
    select: "normalized_query,result_count,created_at",
    filters: [
      ...scopeFilters(scope),
      `created_at=gte.${windowIso}`,
    ],
    order: "created_at.desc",
    limit: 5000,
  })) as SearchRow[]

  const grouped = new Map<
    string,
    {
      query: string
      searches: number
      last_result_count: number
    }
  >()

  for (const row of rows) {
    const query = row.normalized_query || ""

    if (!query) continue

    const entry = grouped.get(query) ?? {
      query,
      searches: 0,
      last_result_count: 0,
    }

    entry.searches += 1

    entry.last_result_count = Math.max(
      entry.last_result_count,
      Number(row.result_count || 0),
    )

    grouped.set(query, entry)
  }

  const topSearches = Array.from(grouped.values())
    .sort(
      (a, b) =>
        b.searches - a.searches ||
        a.query.localeCompare(b.query),
    )
    .slice(0, 12)

  const dailyRows = (await supabaseTable("card_search_events", {
    select: "created_at",
    filters: [
      ...scopeFilters(scope),
      `created_at=gte.${fourteenIso}`,
    ],
    order: "created_at.asc",
    limit: 5000,
  })) as Array<{ created_at: string }>

  const dailyMap = new Map<string, number>()

  for (const row of dailyRows) {
    const day = dayLabel(row.created_at)

    dailyMap.set(
      day,
      (dailyMap.get(day) || 0) + 1,
    )
  }

  const dailySearches =
    Array.from(dailyMap.entries()).map(
      ([day, searches]) => ({
        day,
        searches,
      }),
    )

  return {
    topSearches,
    dailySearches,
    totalSearches: rows.length,
    unmetDemand: topSearches
      .filter(
        (entry) =>
          entry.last_result_count === 0,
      )
      .slice(0, 8),
  }
}

async function buildSales(
  windowIso: string,
  scope: DataScope,
) {
  const rows = (await supabaseTable("card_sales", {
    select:
      "card_id,card_name,set_name,quantity,unit_price,purchase_price,sold_at",
    filters: [
      ...scopeFilters(scope),
      `sold_at=gte.${windowIso}`,
    ],
    order: "sold_at.asc",
    limit: 10000,
  }).catch(() => [])) as SaleRow[]

  let revenue = 0
  let cost = 0
  let units = 0

  const daily = new Map<
    string,
    {
      revenue: number
      cost: number
      profit: number
      units: number
    }
  >()

  const byCard = new Map<
    string,
    {
      name: string
      set: string
      units: number
      revenue: number
      profit: number
    }
  >()

  for (const row of rows) {
    const qty =
      Number(row.quantity) || 0

    const lineRevenue =
      Number(row.unit_price) * qty

    const lineCost =
      Number(row.purchase_price) * qty

    revenue += lineRevenue
    cost += lineCost
    units += qty

    const day =
      dayLabel(row.sold_at)

    const dayEntry =
      daily.get(day) ?? {
        revenue: 0,
        cost: 0,
        profit: 0,
        units: 0,
      }

    dayEntry.revenue += lineRevenue
    dayEntry.cost += lineCost
    dayEntry.profit +=
      lineRevenue - lineCost
    dayEntry.units += qty

    daily.set(day, dayEntry)

    const card =
      byCard.get(row.card_id) ?? {
        name:
          row.card_name ||
          row.card_id,
        set:
          row.set_name || "",
        units: 0,
        revenue: 0,
        profit: 0,
      }

    card.units += qty
    card.revenue += lineRevenue
    card.profit +=
      lineRevenue - lineCost

    byCard.set(row.card_id, card)
  }

  const profit =
    revenue - cost

  return {
    hasData: rows.length > 0,
    revenue,
    cost,
    profit,
    units,
    roi:
      cost > 0
        ? (profit / cost) * 100
        : 0,
    margin:
      revenue > 0
        ? (profit / revenue) * 100
        : 0,
    avgSalePrice:
      units > 0
        ? revenue / units
        : 0,

    daily:
      Array.from(
        daily.entries(),
      ).map(
        ([day, value]) => ({
          day,
          ...value,
          margin:
            value.revenue > 0
              ? (
                  value.profit /
                  value.revenue
                ) * 100
              : 0,
          roi:
            value.cost > 0
              ? (
                  value.profit /
                  value.cost
                ) * 100
              : 0,
        }),
      ),

    topByRevenue:
      Array.from(
        byCard.values(),
      )
        .sort(
          (a, b) =>
            b.revenue -
            a.revenue,
        )
        .slice(0, 8),
  }
}

async function buildPriceMovers(
  windowIso: string,
  scope: DataScope,
) {
  /*
   * IMPORTANT:
   *
   * card_price_snapshots is global market data.
   * Ownership comes from inventory_items.
   *
   * Therefore:
   *   1. Find cards owned by THIS account/company.
   *   2. Load global market snapshots.
   *   3. Throw away snapshots for cards the account does not own.
   */

  const ownedKeys =
    await getOwnedCardKeys(scope)

  if (ownedKeys.size === 0) {
    return EMPTY_PRICE_MOVERS
  }

  const snapshotRows =
    (await loadSnapshotsForCards<SnapshotRow>(
      Array.from(ownedKeys, (key) => key.split("|")[0]),
      windowIso.slice(0, 10),
      "card_id,card_name,set_name,finish,market_price,captured_on",
    ).catch(() => [])) as SnapshotRow[]

  const rows =
    snapshotRows.filter(
      (row) =>
        ownedKeys.has(
          `${row.card_id}|${normalizedFinish(row.finish)}`,
        ),
    )

  const series = new Map<
    string,
    {
      card_id: string
      name: string
      set: string
      finish: string
      first: number
      last: number
      days: Set<string>
    }
  >()

  for (const row of rows) {
    const finish =
      normalizedFinish(row.finish)

    const key =
      `${row.card_id}|${finish}`

    const price =
      Number(row.market_price)

    if (!Number.isFinite(price)) {
      continue
    }

    const entry =
      series.get(key)

    if (!entry) {
      series.set(key, {
        card_id: row.card_id,
        name:
          row.card_name ||
          row.card_id,
        set:
          row.set_name || "",
        finish,
        first: price,
        last: price,
        days: new Set([
          row.captured_on,
        ]),
      })
    } else {
      entry.last = price
      entry.days.add(
        row.captured_on,
      )
    }
  }

  const movers =
    Array.from(
      series.values(),
    )
      .filter(
        (entry) =>
          entry.days.size >= 2 &&
          entry.first >= 0.5,
      )
      .map((entry) => {
        const change =
          entry.last -
          entry.first

        return {
          cardId:
            entry.card_id,
          name:
            entry.name,
          set:
            entry.set,
          finish:
            entry.finish,
          first:
            entry.first,
          last:
            entry.last,
          change:
            Number(
              change.toFixed(2),
            ),
          changePercent:
            entry.first > 0
              ? Number(
                  (
                    (change /
                      entry.first) *
                    100
                  ).toFixed(1),
                )
              : 0,
        }
      })
      .filter(
        (entry) =>
          entry.change !== 0,
      )

  return {
    trackedCards:
      series.size,

    gainers:
      movers
        .filter(
          (entry) =>
            entry.change > 0,
        )
        .sort(
          (a, b) =>
            b.changePercent -
            a.changePercent,
        )
        .slice(0, 8),

    losers:
      movers
        .filter(
          (entry) =>
            entry.change < 0,
        )
        .sort(
          (a, b) =>
            a.changePercent -
            b.changePercent,
        )
        .slice(0, 8),
  }
}

export async function GET(
  request: Request,
) {
  const gate =
    await requireFeature(
      (e) =>
        e.canUseAnalytics,
      "Analytics",
      "premium",
    )

  if (
    gate instanceof
    NextResponse
  ) {
    return gate
  }

  const scope =
    await resolveInventoryScope()

  if (
    scope instanceof
    NextResponse
  ) {
    return scope
  }

  const url =
    new URL(request.url)

  const days =
    Math.min(
      365,
      Math.max(
        7,
        Number(
          url.searchParams.get(
            "days",
          ),
        ) || 30,
      ),
    )

  const windowIso =
    daysAgoIso(days)

  const fourteenIso =
    daysAgoIso(14)

  const [
  searches,
  sales,
  priceMovers,
] = await Promise.all([
  buildSearches(
    windowIso,
    fourteenIso,
    scope,
  ).catch(() => EMPTY_SEARCHES),

  buildSales(
    windowIso,
    scope,
  ).catch(() => EMPTY_SALES),

  buildPriceMovers(
    windowIso,
    scope,
  ).catch(() => EMPTY_PRICE_MOVERS),
])

  const todayKey =
    dayLabel(
      new Date().toISOString(),
    )

  const todaySales =
    sales.daily.find(
      (entry) =>
        entry.day ===
        todayKey,
    ) ?? null

  const today = {
    cardsSold:
      todaySales?.units ?? 0,
    revenue:
      todaySales?.revenue ?? 0,
    cost:
      todaySales?.cost ?? 0,
    profit:
      todaySales?.profit ?? 0,
    margin:
      todaySales?.margin ?? 0,
    roi:
      todaySales?.roi ?? 0,
  }

  return NextResponse.json({
    days,
    ...searches,
    sales,
    priceMovers,
    today,
  })
}