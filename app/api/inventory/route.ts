import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

type InventoryJson = Record<string, unknown>

function normalizeInventoryItem(
  item: InventoryJson,
): InventoryJson & { finish: string; quantitySold: number } {
  return {
    ...item,
    finish:
      typeof item.finish === "string" && item.finish ? item.finish : "Normal",
    quantitySold: typeof item.quantitySold === "number" ? item.quantitySold : 0,
  }
}

export async function GET() {
  const rows = await supabaseTable("inventory_items", {
    select: "item",
    order: "created_at.desc",
  })

  return NextResponse.json(
    rows.map((row: { item: unknown }) =>
      normalizeInventoryItem(row.item as Record<string, unknown>),
    ),
  )
}

export async function POST(request: Request) {
  const item = await request.json().catch(() => null)

  if (!item?.id || !item?.cardId) {
    return NextResponse.json(
      { error: "Invalid inventory item" },
      { status: 400 },
    )
  }

  const createdAt = item.createdAt ? new Date(item.createdAt) : new Date()
  const updatedAt = item.updatedAt ? new Date(item.updatedAt) : createdAt
  const normalizedItem = normalizeInventoryItem(item)

  try {
    await supabaseTable("inventory_items", {
      method: "POST",
      body: {
        id: String(normalizedItem.id),
        card_id: String(normalizedItem.cardId),
        item: normalizedItem,
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      },
      onConflict: "id",
    })
  } catch (error) {
    console.error("Inventory POST failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown inventory error",
      },
      { status: 500 },
    )
  }

  return NextResponse.json(normalizedItem, { status: 201 })
}

export async function PUT(request: Request) {
  const item = await request.json().catch(() => null)

  if (!item?.id || !item?.cardId) {
    return NextResponse.json(
      { error: "Invalid inventory item" },
      { status: 400 },
    )
  }

  const normalizedItem = normalizeInventoryItem(item)
  const updatedAt = new Date().toISOString()

  try {
    await supabaseTable("inventory_items", {
      method: "PATCH",
      body: {
        card_id: String(normalizedItem.cardId),
        item: normalizedItem,
        updated_at: updatedAt,
      },
      filters: [`id=eq.${String(normalizedItem.id)}`],
    })
  } catch (error) {
    console.error("Inventory PUT failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown inventory error",
      },
      { status: 500 },
    )
  }

  return NextResponse.json(normalizedItem)
}
