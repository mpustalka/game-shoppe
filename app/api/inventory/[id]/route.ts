import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { resolveDataScope, scopeFilters } from "@/lib/user-scope"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await params

  if (scope.mode === "isolated") {
    return NextResponse.json(
      { error: "Inventory item not found" },
      { status: 404 },
    )
  }

  try {
    const rows = await supabaseTable("inventory_items", {
      select: "item",
      filters: [`id=eq.${id}`, ...scopeFilters(scope)],
      limit: 1,
    })

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 },
      )
    }

    const item = rows[0]?.item as Record<string, unknown> | undefined

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ...item,
      finish:
        typeof item.finish === "string" && item.finish
          ? item.finish
          : "Normal",
      quantitySold:
        typeof item.quantitySold === "number"
          ? item.quantitySold
          : 0,
    })
  } catch (error) {
    console.error("Inventory GET by id failed", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown inventory error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await params
  const patch = await request.json().catch(() => null)

  if (!patch || typeof patch !== "object") {
    return NextResponse.json(
      { error: "Invalid inventory update" },
      { status: 400 },
    )
  }

  if (scope.mode === "isolated") {
    return NextResponse.json(
      { error: "Inventory item not found" },
      { status: 404 },
    )
  }

  const rows = await supabaseTable("inventory_items", {
    select: "item",
    filters: [`id=eq.${id}`, ...scopeFilters(scope)],
    limit: 1,
  })

  // Also covers "exists, but belongs to someone else" — reported as 404 rather
  // than 403 so ids owned by other accounts aren't discoverable.
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Inventory item not found" },
      { status: 404 },
    )
  }

  const existing = rows[0]?.item as Record<string, unknown>
  const updatedAt = new Date().toISOString()
  const item = { ...existing, finish: "Normal", ...patch, updatedAt }

  try {
    await supabaseTable("inventory_items", {
      method: "PATCH",
      filters: [`id=eq.${id}`, ...scopeFilters(scope)],
      body: {
        card_id: String(item.cardId || existing.cardId || ""),
        item,
        updated_at: updatedAt,
      },
    })
  } catch (error) {
    console.error("Inventory PATCH failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown inventory error",
      },
      { status: 500 },
    )
  }

  return NextResponse.json(item)
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await params

  // Nothing of this account's own exists yet, so there is nothing to delete —
  // and deleting unscoped here would destroy another account's rows.
  if (scope.mode === "isolated") {
    return NextResponse.json(
      { error: "Inventory item not found" },
      { status: 404 },
    )
  }

  // Both deletes are owner-scoped. Without the scope on binder_entries, deleting
  // one item would clear that card from every user's binders.
  await supabaseTable("binder_entries", {
    method: "DELETE",
    filters: [`item_id=eq.${id}`, ...scopeFilters(scope)],
  })
  await supabaseTable("inventory_items", {
    method: "DELETE",
    filters: [`id=eq.${id}`, ...scopeFilters(scope)],
  })

  return NextResponse.json({ ok: true })
}
