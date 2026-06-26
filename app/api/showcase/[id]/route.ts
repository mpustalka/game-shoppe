import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { SHOWCASE_CARD_LIMIT } from "@/lib/showcase"
import type { InventoryItem } from "@/lib/types"
import { rowToShowcase, type ShowcaseRow } from "../route"

interface RouteContext {
  params: Promise<{ id: string }>
}

async function fetchShowcase(id: string): Promise<ShowcaseRow | null> {
  const rows = (await supabaseTable("showcase_binders", {
    select: "id,share_token,name,items,created_at,updated_at",
    filters: [`id=eq.${id}`],
    limit: 1,
  })) as ShowcaseRow[] | null

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const row = await fetchShowcase(id)

  if (!row) {
    return NextResponse.json({ error: "Showcase not found" }, { status: 404 })
  }

  return NextResponse.json(rowToShowcase(row))
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params
  const body = await request.json().catch(() => null)

  const existing = await fetchShowcase(id)
  if (!existing) {
    return NextResponse.json({ error: "Showcase not found" }, { status: 404 })
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body?.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 120)
  }

  if (Array.isArray(body?.items)) {
    const items = body.items as InventoryItem[]
    // Enforce the 50-card limit server-side. The paid upgrade beyond this is
    // planned but not implemented, so anything over the cap is rejected.
    if (items.length > SHOWCASE_CARD_LIMIT) {
      return NextResponse.json(
        {
          error: `This showcase is limited to ${SHOWCASE_CARD_LIMIT} cards.`,
          limit: SHOWCASE_CARD_LIMIT,
        },
        { status: 422 },
      )
    }
    patch.items = items
  }

  try {
    const updated = (await supabaseTable("showcase_binders", {
      method: "PATCH",
      filters: [`id=eq.${id}`],
      body: patch,
    })) as ShowcaseRow[] | null

    const row = Array.isArray(updated) ? updated[0] : null
    return NextResponse.json(rowToShowcase(row ?? existing))
  } catch (error) {
    console.error("Showcase PATCH failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    await supabaseTable("showcase_binders", {
      method: "DELETE",
      filters: [`id=eq.${id}`],
    })
  } catch (error) {
    console.error("Showcase DELETE failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
