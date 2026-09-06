import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import {
  resolveDataScope,
  scopeFilters,
} from "@/lib/user-scope"

type OwnershipSummaryRow = {
  card_id?: unknown
  set_id?: unknown
  quantity?: unknown
}

function parsePositiveQuantity(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value)
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed)
    }
  }

  // Older inventory JSON should represent an owned row even if quantity was
  // not explicitly stored.
  return 1
}

function normalizeLanguage(value: string | null): string | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()

  if (normalized === "en") return "en"
  if (normalized === "ja") return "ja"

  // Chinese support can use either a generic or script-specific code.
  if (
    normalized === "zh" ||
    normalized === "zh-cn" ||
    normalized === "zh-tw"
  ) {
    return normalized
  }

  return null
}

export async function GET(request: Request) {
  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  if (scope.mode === "isolated") {
    return NextResponse.json({
      bySet: {},
      items: [],
    })
  }

  const { searchParams } = new URL(request.url)
  const setId = searchParams.get("setId")?.trim() || null
  const language = normalizeLanguage(searchParams.get("language"))

  const filters = [...scopeFilters(scope)]

  if (language) {
    filters.push(`language=eq.${encodeURIComponent(language)}`)
  }

  try {
    /**
     * Set-detail mode
     * ----------------
     * A card grid needs the actual inventory variants for only the set being
     * viewed. This is dramatically smaller than loading the user's complete
     * inventory on every set page.
     */
    if (setId) {
      // Pokemon TCG card IDs are `${set.id}-${card.number}`.
      filters.push(`card_id=like.${encodeURIComponent(`${setId}-%`)}`)

      const rows = await supabaseTable("inventory_items", {
        select: "item",
        filters,
        order: "created_at.desc",
        // A single set should never approach this in normal use, while still
        // allowing multiple conditions / finishes / copies per card.
        limit: 5000,
      })

      const items = rows
  .map((row: { item?: unknown }) => row.item)
  .filter(
    (item: unknown): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object",
  )
  .filter((item: Record<string, unknown>) => {
    const quantity = parsePositiveQuantity(item.quantity)
    return quantity > 0
  })
  .map((item: Record<string, unknown>) => ({
    ...item,
    finish:
      typeof item.finish === "string" && item.finish
        ? item.finish
        : "Normal",
    quantitySold:
      typeof item.quantitySold === "number"
        ? item.quantitySold
        : 0,
  }))

      return NextResponse.json(
        { items },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      )
    }

    /**
     * Set-catalog mode
     * ----------------
     * Only retrieve the tiny pieces required to calculate unique-card
     * completion counts. Do not send complete inventory/card/image JSON to the
     * browser.
     */
    const rows = (await supabaseTable("inventory_items", {
      select:
        "card_id,set_id:item->card->set->>id,quantity:item->>quantity",
      filters,
      limit: 10000,
    })) as OwnershipSummaryRow[]

    const uniqueCardsBySet = new Map<string, Set<string>>()

    for (const row of rows) {
      const cardId =
        typeof row.card_id === "string" ? row.card_id : ""
      const setIdValue =
        typeof row.set_id === "string" ? row.set_id : ""

      if (!cardId || !setIdValue) continue
      if (parsePositiveQuantity(row.quantity) <= 0) continue

      const ownedCards =
        uniqueCardsBySet.get(setIdValue) ?? new Set<string>()

      ownedCards.add(cardId)
      uniqueCardsBySet.set(setIdValue, ownedCards)
    }

    const bySet = Object.fromEntries(
      Array.from(uniqueCardsBySet.entries()).map(
        ([ownedSetId, cardIds]) => [ownedSetId, cardIds.size],
      ),
    )

    return NextResponse.json(
      { bySet },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    )
  } catch (error) {
    console.error("Inventory ownership GET failed:", error)

    return NextResponse.json(
      { error: "Failed to load inventory ownership" },
      { status: 500 },
    )
  }
}