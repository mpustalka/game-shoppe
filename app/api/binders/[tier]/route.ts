import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import {
  resolveDataScope,
  scopeFilters,
  ownerStamp,
  pendingSetupResponse,
} from "@/lib/user-scope"

const VALID_TIERS = new Set(["budget", "mid", "premium"])

interface RouteContext {
  params: Promise<{ tier: string }>
}

function validateTier(tier: string) {
  return VALID_TIERS.has(tier)
}

type BinderJson = Record<string, unknown>

function normalizeBinderItem(
  item: BinderJson,
): BinderJson & { finish: string; quantitySold: number } {
  return {
    ...item,
    finish:
      typeof item.finish === "string" && item.finish ? item.finish : "Normal",
    quantitySold: typeof item.quantitySold === "number" ? item.quantitySold : 0,
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope

  const { tier } = await params

  if (!validateTier(tier)) {
    return NextResponse.json({ error: "Invalid binder tier" }, { status: 400 })
  }

  // A post-launch account with ownership not yet in place owns no binders.
  if (scope.mode === "isolated") return NextResponse.json([])

  const language = new URL(_request.url).searchParams.get("language") ?? "en"

  const rows = await supabaseTable("binder_entries", {
    select: "item",
    filters: [
      ...scopeFilters(scope),
      `tier=eq.${tier}`,
      `language=eq.${language}`,
    ],
    order: "added_at.desc",
  })

  return NextResponse.json(
    rows.map((row: { item: unknown }) =>
      normalizeBinderItem(row.item as Record<string, unknown>),
    ),
  )
}

export async function POST(request: Request, { params }: RouteContext) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope
  if (scope.mode === "isolated") return pendingSetupResponse()

  const { tier } = await params
  const item = await request.json().catch(() => null)

  if (!validateTier(tier)) {
    return NextResponse.json({ error: "Invalid binder tier" }, { status: 400 })
  }

  if (!item?.id) {
    return NextResponse.json({ error: "Invalid binder item" }, { status: 400 })
  }

  const language = item.language === "ja" ? "ja" : "en"

  const now = new Date().toISOString()
  const normalizedItem = normalizeBinderItem(item)

  await supabaseTable("binder_entries", {
    method: "POST",
    body: {
      ...ownerStamp(scope),
      tier,
      language,
      item_id: String(normalizedItem.id),
      item: normalizedItem,
      added_at: now,
      updated_at: now,
    },
    // Pre-migration the user_id column doesn't exist, so the upsert target has
    // to match whichever uniqueness rule is actually in place.
    onConflict:
      scope.mode === "owned"
        ? "user_id,tier,language,item_id"
        : "tier,language,item_id",
  })

  return NextResponse.json(normalizedItem, { status: 201 })
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope
  if (scope.mode === "isolated") return NextResponse.json({ ok: true })

  const { tier } = await params
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get("itemId")

  if (!validateTier(tier)) {
    return NextResponse.json({ error: "Invalid binder tier" }, { status: 400 })
  }

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 })
  }

  const language = searchParams.get("language") ?? "en"

  await supabaseTable("binder_entries", {
    method: "DELETE",
    filters: [
      ...scopeFilters(scope),
      `tier=eq.${tier}`,
      `language=eq.${language}`,
      `item_id=eq.${itemId}`,
    ],
  })

  return NextResponse.json({ ok: true })
}
