import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params
  const patch = await request.json().catch(() => null)

  if (!patch || typeof patch !== "object") {
    return NextResponse.json(
      { error: "Invalid inventory update" },
      { status: 400 },
    )
  }

  const rows = await supabaseTable("inventory_items", {
    select: "item",
    filters: [`id=eq.${id}`],
    limit: 1,
  })

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Inventory item not found" },
      { status: 404 },
    )
  }

  const existing = rows[0]?.item as Record<string, unknown>
  const updatedAt = new Date().toISOString()
  const item = { ...existing, finish: "Normal", ...patch, updatedAt }

  try {
    await supabaseTable("inventory_items", {
      method: "PATCH",
      filters: [`id=eq.${id}`],
      body: {
        card_id: String(item.cardId || existing.cardId || ""),
        item,
        updated_at: updatedAt,
      },
    })
  } catch (error) {
    console.error("Inventory PATCH failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown inventory error",
      },
      { status: 500 },
    )
  }

  return NextResponse.json(item)
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params
  await supabaseTable("binder_entries", {
    method: "DELETE",
    filters: [`item_id=eq.${id}`],
  })
  await supabaseTable("inventory_items", {
    method: "DELETE",
    filters: [`id=eq.${id}`],
  })

  return NextResponse.json({ ok: true })
}
