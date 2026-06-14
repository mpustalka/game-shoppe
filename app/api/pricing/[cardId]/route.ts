import { NextResponse } from "next/server"
import { supabaseTable } from "@/lib/supabase"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params

  try {
    // Check cache first
    const existing = await supabaseTable("card_prices", {
      filters: [`card_id=eq.${cardId}`],
    })

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(existing[0])
    }

    // Placeholder until scraper is added
    return NextResponse.json({
      cardId,
      marketPrice: null,
      source: null,
      needsLookup: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Pricing lookup failed",
      },
      { status: 500 },
    )
  }
}
