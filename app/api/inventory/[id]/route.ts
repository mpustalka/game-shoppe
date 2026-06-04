import { getDatabase } from "@netlify/database"
import { NextResponse } from "next/server"

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

  const db = getDatabase()
  const rows = await db.sql`
    SELECT item
    FROM inventory_items
    WHERE id = ${id}
    LIMIT 1
  `

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Inventory item not found" },
      { status: 404 },
    )
  }

  const existing = rows[0].item as Record<string, unknown>
  const updatedAt = new Date().toISOString()
  const item = { ...existing, finish: "Normal", ...patch, updatedAt }

  await db.sql`
  UPDATE inventory_items
  SET
    card_id = ${String(item.cardId || existing.cardId)},

    item = ${JSON.stringify(item)}::jsonb,

    condition = ${String(item.condition || "")},

    finish = ${String(item.finish || "Normal")},

    variant = ${item.variant || null},

    price = ${Number(item.price || 0)},

    purchase_price = ${Number(item.purchasePrice || 0)},

    market_value = ${Number(item.marketValue || item.price || 0)},

    quantity = ${Number(item.quantity || 0)},

    quantity_sold = ${Number(item.quantitySold || 0)},

    updated_at = ${updatedAt}

  WHERE id = ${id}
`

  return NextResponse.json(item)
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const db = getDatabase()

  await db.sql`DELETE FROM binder_entries WHERE item_id = ${id}`
  await db.sql`DELETE FROM inventory_items WHERE id = ${id}`

  return NextResponse.json({ ok: true })
}
