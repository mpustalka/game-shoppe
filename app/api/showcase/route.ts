import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { SHOWCASE_CARD_LIMIT } from "@/lib/showcase"
import type { InventoryItem } from "@/lib/types"

export interface ShowcaseRow {
  id: string
  share_token: string
  name: string
  items: InventoryItem[] | null
  created_at: string
  updated_at: string
}

export function rowToShowcase(row: ShowcaseRow) {
  return {
    id: row.id,
    shareToken: row.share_token,
    name: row.name ?? "Showcase",
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// A short, URL-friendly token for the public share link.
function generateShareToken() {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)
}

export async function GET() {
  const rows = (await supabaseTable("showcase_binders", {
    select: "id,share_token,name,items,created_at,updated_at",
    order: "updated_at.desc",
  })) as ShowcaseRow[] | null

  return NextResponse.json((rows ?? []).map(rowToShowcase))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : "Showcase"

  // Allow seeding a new showcase with cards, but never above the limit.
  const items: InventoryItem[] = Array.isArray(body?.items)
    ? body.items.slice(0, SHOWCASE_CARD_LIMIT)
    : []

  const now = new Date().toISOString()
  const row = {
    id: globalThis.crypto.randomUUID(),
    share_token: generateShareToken(),
    name,
    items,
    created_at: now,
    updated_at: now,
  }

  try {
    const inserted = (await supabaseTable("showcase_binders", {
      method: "POST",
      body: row,
    })) as ShowcaseRow[] | null

    const created = Array.isArray(inserted) ? inserted[0] : null
    return NextResponse.json(rowToShowcase(created ?? (row as ShowcaseRow)), {
      status: 201,
    })
  } catch (error) {
    console.error("Showcase POST failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
