import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

/**
 * Server-side daily price snapshot.
 *
 * Reads the stored inventory and records one market-value reading per card +
 * finish for today, inserting only rows not already captured today. Unlike the
 * client-driven snapshot on the Analytics page (which fires when an employee
 * opens it), this runs unattended via a scheduled Netlify Function, so price
 * history keeps accruing every day even when nobody opens the page. That is
 * what guarantees the "price movers" and "insights" views have a second day of
 * readings to compare against.
 *
 * This read is deliberately NOT scoped to a user. It runs unattended with no
 * session, and it feeds card_price_snapshots — shared market-price history,
 * keyed by card rather than by owner. It reads every account's inventory only to
 * decide which cards are worth pricing; no per-user data is written or exposed.
 */

type StoredItem = {
  cardId?: unknown
  finish?: unknown
  marketValue?: unknown
  price?: unknown
  card?: { name?: unknown; set?: { name?: unknown } }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function marketValueOf(item: StoredItem): number {
  const market = Number(item.marketValue)
  if (Number.isFinite(market) && market > 0) return market
  const price = Number(item.price)
  return Number.isFinite(price) && price > 0 ? price : 0
}

export async function GET() {
  try {
    const rows = (await supabaseTable("inventory_items", {
      select: "item",
      limit: 20000,
    })) as Array<{ item: StoredItem }>

    // Collapse to one row per card+finish, keeping the highest observed price.
    const deduped = new Map<
      string,
      {
        card_id: string
        card_name: string | null
        set_name: string | null
        finish: string
        market_price: number
      }
    >()

    for (const row of rows || []) {
      const item = row?.item
      if (!item) continue
      const cardId = typeof item.cardId === "string" ? item.cardId : ""
      const price = marketValueOf(item)
      if (!cardId || price <= 0) continue

      const finish =
        typeof item.finish === "string" && item.finish ? item.finish : "Normal"
      const key = `${cardId}|${finish}`
      const existing = deduped.get(key)
      if (existing && existing.market_price >= price) continue

      const cardName =
        item.card && typeof item.card.name === "string" ? item.card.name : null
      const setName =
        item.card &&
        item.card.set &&
        typeof item.card.set.name === "string"
          ? item.card.set.name
          : null

      deduped.set(key, {
        card_id: cardId,
        card_name: cardName,
        set_name: setName,
        finish,
        market_price: Number(price.toFixed(2)),
      })
    }

    if (deduped.size === 0) {
      return NextResponse.json({ ok: true, inserted: 0, tracked: 0 })
    }

    const captured_on = todayDate()

    const existingRows = (await supabaseTable("card_price_snapshots", {
      select: "card_id,finish",
      filters: [`captured_on=eq.${captured_on}`],
      limit: 50000,
    })) as Array<{ card_id: string; finish: string }>

    const seen = new Set(
      (existingRows || []).map((r) => `${r.card_id}|${r.finish}`),
    )

    const toInsert = Array.from(deduped.entries())
      .filter(([key]) => !seen.has(key))
      .map(([, value]) => ({ ...value, captured_on }))

    if (toInsert.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        tracked: deduped.size,
      })
    }

    await supabaseTable("card_price_snapshots", {
      method: "POST",
      body: toInsert,
    })

    return NextResponse.json({
      ok: true,
      inserted: toInsert.length,
      tracked: deduped.size,
    })
  } catch (error) {
    console.error("Daily snapshot failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Daily snapshot failed",
      },
      { status: 500 },
    )
  }
}
