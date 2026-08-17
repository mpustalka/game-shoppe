import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { SHOWCASE_CARD_LIMIT } from "@/lib/showcase"

import {
  resolveDataScope,
  scopeFilters,
  ownerStamp,
  pendingSetupResponse,
} from "@/lib/user-scope"

import { requireFeature } from "@/lib/subscription-server"

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

function generateShareToken() {
  const raw =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return raw.replace(/-/g, "").slice(0, 12)
}

const id =
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `showcase-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export async function GET() {
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
    return NextResponse.json([])
  }

  try {
    const rows = (await supabaseTable("showcase_binders", {
      select: "id,share_token,name,items,created_at,updated_at",

      filters: scopeFilters(scope),

      order: "updated_at.desc",
    })) as ShowcaseRow[] | null

    return NextResponse.json((rows ?? []).map(rowToShowcase))
  } catch (error) {
    console.error("Showcase GET failed", error)

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

export async function POST(request: Request) {
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
    return pendingSetupResponse()
  }

  const body = await request.json().catch(() => null)

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : "Showcase"

  const items: InventoryItem[] = Array.isArray(body?.items) ? body.items : []

  if (items.length > SHOWCASE_CARD_LIMIT) {
    return NextResponse.json(
      {
        error: `A showcase is limited to ${SHOWCASE_CARD_LIMIT} cards.`,
        limit: SHOWCASE_CARD_LIMIT,
      },
      { status: 422 },
    )
  }

  const now = new Date().toISOString()

  const row = {
    id: globalThis.crypto.randomUUID(),

    ...ownerStamp(scope),

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
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    )
  }
}
