import { getDatabase } from "@netlify/database"
import { NextResponse } from "next/server"

const VALID_TIERS = new Set(["budget", "mid", "premium"])

interface RouteContext {
  params: Promise<{ tier: string }>
}

function validateTier(tier: string) {
  return VALID_TIERS.has(tier)
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { tier } = await params

  if (!validateTier(tier)) {
    return NextResponse.json({ error: "Invalid binder tier" }, { status: 400 })
  }

  const db = getDatabase()
  const rows = await db.sql`
    SELECT item
    FROM binder_entries
    WHERE tier = ${tier}
    ORDER BY added_at DESC
  `

  return NextResponse.json(rows.map((row) => row.item))
}

export async function POST(request: Request, { params }: RouteContext) {
  const { tier } = await params
  const item = await request.json().catch(() => null)

  if (!validateTier(tier)) {
    return NextResponse.json({ error: "Invalid binder tier" }, { status: 400 })
  }

  if (!item?.id) {
    return NextResponse.json({ error: "Invalid binder item" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const db = getDatabase()

  await db.sql`
    INSERT INTO binder_entries (tier, item_id, item, added_at, updated_at)
    VALUES (${tier}, ${item.id}, ${JSON.stringify(item)}::jsonb, ${now}, ${now})
    ON CONFLICT (tier, item_id) DO UPDATE
    SET item = EXCLUDED.item,
        updated_at = EXCLUDED.updated_at
  `

  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { tier } = await params
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get("itemId")

  if (!validateTier(tier)) {
    return NextResponse.json({ error: "Invalid binder tier" }, { status: 400 })
  }

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 })
  }

  const db = getDatabase()
  await db.sql`
    DELETE FROM binder_entries
    WHERE tier = ${tier} AND item_id = ${itemId}
  `

  return NextResponse.json({ ok: true })
}
