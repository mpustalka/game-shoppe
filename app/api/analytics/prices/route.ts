import { NextResponse } from "next/server"

import {
  recordPriceSnapshots,
  type SnapshotInput,
} from "@/lib/price-snapshots"
import { resolveEntitlements } from "@/lib/subscription-server"

type IncomingSnapshot = {
  cardId?: unknown
  cardName?: unknown
  setName?: unknown
  finish?: unknown
  marketPrice?: unknown
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

  const snapshots: SnapshotInput[] = incoming.map((snap) => ({
    card_id: typeof snap.cardId === "string" ? snap.cardId : "",
    card_name: typeof snap.cardName === "string" ? snap.cardName : null,
    set_name: typeof snap.setName === "string" ? snap.setName : null,
    finish:
      typeof snap.finish === "string" && snap.finish ? snap.finish : "Normal",
    market_price: Number(snap.marketPrice) || 0,
  }))

  try {
    const inserted = await recordPriceSnapshots(snapshots)
    return NextResponse.json({ ok: true, inserted })
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
