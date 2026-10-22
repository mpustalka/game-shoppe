import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { requireFeature } from "@/lib/subscription-server"
import {
  MARKET_CARD_PREFIX,
  snapshotMarketSets,
} from "@/lib/market-prices"

// ---------------------------------------------------------------------------
// Market-wide trends: which cards and sets moved most this week across the
// newest sets, whether or not anyone owns them. Readings come from the daily
// market snapshot (card_id "tcgp-<TCGplayer product id>"); if today's hasn't
// been taken yet, this route takes it first.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000
const CACHE_MS = 15 * 60 * 1000
// Sets are ranked on cards worth at least this much, so bulk commons don't
// swamp the percentage.
const SET_MIN_PRICE = 1

type Row = {
  card_id: string
  card_name: string | null
  set_name: string | null
  finish: string
  market_price: number | string
}

type MarketCard = {
  productId: string
  name: string
  set: string
  finish: string
  first: number
  last: number
  change: number
  changePercent: number
  image: string
  url: string
}

type Computed = {
  fromDay: string
  toDay: string
  cards: MarketCard[]
  current: MarketCard[]
}

// Per-instance cache: the underlying readings only change once a day.
let cache: { key: string; at: number; value: Computed } | null = null

function isoDay(offsetDays = 0) {
  return new Date(Date.now() - offsetDays * DAY_MS).toISOString().slice(0, 10)
}

function round(value: number, places = 2) {
  const f = 10 ** places
  return Math.round(value * f) / f
}

// "Alolan Exeggutor - 002/128" → "Alolan Exeggutor"
function cleanName(name: string | null, fallback: string) {
  return (name || fallback).replace(/\s+-\s+[A-Za-z]*\d+\/\d+$/, "")
}

async function marketDay(order: "asc" | "desc", sinceDay?: string) {
  const rows = (await supabaseTable("card_price_snapshots", {
    select: "captured_on",
    filters: [
      `card_id=like.${MARKET_CARD_PREFIX}*`,
      ...(sinceDay ? [`captured_on=gte.${sinceDay}`] : []),
    ],
    order: `captured_on.${order}`,
    limit: 1,
  })) as Array<{ captured_on: string }>
  return rows[0]?.captured_on ?? null
}

async function marketRows(day: string) {
  return (await supabaseTable("card_price_snapshots", {
    select: "card_id,card_name,set_name,finish,market_price",
    filters: [
      `card_id=like.${MARKET_CARD_PREFIX}*`,
      `captured_on=eq.${day}`,
    ],
    order: "id.asc",
    limit: 20000,
  })) as Row[]
}

function toCard(row: Row, first: number, last: number): MarketCard {
  const productId = row.card_id.slice(MARKET_CARD_PREFIX.length)
  const change = last - first
  return {
    productId,
    name: cleanName(row.card_name, productId),
    set: row.set_name || "",
    finish: row.finish,
    first: round(first),
    last: round(last),
    change: round(change),
    changePercent: first > 0 ? round((change / first) * 100, 1) : 0,
    image: `https://cdn.tcgtracking.com/product/${productId}_200w.jpg`,
    url: `https://www.tcgplayer.com/product/${productId}`,
  }
}

async function compute(): Promise<Computed | null> {
  const today = isoDay(0)

  let toDay = await marketDay("desc")
  if (!toDay || toDay < today) {
    try {
      await snapshotMarketSets()
      toDay = today
    } catch (error) {
      console.error("Market snapshot failed", error)
    }
  }
  if (!toDay) return null

  const fromDay = (await marketDay("asc", isoDay(7))) ?? toDay
  const key = `${fromDay}|${toDay}`
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) {
    return cache.value
  }

  const [latest, earliest] = await Promise.all([
    marketRows(toDay),
    fromDay === toDay ? Promise.resolve([] as Row[]) : marketRows(fromDay),
  ])

  const before = new Map<string, number>()
  for (const row of earliest) {
    before.set(`${row.card_id}|${row.finish}`, Number(row.market_price))
  }

  const cards: MarketCard[] = []
  const current: MarketCard[] = []
  for (const row of latest) {
    const last = Number(row.market_price)
    if (!(last > 0)) continue
    current.push(toCard(row, last, last))
    const first = before.get(`${row.card_id}|${row.finish}`)
    if (first && first > 0) cards.push(toCard(row, first, last))
  }

  const value = { fromDay, toDay, cards, current }
  cache = { key, at: Date.now(), value }
  return value
}

export async function GET(request: Request) {
  const gate = await requireFeature(
    (e) => e.canUseAnalytics,
    "Market trends",
    "premium",
  )
  if (gate instanceof NextResponse) return gate

  const url = new URL(request.url)
  const minMove = Math.max(0, Number(url.searchParams.get("minMove")) || 0)
  // A zero threshold still needs a real move, not rounding noise.
  const threshold = Math.max(minMove, 0.01)

  try {
    const data = await compute()
    if (!data) {
      return NextResponse.json({
        ready: false,
        fromDay: null,
        toDay: null,
        minMove,
        sets: [],
        gainers: [],
        losers: [],
        topValue: [],
        topValueSets: [],
      })
    }

    const ready = data.fromDay !== data.toDay

    const gainers = data.cards
      .filter((card) => card.change >= threshold)
      .sort((a, b) => b.change - a.change || b.changePercent - a.changePercent)
      .slice(0, 12)

    const losers = data.cards
      .filter((card) => card.change <= -threshold)
      .sort((a, b) => a.change - b.change || a.changePercent - b.changePercent)
      .slice(0, 12)

    // Value-weighted set movement across cards worth SET_MIN_PRICE+.
    const setAgg = new Map<
      string,
      { name: string; first: number; last: number; up: number; down: number; cards: number }
    >()
    for (const card of data.cards) {
      if (card.first < SET_MIN_PRICE) continue
      const agg =
        setAgg.get(card.set) ??
        { name: card.set, first: 0, last: 0, up: 0, down: 0, cards: 0 }
      agg.first += card.first
      agg.last += card.last
      agg.cards += 1
      if (card.change >= threshold) agg.up += 1
      if (card.change <= -threshold) agg.down += 1
      setAgg.set(card.set, agg)
    }
    const sets = Array.from(setAgg.values())
      .filter((set) => set.first > 0)
      .map((set) => ({
        name: set.name,
        cards: set.cards,
        up: set.up,
        down: set.down,
        change: round(set.last - set.first),
        changePercent: round(((set.last - set.first) / set.first) * 100, 1),
      }))
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 3)

    // Fallback while only one day of readings exists: what's most valuable now.
    const topValue = [...data.current]
      .sort((a, b) => b.last - a.last)
      .slice(0, 12)

    const valueBySet = new Map<string, { name: string; value: number; cards: number }>()
    for (const card of data.current) {
      const agg = valueBySet.get(card.set) ?? { name: card.set, value: 0, cards: 0 }
      agg.value += card.last
      agg.cards += 1
      valueBySet.set(card.set, agg)
    }
    const topValueSets = Array.from(valueBySet.values())
      .map((set) => ({ ...set, value: round(set.value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)

    return NextResponse.json({
      ready,
      fromDay: data.fromDay,
      toDay: data.toDay,
      minMove,
      sets,
      gainers,
      losers,
      topValue,
      topValueSets,
    })
  } catch (error) {
    console.error("Market trends failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Market trends failed" },
      { status: 500 },
    )
  }
}
