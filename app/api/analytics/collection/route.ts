import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { resolveDataScope, scopeFilters } from "@/lib/user-scope"

// ---------------------------------------------------------------------------
// Collection analytics.
//
// This route answers three questions for the whole collection:
//   1. What happened to my collection value?      → overview + trend
//   2. Which cards drove the change?              → movers + contribution
//   3. What should I pay attention to next?       → winners/losers + sets
//
// Everything is quantity-weighted. A card up 40% that you own one of moves the
// collection less than a card up 8% that you own thirty of, so the headline
// metric is *portfolio impact* = (current price − price 7 days ago) × quantity.
//
// Data comes from two tables, joined here on the server:
//   • card_price_snapshots — one market-price reading per card+finish per day.
//   • inventory_items      — current holdings (quantity, finish, cost, card JSON).
//
// Historical quantity is not tracked, so the trend values *current* holdings at
// historical prices (an index of today's collection, not a transaction ledger).
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function isoDay(offsetDays = 0) {
  return new Date(Date.now() - offsetDays * DAY_MS).toISOString().slice(0, 10)
}

function dayLabel(iso: string) {
  // iso is YYYY-MM-DD; parse as UTC noon to avoid timezone day-shifting.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  })
}

type SnapshotRow = {
  card_id: string
  finish: string
  market_price: number | string
  captured_on: string
}

type OwnedCard = {
  cardId: string
  finish: string
  name: string
  set: string
  number: string
  rarity: string
  image: string
  quantity: number
  costTotal: number
  fallbackPrice: number
}

type PricePoint = { day: string; price: number }

