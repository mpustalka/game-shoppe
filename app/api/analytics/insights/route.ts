import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

/**
 * Smart insights / alerts derived from the daily price-snapshot history.
 *
 * Turns the raw snapshot table into the kind of watchlist signals that make the
 * analytics page feel "smart" rather than static:
 *   - cards up more than 10% this week
 *   - cards down more than 10% this week
 *   - cards on a run of consecutive weekly gains
 *   - cards moving unusually versus their own normal week-to-week trend
 *
 * Everything is computed on the server from snapshots already being captured, so
 * no new tables are required. Each signal needs a little history before it can
 * appear, so the route also reports how much history exists for the UI to show
 * an honest "filling in" state until then.
 */

type SnapshotRow = {
  card_id: string
  card_name: string | null
  set_name: string | null
  finish: string
  market_price: number
  captured_on: string
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const HISTORY_DAYS = 120

function daysAgoIsoDate(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

// Stable, contiguous weekly bucket index for a YYYY-MM-DD date.
function weekIndex(isoDate: string) {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / WEEK_MS)
}

type Series = {
  cardId: string
  name: string
  set: string
  finish: string
  readings: Array<{ date: string; price: number }>
}

function buildSeries(rows: SnapshotRow[]) {
  const map = new Map<string, Series>()
  for (const row of rows) {
    const price = Number(row.market_price)
    if (!Number.isFinite(price) || price <= 0) continue
    const key = `${row.card_id}|${row.finish}`
    const entry =
      map.get(key) ??
      ({
        cardId: row.card_id,
        name: row.card_name || row.card_id,
        set: row.set_name || "",
        finish: row.finish,
        readings: [],
      } satisfies Series)
    entry.readings.push({ date: row.captured_on, price })
    map.set(key, entry)
  }
  // Rows arrive ascending, but sort defensively so first/last are reliable.
  for (const series of map.values()) {
    series.readings.sort((a, b) => a.date.localeCompare(b.date))
  }
  return map
}

// One representative price per week: the latest reading within that week.
function weeklyPrices(readings: Array<{ date: string; price: number }>) {
  const byWeek = new Map<number, { date: string; price: number }>()
  for (const r of readings) {
    const wk = weekIndex(r.date)
    const existing = byWeek.get(wk)
    if (!existing || r.date >= existing.date) byWeek.set(wk, r)
  }
  return Array.from(byWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value.price)
}

export async function GET() {
  try {
    const rows = (await supabaseTable("card_price_snapshots", {
      select: "card_id,card_name,set_name,finish,market_price,captured_on",
      filters: [`captured_on=gte.${daysAgoIsoDate(HISTORY_DAYS)}`],
      order: "captured_on.asc",
      limit: 50000,
    }).catch(() => [])) as SnapshotRow[]

    const series = buildSeries(rows || [])

    const distinctDays = new Set((rows || []).map((r) => r.captured_on))
    const distinctWeeks = new Set(
      (rows || []).map((r) => weekIndex(r.captured_on)),
    )

    const weekAgo = daysAgoIsoDate(7)

    const bigGainers: Array<Record<string, unknown>> = []
    const bigDrops: Array<Record<string, unknown>> = []
    const gainStreaks: Array<Record<string, unknown>> = []
    const unusual: Array<Record<string, unknown>> = []

    for (const s of series.values()) {
      // --- This-week movers: first reading in the last 7 days vs the latest ---
      const window = s.readings.filter((r) => r.date >= weekAgo)
      if (window.length >= 2) {
        const first = window[0].price
        const last = window[window.length - 1].price
        if (first >= 0.5 && first > 0) {
          const change = last - first
          const changePercent = (change / first) * 100
          if (changePercent >= 10) {
            bigGainers.push({
              cardId: s.cardId,
              name: s.name,
              set: s.set,
              finish: s.finish,
              first: Number(first.toFixed(2)),
              last: Number(last.toFixed(2)),
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(1)),
            })
          } else if (changePercent <= -10) {
            bigDrops.push({
              cardId: s.cardId,
              name: s.name,
              set: s.set,
              finish: s.finish,
              first: Number(first.toFixed(2)),
              last: Number(last.toFixed(2)),
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(1)),
            })
          }
        }
      }

      // --- Weekly-based signals: streaks and unusual movement ---
      const weekly = weeklyPrices(s.readings)
      if (weekly.length >= 2) {
        const returns: number[] = []
        for (let i = 1; i < weekly.length; i++) {
          const prev = weekly[i - 1]
          if (prev > 0) returns.push((weekly[i] - prev) / prev)
        }

        // Consecutive weeks of gains: count the trailing run of positive weeks.
        let streak = 0
        for (let i = returns.length - 1; i >= 0; i--) {
          if (returns[i] > 0) streak++
          else break
        }
        if (streak >= 3) {
          const startPrice = weekly[weekly.length - 1 - streak]
          const endPrice = weekly[weekly.length - 1]
          gainStreaks.push({
            cardId: s.cardId,
            name: s.name,
            set: s.set,
            finish: s.finish,
            weeks: streak,
            last: Number(endPrice.toFixed(2)),
            changePercent:
              startPrice > 0
                ? Number((((endPrice - startPrice) / startPrice) * 100).toFixed(1))
                : 0,
          })
        }

        // Unusual movement: latest weekly return vs this card's own normal
        // volatility. Needs enough weeks to have a meaningful baseline.
        if (returns.length >= 4) {
          const history = returns.slice(0, -1)
          const latest = returns[returns.length - 1]
          const mean =
            history.reduce((sum, r) => sum + r, 0) / history.length
          const variance =
            history.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
            history.length
          const std = Math.sqrt(variance)
          if (std > 0.005) {
            const z = (latest - mean) / std
            if (Math.abs(z) >= 2) {
              unusual.push({
                cardId: s.cardId,
                name: s.name,
                set: s.set,
                finish: s.finish,
                last: Number(weekly[weekly.length - 1].toFixed(2)),
                changePercent: Number((latest * 100).toFixed(1)),
                z: Number(z.toFixed(1)),
                direction: latest >= 0 ? "up" : "down",
              })
            }
          }
        }
      }
    }

    bigGainers.sort(
      (a, b) => (b.changePercent as number) - (a.changePercent as number),
    )
    bigDrops.sort(
      (a, b) => (a.changePercent as number) - (b.changePercent as number),
    )
    gainStreaks.sort((a, b) => (b.weeks as number) - (a.weeks as number))
    unusual.sort(
      (a, b) => Math.abs(b.z as number) - Math.abs(a.z as number),
    )

    return NextResponse.json({
      trackedCards: series.size,
      daysTracked: distinctDays.size,
      weeksTracked: distinctWeeks.size,
      threshold: 10,
      bigGainers: bigGainers.slice(0, 12),
      bigDrops: bigDrops.slice(0, 12),
      gainStreaks: gainStreaks.slice(0, 12),
      unusual: unusual.slice(0, 12),
    })
  } catch (error) {
    console.error("Insights computation failed", error)
    return NextResponse.json({
      trackedCards: 0,
      daysTracked: 0,
      weeksTracked: 0,
      threshold: 10,
      bigGainers: [],
      bigDrops: [],
      gainStreaks: [],
      unusual: [],
    })
  }
}
