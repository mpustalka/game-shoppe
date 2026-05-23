import { getDatabase } from "@netlify/database"
import { NextResponse } from "next/server"

type InventoryJson = Record<string, unknown>

function normalizeInventoryItem(item: InventoryJson): InventoryJson & { finish: string; quantitySold: number } {
  return {
    ...item,
    finish: typeof item.finish === "string" && item.finish ? item.finish : "Normal",
    quantitySold: typeof item.quantitySold === "number" ? item.quantitySold : 0,
  }
}

export async function GET() {
  const db = getDatabase()
  const rows = await db.sql`
    SELECT item
    FROM inventory_items
    ORDER BY created_at DESC
  `

  return NextResponse.json(rows.map((row) => normalizeInventoryItem(row.item)))
}

export async function POST(request: Request) {
  const item = await request.json().catch(() => null)

  if (!item?.id || !item?.cardId) {
    return NextResponse.json({ error: "Invalid inventory item" }, { status: 400 })
  }

  const createdAt = item.createdAt ? new Date(item.createdAt) : new Date()
  const updatedAt = item.updatedAt ? new Date(item.updatedAt) : createdAt
  const normalizedItem = normalizeInventoryItem(item)
  const db = getDatabase()

  await db.sql`
    INSERT INTO inventory_items (id, card_id, item, condition, finish, price, quantity, quantity_sold, created_at, updated_at)
    VALUES (
      ${String(normalizedItem.id)},
      ${String(normalizedItem.cardId)},
      ${JSON.stringify(normalizedItem)}::jsonb,
      ${String(normalizedItem.condition || "")},
      ${String(normalizedItem.finish)},
      ${Number(normalizedItem.price || 0)},
      ${Number(normalizedItem.quantity || 0)},
      ${Number(normalizedItem.quantitySold || 0)},
      ${createdAt.toISOString()},
      ${updatedAt.toISOString()}
    )
    ON CONFLICT (id) DO UPDATE
    SET card_id = EXCLUDED.card_id,
        item = EXCLUDED.item,
        condition = EXCLUDED.condition,
        finish = EXCLUDED.finish,
        price = EXCLUDED.price,
        quantity = EXCLUDED.quantity,
        quantity_sold = EXCLUDED.quantity_sold,
        updated_at = EXCLUDED.updated_at
  `

  return NextResponse.json(normalizedItem, { status: 201 })
}
