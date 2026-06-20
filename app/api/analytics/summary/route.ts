import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function dayLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  })
}

type SearchRow = { normalized_query: string; result_count: number }
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
  finish: string
  market_price: number
  captured_on: string
}

async function buildSearches(windowIso: string, fourteenIso: string) {
  const rows = (await supabaseTable("card_search_events", {
    select: "normalized_query,result_count,created_at",
    filters: [`created_at=gte.${windowIso}`],
    order: "created_at.desc",
    limit: 5000,
  })) as SearchRow[]

  const grouped = new Map<
    string,
    { query: string; searches: number; last_result_count: number }
  >()
  for (const row of rows) {
    const query = row.normalized_query || ""
    if (!query) continue
    const entry =
      grouped.get(query) ?? { query, searches: 0, last_result_count: 0 }
    entry.searches += 1
    entry.last_result_count = Math.max(
      entry.last_result_count,
      Number(row.result_count || 0),
    )
    grouped.set(query, entry)
  }

  const topSearches = Array.from(grouped.values())
    .sort((a, b) => b.searches - a.searches || a.query.localeCompare(b.query))
    .slice(0, 12)

  const dailyRows = (await supabaseTable("card_search_events", {
    select: "created_at",
    filters: [`created_at=gte.${fourteenIso}`],
    order: "created_at.asc",
    limit: 5000,
  })) as Array<{ created_at: string }>

  const dailyMap = new Map<string, number>()
  for (const row of dailyRows) {
    const day = dayLabel(row.created_at)
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }
  const dailySearches = Array.from(dailyMap.entries()).map(
    ([day, searches]) => ({ day, searches }),
  )

  return {
    topSearches,
    dailySearches,
    totalSearches: rows.length,
    // Demand for cards that returned zero in-stock results = restock signals.
    unmetDemand: topSearches
      .filter((entry) => entry.last_result_count === 0)
      .slice(0, 8),
  }
}

async function buildSales(windowIso: string) {
  const rows = (await supabaseTable("card_sales", {
    select:
      "card_id,card_name,set_name,quantity,unit_price,purchase_price,sold_at",
    filters: [`sold_at=gte.${windowIso}`],
    order: "sold_at.asc",
    limit: 10000,
  }).catch(() => [])) as SaleRow[]

  let revenue = 0
  let cost = 0
  let units = 0
  const daily = new Map<string, { revenue: number; units: number }>()
  const byCard = new Map<
    string,
    { name: string; set: string; units: number; revenue: number; profit: number }
  >()

  for (const row of rows) {
    const qty = Number(row.quantity) || 0
    const lineRevenue = Number(row.unit_price) * qty
    const lineCost = Number(row.purchase_price) * qty
    revenue += lineRevenue
    cost += lineCost
    units += qty

    const day = dayLabel(row.sold_at)
    const dayEntry = daily.get(day) ?? { revenue: 0, units: 0 }
    dayEntry.revenue += lineRevenue
    dayEntry.units += qty
    daily.set(day, dayEntry)

    const card = byCard.get(row.card_id) ?? {
      name: row.card_name || row.card_id,
      set: row.set_name || "",
      units: 0,
      revenue: 0,
      profit: 0,
    }
    card.units += qty
    card.revenue += lineRevenue
    card.profit += lineRevenue - lineCost
    byCard.set(row.card_id, card)
  }

  const profit = revenue - cost

  return {
    hasData: rows.length > 0,
    revenue,
    cost,
    profit,
    units,
    roi: cost > 0 ? (profit / cost) * 100 : 0,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    avgSalePrice: units > 0 ? revenue / units : 0,
    daily: Array.from(daily.entries()).map(([day, value]) => ({
      day,
      ...value,
    })),
    topByRevenue: Array.from(byCard.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
  }
}

async function buildPriceMovers(windowIso: string) {
  const rows = (await supabaseTable("card_price_snapshots", {
    select: "card_id,card_name,set_name,finish,market_price,captured_on",
    filters: [`captured_on=gte.${windowIso.slice(0, 10)}`],
    order: "captured_on.asc",
    limit: 20000,
  }).catch(() => [])) as SnapshotRow[]

  // Group by card+finish, keep first and last reading in the window.
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
    const key = `${row.card_id}|${row.finish}`
    const price = Number(row.market_price)
    if (!Number.isFinite(price)) continue
    const entry = series.get(key)
    if (!entry) {
      series.set(key, {
        card_id: row.card_id,
        name: row.card_name || row.card_id,
        set: row.set_name || "",
        finish: row.finish,
        first: price,
        last: price,
        days: new Set([row.captured_on]),
      })
    } else {
      entry.last = price // rows are ordered ascending, so this ends on latest
      entry.days.add(row.captured_on)
    }
  }

  const movers = Array.from(series.values())
    // Need at least two distinct days and a meaningful price to call a move.
    .filter((entry) => entry.days.size >= 2 && entry.first >= 0.5)
    .map((entry) => {
      const change = entry.last - entry.first
      return {
        cardId: entry.card_id,
        name: entry.name,
        set: entry.set,
        finish: entry.finish,
        first: entry.first,
        last: entry.last,
        change: Number(change.toFixed(2)),
        changePercent:
          entry.first > 0 ? Number(((change / entry.first) * 100).toFixed(1)) : 0,
      }
    })
    .filter((entry) => entry.change !== 0)

  return {
    trackedCards: series.size,
    gainers: movers
      .filter((entry) => entry.change > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 8),
    losers: movers
      .filter((entry) => entry.change < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 8),
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const days = Math.min(
    365,
    Math.max(7, Number(url.searchParams.get("days")) || 30),
  )
  const windowIso = daysAgoIso(days)
  const fourteenIso = daysAgoIso(14)

  const [searches, sales, priceMovers] = await Promise.all([
    buildSearches(windowIso, fourteenIso).catch(() => ({
      topSearches: [],
      dailySearches: [],
      totalSearches: 0,
      unmetDemand: [],
    })),
    buildSales(windowIso).catch(() => ({
      hasData: false,
      revenue: 0,
      cost: 0,
      profit: 0,
      units: 0,
      roi: 0,
      margin: 0,
      avgSalePrice: 0,
      daily: [],
      topByRevenue: [],
    })),
    buildPriceMovers(windowIso).catch(() => ({
      trackedCards: 0,
      gainers: [],
      losers: [],
    })),
  ])

  return NextResponse.json({ days, ...searches, sales, priceMovers })
}
