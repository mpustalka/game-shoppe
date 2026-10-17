import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import {
  resolveDataScope,
  scopeFilters,
  ownerStamp,
  tenantScopeRequiredResponse,
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
): BinderJson & {
  finish: string
  quantitySold: number
} {
  return {
    ...item,
    finish:
      typeof item.finish === "string" && item.finish
        ? item.finish
        : "Normal",
    quantitySold:
      typeof item.quantitySold === "number"
        ? item.quantitySold
        : 0,
  }
}

/* =========================================================
 * GET
 * ======================================================= */

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  const tenantError =
    tenantScopeRequiredResponse(scope)

  if (tenantError) {
    return tenantError
  }

  const { tier } = await params

  if (!validateTier(tier)) {
    return NextResponse.json(
      {
        error: "Invalid binder tier",
      },
      {
        status: 400,
      },
    )
  }

  const language =
    new URL(request.url).searchParams.get("language") ??
    "en"

  try {
    const rows = await supabaseTable(
      "binder_entries",
      {
        select: "item",

        filters: [
          ...scopeFilters(scope),
          `tier=eq.${tier}`,
          `language=eq.${language}`,
        ],

        order: "added_at.desc",
      },
    )

    return NextResponse.json(
      rows.map(
        (row: { item: unknown }) =>
          normalizeBinderItem(
            row.item as Record<string, unknown>,
          ),
      ),
    )
  } catch (error) {
    console.error(
      "Binder GET failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load binder",
      },
      {
        status: 500,
      },
    )
  }
}

/* =========================================================
 * POST
 * ======================================================= */

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  const tenantError =
    tenantScopeRequiredResponse(scope)

  if (tenantError) {
    return tenantError
  }

  const { tier } = await params

  if (!validateTier(tier)) {
    return NextResponse.json(
      {
        error: "Invalid binder tier",
      },
      {
        status: 400,
      },
    )
  }

  const item = await request
    .json()
    .catch(() => null)

  if (!item?.id) {
    return NextResponse.json(
      {
        error: "Invalid binder item",
      },
      {
        status: 400,
      },
    )
  }

  const language =
    item.language === "ja"
      ? "ja"
      : "en"

  const now = new Date().toISOString()

  const normalizedItem =
    normalizeBinderItem(item)

  /*
   * Ownership is now determined entirely by DataScope:
   *
   * Individual:
   *   user_id    = authenticated user
   *   company_id = null
   *
   * Business:
   *   user_id    = null
   *   company_id = active company
   */
  const ownership = ownerStamp(scope)

  try {
    /*
     * Do not use the legacy ownership-based onConflict logic.
     *
     * Individual and business binder entries now have different
     * ownership dimensions. We first look for an existing entry
     * belonging to THIS tenant.
     */
    const existing = await supabaseTable(
      "binder_entries",
      {
        select: "item_id",

        filters: [
          ...scopeFilters(scope),
          `tier=eq.${tier}`,
          `language=eq.${language}`,
          `item_id=eq.${String(
            normalizedItem.id,
          )}`,
        ],

        limit: 1,
      },
    )

    if (
      Array.isArray(existing) &&
      existing.length > 0
    ) {
      /*
       * The card is already in this tenant's binder.
       * Update the stored snapshot instead of creating
       * a duplicate row.
       */
      await supabaseTable(
        "binder_entries",
        {
          method: "PATCH",

          filters: [
            ...scopeFilters(scope),
            `tier=eq.${tier}`,
            `language=eq.${language}`,
            `item_id=eq.${String(
              normalizedItem.id,
            )}`,
          ],

          body: {
            item: normalizedItem,
            updated_at: now,
          },
        },
      )
    } else {
      await supabaseTable(
        "binder_entries",
        {
          method: "POST",

          body: {
            ...ownership,

            tier,
            language,

            item_id: String(
              normalizedItem.id,
            ),

            item: normalizedItem,

            added_at: now,
            updated_at: now,
          },
        },
      )
    }
  } catch (error) {
    console.error(
      "Binder POST failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add card to binder",
      },
      {
        status: 500,
      },
    )
  }

  return NextResponse.json(
    normalizedItem,
    {
      status: 201,
    },
  )
}

/* =========================================================
 * DELETE
 * ======================================================= */

export async function DELETE(
  request: Request,
  { params }: RouteContext,
) {
  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  const tenantError =
    tenantScopeRequiredResponse(scope)

  if (tenantError) {
    return tenantError
  }

  const { tier } = await params

  if (!validateTier(tier)) {
    return NextResponse.json(
      {
        error: "Invalid binder tier",
      },
      {
        status: 400,
      },
    )
  }

  const { searchParams } =
    new URL(request.url)

  const itemId =
    searchParams.get("itemId")

  if (!itemId) {
    return NextResponse.json(
      {
        error: "Missing itemId",
      },
      {
        status: 400,
      },
    )
  }

  const language =
    searchParams.get("language") ??
    "en"

  try {
    await supabaseTable(
      "binder_entries",
      {
        method: "DELETE",

        filters: [
          ...scopeFilters(scope),
          `tier=eq.${tier}`,
          `language=eq.${language}`,
          `item_id=eq.${itemId}`,
        ],
      },
    )
  } catch (error) {
    console.error(
      "Binder DELETE failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove card from binder",
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