import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { resolveEntitlements } from "@/lib/subscription-server"

type IncomingSnapshot = {
  cardId?: unknown
  cardName?: unknown
  setName?: unknown
  finish?: unknown
  marketPrice?: unknown
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Records one market-value reading per card + finish per day. The client sends
 * the current inventory; we insert only the cards not already captured today,
 * so repeated visits in a single day are no-ops and price history accrues once
 * per day. This is what powers the "price movers" view over time.
 */
export async function POST(request: Request) {
  // Price snapshot collection is available to all signed-in users.
  // Analytics viewing can still remain Premium-only.
  const { user } = await resolveEntitlements()

  if (!user) {
    return NextResponse.json(
      {
        error: "Not signed in",
        code: "auth_required",
      },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => null)

  const incoming: IncomingSnapshot[] = Array.isArray(body?.snapshots)
    ? body.snapshots
    : []

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

  for (const snap of incoming) {
    const cardId = typeof snap.cardId === "string" ? snap.cardId : ""
    const price = Number(snap.marketPrice)
    if (!cardId || !Number.isFinite(price) || price <= 0) continue

    const finish =
      typeof snap.finish === "string" && snap.finish ? snap.finish : "Normal"
    const key = `${cardId}|${finish}`
    const existing = deduped.get(key)
    if (existing && existing.market_price >= price) continue

    deduped.set(key, {
      card_id: cardId,
      card_name: typeof snap.cardName === "string" ? snap.cardName : null,
      set_name: typeof snap.setName === "string" ? snap.setName : null,
      finish,
      market_price: Number(price.toFixed(2)),
    })
  }

  if (deduped.size === 0) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  const captured_on = todayDate()

  try {
    const existingRows = (await supabaseTable("card_price_snapshots", {
      select: "card_id,finish",
      filters: [`captured_on=eq.${captured_on}`],
      limit: 5000,
    })) as Array<{ card_id: string; finish: string }>

    const seen = new Set(
      (existingRows || []).map((row) => `${row.card_id}|${row.finish}`),
    )

    const toInsert = Array.from(deduped.entries())
      .filter(([key]) => !seen.has(key))
      .map(([, value]) => ({ ...value, captured_on }))

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 })
    }

    await supabaseTable("card_price_snapshots", {
      method: "POST",
      body: toInsert,
    })

    return NextResponse.json({ ok: true, inserted: toInsert.length })
  } catch (error) {
    console.error("Price snapshot ingest failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Snapshot ingest failed",
      },
      { status: 500 },
    )
  }
}
