import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { SHOWCASE_CARD_LIMIT } from "@/lib/showcase"

import {
  resolveDataScope,
  scopeFilters,
  type DataScope,
} from "@/lib/user-scope"

import { requireFeature } from "@/lib/subscription-server"

import type { InventoryItem } from "@/lib/types"

import { rowToShowcase, type ShowcaseRow } from "../route"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

async function fetchShowcase(
  id: string,
  scope: DataScope,
): Promise<ShowcaseRow | null> {
  if (scope.mode === "isolated") {
    return null
  }

  const rows = (await supabaseTable("showcase_binders", {
    select: "id,share_token,name,items,created_at,updated_at",

    filters: [`id=eq.${id}`, ...scopeFilters(scope)],

    limit: 1,
  })) as ShowcaseRow[] | null

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const gate = await requireFeature(
    (e) => e.canUseShowcase,
    "Showcase",
    "premium",
  )

  if (gate instanceof NextResponse) {
    return gate
  }

  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  const { id } = await params

  const row = await fetchShowcase(id, scope)

  if (!row) {
    return NextResponse.json(
      {
        error: "Showcase not found",
      },
      {
        status: 404,
      },
    )
  }

  return NextResponse.json(rowToShowcase(row))
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const gate = await requireFeature(
    (e) => e.canUseShowcase,
    "Showcase",
    "premium",
  )

  if (gate instanceof NextResponse) {
    return gate
  }

  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  const { id } = await params

  const body = await request.json().catch(() => null)

  const existing = await fetchShowcase(id, scope)

  if (!existing) {
    return NextResponse.json(
      {
        error: "Showcase not found",
      },
      {
        status: 404,
      },
    )
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body?.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 120)
  }

  if (Array.isArray(body?.items)) {
    const items = body.items as InventoryItem[]

    if (items.length > SHOWCASE_CARD_LIMIT) {
      return NextResponse.json(
        {
          error: `This showcase is limited to ${SHOWCASE_CARD_LIMIT} cards.`,

          limit: SHOWCASE_CARD_LIMIT,
        },
        {
          status: 422,
        },
      )
    }

    patch.items = items
  }

  try {
    const updated = (await supabaseTable("showcase_binders", {
      method: "PATCH",

      filters: [`id=eq.${id}`, ...scopeFilters(scope)],

      body: patch,
    })) as ShowcaseRow[] | null

    const row = Array.isArray(updated) ? updated[0] : null

    if (!row) {
      return NextResponse.json(
        { error: "Showcase update failed" },
        { status: 500 },
      )
    }

    return NextResponse.json(rowToShowcase(row))
  } catch (error) {
    console.error("Showcase PATCH failed", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const gate = await requireFeature(
    (e) => e.canUseShowcase,
    "Showcase",
    "premium",
  )

  if (gate instanceof NextResponse) {
    return gate
  }

  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  if (scope.mode === "isolated") {
    return NextResponse.json({
      ok: true,
    })
  }

  const { id } = await params
  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Showcase id is required" },
      { status: 400 },
    )
  }

  try {
    await supabaseTable("showcase_binders", {
      method: "DELETE",

      filters: [`id=eq.${id}`, ...scopeFilters(scope)],
    })
  } catch (error) {
    console.error("Showcase DELETE failed", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    )
  }

  return NextResponse.json({
    ok: true,
  })
}
