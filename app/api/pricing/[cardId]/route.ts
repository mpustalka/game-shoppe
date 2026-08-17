import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { resolveEntitlements } from "@/lib/subscription-server"

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      cardId: string
    }>
  },
) {
  const { user } = await resolveEntitlements()

  if (!user) {
    return NextResponse.json(
      {
        error: "Not signed in",
        code: "auth_required",
      },
      {
        status: 401,
      },
    )
  }

  const { cardId } = await params

  if (!cardId || !cardId.trim()) {
    return NextResponse.json(
      {
        error: "Card ID is required",
      },
      {
        status: 400,
      },
    )
  }

  try {
    // Check cached pricing first.
    const existing = await supabaseTable("card_prices", {
      select: "*",
      filters: [`card_id=eq.${cardId}`],
      limit: 1,
    })

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(existing[0])
    }

    // No cached price yet.
    // This can later be replaced by a live lookup or scraper.
    return NextResponse.json({
      cardId,
      marketPrice: null,
      source: null,
      needsLookup: true,
    })
  } catch (error) {
    console.error("Pricing lookup failed:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Pricing lookup failed",
      },
      {
        status: 500,
      },
    )
  }
}
