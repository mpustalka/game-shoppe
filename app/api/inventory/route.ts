import { getDatabase } from "@netlify/database"
import { NextResponse } from "next/server"

export async function GET() {
  const db = getDatabase()
  const rows = await db.sql`
    SELECT item
    FROM inventory_items
    ORDER BY created_at DESC
  `

  return NextResponse.json(rows.map((row) => row.item))
}

export async function POST(request: Request) {
  const item = await request.json().catch(() => null)

  if (!item?.id || !item?.cardId) {
    return NextResponse.json({ error: "Invalid inventory item" }, { status: 400 })
  }

  const createdAt = item.createdAt ? new Date(item.createdAt) : new Date()
  const updatedAt = item.updatedAt ? new Date(item.updatedAt) : createdAt
  const db = getDatabase()

  await db.sql`
    INSERT INTO inventory_items (id, card_id, item, created_at, updated_at)
    VALUES (${item.id}, ${item.cardId}, ${JSON.stringify(item)}::jsonb, ${createdAt.toISOString()}, ${updatedAt.toISOString()})
    ON CONFLICT (id) DO UPDATE
    SET card_id = EXCLUDED.card_id,
        item = EXCLUDED.item,
        updated_at = EXCLUDED.updated_at
  `

  return NextResponse.json(item, { status: 201 })
}
