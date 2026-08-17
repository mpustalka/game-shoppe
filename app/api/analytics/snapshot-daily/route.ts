import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

/**
 * Server-side daily price snapshot.
 *
 * Reads the stored inventory and records one market-value reading per card +
 * finish for today, inserting only rows not already captured today.
 *
 * This route is designed to run unattended from a scheduled Netlify function,
 * so it is NOT tied to a signed-in user or subscription plan.
 *
 * It feeds shared market-price history in card_price_snapshots.
 */

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

const SNAPSHOT_SECRET = process.env.ANALYTICS_SNAPSHOT_SECRET

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function marketValueOf(item: StoredItem): number {
  const market = Number(item.marketValue)

  if (Number.isFinite(market) && market > 0) {
    return market
  }

  const price = Number(item.price)

  return Number.isFinite(price) && price > 0 ? price : 0
}

export async function GET(request: Request) {
  /**
   * Protect this scheduled/internal endpoint
   * from being triggered publicly.
   *
   * Netlify should call it with:
   *
   * Authorization: Bearer YOUR_SECRET
   */
  if (SNAPSHOT_SECRET) {
    const authHeader = request.headers.get("authorization")

    if (authHeader !== `Bearer ${SNAPSHOT_SECRET}`) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }
  }

  try {
    const rows = (await supabaseTable("inventory_items", {
      select: "item",
      limit: 20000,
    })) as Array<{
      item: StoredItem
    }>

    /**
     * Collapse inventory to one row per
     * card + finish.
     *
     * If multiple accounts own the same
     * card/finish, keep the highest observed
     * market price.
     */
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

      if (!item) {
        continue
      }

      const cardId = typeof item.cardId === "string" ? item.cardId : ""

      const price = marketValueOf(item)

      if (!cardId || price <= 0) {
        continue
      }

      const finish =
        typeof item.finish === "string" && item.finish ? item.finish : "Normal"

      const key = `${cardId}|${finish}`

      const existing = deduped.get(key)

      if (existing && existing.market_price >= price) {
        continue
      }

      const cardName =
        item.card && typeof item.card.name === "string" ? item.card.name : null

      const setName =
        item.card && item.card.set && typeof item.card.set.name === "string"
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
      return NextResponse.json({
        ok: true,
        inserted: 0,
        tracked: 0,
      })
    }

    const captured_on = todayDate()

    /**
     * Find snapshots that already exist today
     * so we don't insert duplicates.
     */
    const existingRows = (await supabaseTable("card_price_snapshots", {
      select: "card_id,finish",

      filters: [`captured_on=eq.${captured_on}`],

      limit: 50000,
    })) as Array<{
      card_id: string
      finish: string
    }>

    const seen = new Set(
      (existingRows || []).map((row) => `${row.card_id}|${row.finish}`),
    )

    const toInsert = Array.from(deduped.entries())
      .filter(([key]) => !seen.has(key))
      .map(([, value]) => ({
        ...value,
        captured_on,
      }))

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
        error: error instanceof Error ? error.message : "Daily snapshot failed",
      },
      {
        status: 500,
      },
    )
  }
}
