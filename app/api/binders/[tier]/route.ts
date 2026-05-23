import { getDatabase } from "@netlify/database"
import { NextResponse } from "next/server"

const VALID_TIERS = new Set(["budget", "mid", "premium"])

interface RouteContext {
  params: Promise<{ tier: string }>
}

function validateTier(tier: string) {
  return VALID_TIERS.has(tier)
}

type BinderJson = Record<string, unknown>

function normalizeBinderItem(item: BinderJson): BinderJson & { finish: string; quantitySold: number } {
  return {
    ...item,
    finish: typeof item.finish === "string" && item.finish ? item.finish : "Normal",
    quantitySold: typeof item.quantitySold === "number" ? item.quantitySold : 0,
  }
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

  return NextResponse.json(rows.map((row) => normalizeBinderItem(row.item)))
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
  const normalizedItem = normalizeBinderItem(item)
  const db = getDatabase()

  await db.sql`
    INSERT INTO binder_entries (tier, item_id, item, added_at, updated_at)
    VALUES (${tier}, ${String(normalizedItem.id)}, ${JSON.stringify(normalizedItem)}::jsonb, ${now}, ${now})
    ON CONFLICT (tier, item_id) DO UPDATE
    SET item = EXCLUDED.item,
        updated_at = EXCLUDED.updated_at
  `

  return NextResponse.json(normalizedItem, { status: 201 })
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
