import { NextResponse } from "next/server"

import { captureDailySnapshots } from "@/lib/price-snapshots"

// Always run on request — never serve a cached response to the scheduler.
export const dynamic = "force-dynamic"

/**
 * Server-side daily price snapshot.
 *
 * Reads the stored inventory and records one market-value reading per card +
 * finish for today, inserting only rows not already captured today.
 *
 * The scheduled daily-snapshot function runs the same capture directly; this
 * route is for manual/external triggers, so it is NOT tied to a signed-in user
 * or subscription plan.
 *
 * It feeds shared market-price history in card_price_snapshots.
 */

const SNAPSHOT_SECRET = process.env.ANALYTICS_SNAPSHOT_SECRET

export async function GET(request: Request) {
  /**
   * Protect this scheduled/internal endpoint
   * from being triggered publicly.
   *
   * Callers must send:
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
    const result = await captureDailySnapshots()

    return NextResponse.json({
      ok: true,
      ...result,
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