/** Last reading on or before `day`; falls back to the earliest known reading. */
function priceAsOf(series: PricePoint[], day: string): number | null {
  if (series.length === 0) return null
  let chosen: number | null = null
  for (const point of series) {
    if (point.day <= day) chosen = point.price
    else break
  }
  return chosen ?? series[0].price
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function buildOwned(rows: Array<{ item: Record<string, unknown> }>) {
  // Aggregate inventory lines down to one entry per card + finish. Multiple
  // listings of the same card/finish in different conditions are summed, since
  // price snapshots are tracked per card + finish.
  const owned = new Map<string, OwnedCard>()

  for (const row of rows) {
    const item = row.item || {}
    const cardId = typeof item.cardId === "string" ? item.cardId : ""
    if (!cardId) continue

    const card = (item.card as Record<string, any>) || {}
    const finish =
      typeof item.finish === "string" && item.finish ? item.finish : "Normal"
    const quantity = num(item.quantity)
    if (quantity <= 0) continue

    const marketValue = num(item.marketValue) || num(item.price)
    const purchasePrice = num(item.purchasePrice)
    const key = `${cardId}|${finish}`

    const entry =
      owned.get(key) ??
      ({
        cardId,
        finish,
        name: card?.name || cardId,
        set: card?.set?.name || "",
        number: card?.number || "",
        rarity: card?.rarity || "",
        image:
          (typeof item.customImage === "string" && item.customImage) ||
          card?.images?.small ||
          "",
        quantity: 0,
        costTotal: 0,
        fallbackPrice: 0,
      } as OwnedCard)

    entry.quantity += quantity
    entry.costTotal += purchasePrice * quantity
    entry.fallbackPrice = Math.max(entry.fallbackPrice, marketValue)
    owned.set(key, entry)
  }

  return owned
}

function buildSeries(rows: SnapshotRow[]) {
  const series = new Map<string, PricePoint[]>()
  for (const row of rows) {
    const price = num(row.market_price)
    if (price <= 0) continue
    const key = `${row.card_id}|${row.finish}`
    const list = series.get(key) ?? []
    list.push({ day: row.captured_on, price })
    series.set(key, list)
  }
  // Rows arrive ordered ascending by captured_on, so each list is already sorted.
  return series
}

function stddev(values: number[]) {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function round(value: number, places = 2) {
  const f = 10 ** places
  return Math.round(value * f) / f
}

export async function GET(request: Request) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(request.url)
  // Trend window. Movement math ("this week" / "30-day change") always uses
  // fixed 7- and 30-day baselines regardless of the chart window below.
  const trendDays = Math.min(
    3650,
    Math.max(7, Number(url.searchParams.get("days")) || 90),
  )

  // Fetch enough history to cover the 30-day change even on a 7-day chart.
  const fetchDays = Math.max(trendDays, 30)
  const windowStart = isoDay(fetchDays)
  const today = isoDay(0)
  const d7 = isoDay(7)
  const d30 = isoDay(30)

  let inventoryRows: Array<{ item: Record<string, unknown> }> = []
  let snapshotRows: SnapshotRow[] = []

  // An account with no ownership of its own analyses an empty collection
  // rather than everyone else's.
  if (scope.mode !== "isolated") {
    try {
      inventoryRows = (await supabaseTable("inventory_items", {
        select: "item",
        filters: scopeFilters(scope),
        order: "created_at.desc",
        limit: 50000,
      })) as Array<{ item: Record<string, unknown> }>
    } catch {
      inventoryRows = []
    }
  }

  try {
    snapshotRows = (await supabaseTable("card_price_snapshots", {
      select: "card_id,finish,market_price,captured_on",
      filters: [`captured_on=gte.${windowStart}`],
      order: "captured_on.asc",
      limit: 100000,
    })) as SnapshotRow[]
  } catch {
    snapshotRows = []
  }

  const owned = buildOwned(inventoryRows)
  const series = buildSeries(snapshotRows)

  // Per-card movement, quantity-weighted.
  type Row = {
    cardId: string
    finish: string
    name: string
    set: string
    number: string
    rarity: string
    image: string
    quantity: number
    price7: number
    current: number
    changeAbs: number
    changePercent: number
    impact: number
    currentValue: number
    hasHistory: boolean
  }

  const rows: Row[] = []
  let totalValue = 0
  let value7Ago = 0
  let value30Ago = 0

  for (const card of owned.values()) {
    const key = `${card.cardId}|${card.finish}`
    const s = series.get(key) ?? []
    const hasHistory = s.length > 0

    const current = hasHistory
      ? s[s.length - 1].price
      : card.fallbackPrice
    const price7 = hasHistory
      ? priceAsOf(s, d7) ?? current
      : card.fallbackPrice
    const price30 = hasHistory
      ? priceAsOf(s, d30) ?? current
      : card.fallbackPrice

    const changeAbs = current - price7
    const changePercent = price7 > 0 ? (changeAbs / price7) * 100 : 0
    const impact = changeAbs * card.quantity

    totalValue += current * card.quantity
    value7Ago += price7 * card.quantity
    value30Ago += price30 * card.quantity

    rows.push({
      cardId: card.cardId,
      finish: card.finish,
      name: card.name,
      set: card.set,
      number: card.number,
      rarity: card.rarity,
      image: card.image,
      quantity: card.quantity,
      price7: round(price7),
      current: round(current),
      changeAbs: round(changeAbs),
      changePercent: round(changePercent, 1),
      impact: round(impact),
      currentValue: round(current * card.quantity),
      hasHistory,
    })
  }

  // Only cards with real price history can have a measured "this week" move.
  const measurable = rows.filter((r) => r.hasHistory)
  const moved = measurable.filter((r) => r.changeAbs !== 0)

  const gainers = [...moved]
    .filter((r) => r.changeAbs > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 50)
  const losers = [...moved]
    .filter((r) => r.changeAbs < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 50)

  // Contribution: ranked by dollars added/removed from the collection.
  const gainContrib = [...moved]
    .filter((r) => r.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 25)
  const lossContrib = [...moved]
    .filter((r) => r.impact < 0)
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 25)

  // Winners vs losers — breadth of the move, not just the extremes.
  const winners = measurable.filter((r) => r.changeAbs > 0)
  const decliners = measurable.filter((r) => r.changeAbs < 0)
  const flat = measurable.filter((r) => r.changeAbs === 0)
  const avgGain =
    winners.length > 0
      ? winners.reduce((a, r) => a + r.changePercent, 0) / winners.length
      : 0
  const avgLoss =
    decliners.length > 0
      ? decliners.reduce((a, r) => a + r.changePercent, 0) / decliners.length
      : 0

  const biggestGainer = gainContrib[0] ?? null
  const biggestLoser = lossContrib[0] ?? null

  // ---- Collection value trend over the selected window --------------------
  const trendStart = isoDay(trendDays)
  const daySet = new Set<string>()
  for (const s of series.values()) {
    for (const point of s) {
      if (point.day >= trendStart && point.day <= today) daySet.add(point.day)
    }
  }
  const trendDaysList = Array.from(daySet).sort()
  const costBasis = round(
    Array.from(owned.values()).reduce((a, c) => a + c.costTotal, 0),
  )
  const trend = trendDaysList.map((day) => {
    let value = 0
    for (const card of owned.values()) {
      const s = series.get(`${card.cardId}|${card.finish}`) ?? []
      const price = s.length > 0 ? priceAsOf(s, day) : card.fallbackPrice
      value += (price ?? card.fallbackPrice) * card.quantity
    }
    return { day: dayLabel(day), iso: day, value: round(value), costBasis }
  })

  // ---- Set-level analytics ------------------------------------------------
  type SetAgg = {
    name: string
    owned: number
    value: number
    value7Ago: number
    gainers: number
    losers: number
    pcts: number[]
  }
  const setMap = new Map<string, SetAgg>()
  for (const r of rows) {
    const name = r.set || "Unknown set"
    const agg =
      setMap.get(name) ??
      ({
        name,
        owned: 0,
        value: 0,
        value7Ago: 0,
        gainers: 0,
        losers: 0,
        pcts: [],
      } as SetAgg)
    agg.owned += r.quantity
    agg.value += r.currentValue
    agg.value7Ago += r.price7 * r.quantity
    if (r.hasHistory) {
      if (r.changeAbs > 0) agg.gainers += 1
      else if (r.changeAbs < 0) agg.losers += 1
      agg.pcts.push(r.changePercent)
    }
    setMap.set(name, agg)
  }

  const sets = Array.from(setMap.values()).map((s) => {
    const weeklyChange = s.value - s.value7Ago
    return {
      name: s.name,
      owned: s.owned,
      value: round(s.value),
      weeklyChange: round(weeklyChange),
      weeklyChangePercent: round(
        s.value7Ago > 0 ? (weeklyChange / s.value7Ago) * 100 : 0,
        1,
      ),
      avgCardMovement: round(
        s.pcts.length > 0
          ? s.pcts.reduce((a, b) => a + b, 0) / s.pcts.length
          : 0,
        1,
      ),
      volatility: round(stddev(s.pcts), 1),
      gainers: s.gainers,
      losers: s.losers,
    }
  })

  const movedSets = sets.filter((s) => s.weeklyChange !== 0)
  const change7d = totalValue - value7Ago
  const change30d = totalValue - value30Ago

  return NextResponse.json({
    trendDays,
    overview: {
      totalValue: round(totalValue),
      change7d: round(change7d),
      change7dPercent: round(value7Ago > 0 ? (change7d / value7Ago) * 100 : 0, 1),
      change30d: round(change30d),
      change30dPercent: round(
        value30Ago > 0 ? (change30d / value30Ago) * 100 : 0,
        1,
      ),
      cardsTracked: measurable.length,
      totalUnits: rows.reduce((a, r) => a + r.quantity, 0),
      cardsMovedThisWeek: moved.length,
      biggestGainer,
      biggestLoser,
      costBasis,
    },
    trend,
    movers: { gainers, losers },
    contribution: { gainers: gainContrib, losers: lossContrib },
    winnersLosers: {
      up: winners.length,
      down: decliners.length,
      unchanged: flat.length,
      avgGainPercent: round(avgGain, 1),
      avgLossPercent: round(avgLoss, 1),
    },
    sets: {
      best: [...movedSets]
        .sort((a, b) => b.weeklyChangePercent - a.weeklyChangePercent)
        .slice(0, 8),
      worst: [...movedSets]
        .sort((a, b) => a.weeklyChangePercent - b.weeklyChangePercent)
        .slice(0, 8),
      mostValuable: [...sets].sort((a, b) => b.value - a.value).slice(0, 8),
      mostVolatile: [...sets]
        .filter((s) => s.volatility > 0)
        .sort((a, b) => b.volatility - a.volatility)
        .slice(0, 8),
    },
  })
}
