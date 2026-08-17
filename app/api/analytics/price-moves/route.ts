import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { requireFeature } from "@/lib/subscription-server"

/**
 * Weekly price movement per card + finish.
 *
 * Turns the daily price-snapshot history into a simple "up / down / flat over
 * the last week" reading for every tracked card, keyed by `${cardId}|${finish}`
 * so any page (the binders view in particular) can show whether a card's market
 * value is trending up or down without recomputing the history itself.
 *
 * The comparison is anchored to each card's most recent reading, not to the
 * wall-clock date: current = latest reading, baseline = the last reading on or
 * before (latest − 7 days). This keeps the "this week" delta meaningful even if
 * the newest snapshot is a day or two old.
 */

type SnapshotRow = {
  card_id: string
  finish: string | null
  market_price: number | string
  captured_on: string
}

type Reading = { date: string; price: number }

type Move = {
  last: number
  prev: number
  change: number
  changePercent: number
  direction: "up" | "down" | "flat"
  spanDays: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_DAYS = 45 // enough to always contain a reading ~7 days back

function daysAgoIsoDate(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)
}

function shiftIso(isoDate: string, deltaDays: number) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + deltaDays * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

function daySpan(fromIso: string, toIso: string) {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) /
      DAY_MS,
  )
}

export async function GET() {
  const gate = await requireFeature(
    (e) => e.canUseAnalytics,
    "Price movement analytics",
    "premium",
  )

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const rows = (await supabaseTable("card_price_snapshots", {
      select: "card_id,finish,market_price,captured_on",
      filters: [`captured_on=gte.${daysAgoIsoDate(HISTORY_DAYS)}`],
      order: "captured_on.asc",
      limit: 100000,
    }).catch(() => [])) as SnapshotRow[]

    // Group readings by card + finish (rows already ascending by date).
    const series = new Map<string, Reading[]>()
    for (const row of rows || []) {
      const price = Number(row.market_price)
      if (!Number.isFinite(price) || price <= 0) continue
      const finish =
        typeof row.finish === "string" && row.finish ? row.finish : "Normal"
      const key = `${row.card_id}|${finish}`
      const list = series.get(key) ?? []
      list.push({ date: row.captured_on, price })
      series.set(key, list)
    }

    const moves: Record<string, Move> = {}
    let up = 0
    let down = 0
    let flat = 0

    for (const [key, readings] of series) {
      if (readings.length < 2) continue

      const latest = readings[readings.length - 1]
      const baselineDate = shiftIso(latest.date, -7)

      // Last reading on or before the baseline date; fall back to the earliest
      // reading so cards with under a week of history still get a comparison.
      let baseline: Reading | null = null
      for (const r of readings) {
        if (r.date <= baselineDate) baseline = r
        else break
      }
      if (!baseline) baseline = readings[0]
      if (baseline.date === latest.date) continue

      const change = latest.price - baseline.price
      const changePercent =
        baseline.price > 0 ? (change / baseline.price) * 100 : 0
      const direction: Move["direction"] =
        change > 0.001 ? "up" : change < -0.001 ? "down" : "flat"

      if (direction === "up") up += 1
      else if (direction === "down") down += 1
      else flat += 1

      moves[key] = {
        last: Number(latest.price.toFixed(2)),
        prev: Number(baseline.price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(1)),
        direction,
        spanDays: daySpan(baseline.date, latest.date),
      }
    }

    return NextResponse.json({
      asOf: rows && rows.length ? rows[rows.length - 1].captured_on : null,
      tracked: Object.keys(moves).length,
      up,
      down,
      flat,
      moves,
    })
  } catch (error) {
    console.error("Weekly price-moves computation failed", error)
    return NextResponse.json({
      asOf: null,
      tracked: 0,
      up: 0,
      down: 0,
      flat: 0,
      moves: {},
    })
  }
}
