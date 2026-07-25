import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { requireFeature } from "@/lib/subscription-server"
import {
  resolveDataScope,
  scopeFilters,
  ownerStamp,
  pendingSetupResponse,
} from "@/lib/user-scope"

type InventoryJson = Record<string, unknown>

function normalizeInventoryItem(
  item: InventoryJson,
): InventoryJson & { finish: string; quantitySold: number } {
  return {
    ...item,
    finish:
      typeof item.finish === "string" && item.finish ? item.finish : "Normal",
    quantitySold: typeof item.quantitySold === "number" ? item.quantitySold : 0,
  }
}

export async function GET() {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope

  // A post-launch account with ownership not yet in place owns nothing.
  if (scope.mode === "isolated") return NextResponse.json([])

  const rows = await supabaseTable("inventory_items", {
    select: "item",
    filters: scopeFilters(scope),
    order: "created_at.desc",
  })

  return NextResponse.json(
    rows.map((row: { item: unknown }) =>
      normalizeInventoryItem(row.item as Record<string, unknown>),
    ),
  )
}

export async function POST(request: Request) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope
  if (scope.mode === "isolated") return pendingSetupResponse()

  // Trial accounts can't create inventory rows (covers Add Card and Import).
  const gate = await requireFeature((e) => e.canAddCards, "Adding cards")
  if (gate instanceof NextResponse) return gate

  const item = await request.json().catch(() => null)

  if (!item?.id || !item?.cardId) {
    return NextResponse.json(
      { error: "Invalid inventory item" },
      { status: 400 },
    )
  }

  const createdAt = item.createdAt ? new Date(item.createdAt) : new Date()
  const updatedAt = item.updatedAt ? new Date(item.updatedAt) : createdAt
  const normalizedItem = normalizeInventoryItem(item)

  try {
    await supabaseTable("inventory_items", {
      method: "POST",
      body: {
        id: String(normalizedItem.id),
        ...ownerStamp(scope),
        card_id: String(normalizedItem.cardId),
        item: normalizedItem,
        language: normalizedItem.language ?? "en",
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      },
      onConflict: "id",
    })
  } catch (error) {
    console.error("Inventory POST failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown inventory error",
      },
      { status: 500 },
    )
  }

  return NextResponse.json(normalizedItem, { status: 201 })
}

export async function PUT(request: Request) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope
  if (scope.mode === "isolated") return pendingSetupResponse()

  const item = await request.json().catch(() => null)

  if (!item?.id || !item?.cardId) {
    return NextResponse.json(
      { error: "Invalid inventory item" },
      { status: 400 },
    )
  }

  const normalizedItem = normalizeInventoryItem(item)
  const updatedAt = new Date().toISOString()

  try {
    await supabaseTable("inventory_items", {
      method: "PATCH",
      body: {
        card_id: String(normalizedItem.cardId),
        item: normalizedItem,
        language: normalizedItem.language ?? "en",
        updated_at: updatedAt,
      },
      // Scoped to the owner as well as the id, so one account can never
      // overwrite another's row by guessing its id.
      filters: [`id=eq.${String(normalizedItem.id)}`, ...scopeFilters(scope)],
    })
  } catch (error) {
    console.error("Inventory PUT failed", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown inventory error",
      },
      { status: 500 },
    )
  }

  return NextResponse.json(normalizedItem)
}
