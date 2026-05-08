import { NextRequest, NextResponse } from "next/server"
import { syncItemToSquare, isSquareConfigured } from "@/lib/square"
import type { InventoryItem } from "@/lib/types"

export async function POST(request: NextRequest) {
  // Check if Square is configured
  if (!isSquareConfigured()) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Square is not configured. Please add SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, and SQUARE_LOCATION_ID environment variables." 
      },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { item } = body as { item: InventoryItem }

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Missing inventory item" },
        { status: 400 }
      )
    }

    const result = await syncItemToSquare(item)

    if (result.success) {
      return NextResponse.json({
        success: true,
        itemId: result.itemId,
        variationId: result.variationId,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Square sync error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to sync with Square" },
      { status: 500 }
    )
  }
}
