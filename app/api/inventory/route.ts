import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { requireFeature } from "@/lib/subscription-server"
import {
  resolveDataScope,
  scopeFilters,
  ownerStamp,
  tenantScopeRequiredResponse,
} from "@/lib/user-scope"

type InventoryJson = Record<string, unknown>

function normalizeInventoryItem(
  item: InventoryJson,
): InventoryJson & {
  finish: string
  quantitySold: number
} {
  return {
    ...item,

    finish:
      typeof item.finish === "string" &&
      item.finish
        ? item.finish
        : "Normal",

    quantitySold:
      typeof item.quantitySold === "number"
        ? item.quantitySold
        : 0,
  }
}

/**
 * GET /api/inventory
 *
 * Individual collector:
 *   user_id = authenticated user
 *   company_id IS NULL
 *
 * Business:
 *   company_id = active company membership
 *   user_id IS NULL
 *
 * Super Admin:
 *   Normal inventory access is blocked unless we later create
 *   an explicit company/tenant context.
 */
export async function GET() {
  console.log("Inventory GET started")

  const scope =
    await resolveDataScope()

  console.log(
    "Inventory scope:",
    scope,
  )

  if (
    scope instanceof NextResponse
  ) {
    return scope
  }

  const tenantGate =
    tenantScopeRequiredResponse(
      scope,
    )

  if (tenantGate) {
    console.log(
      "Inventory blocked: explicit tenant context required",
    )

    return tenantGate
  }

  const filters =
    scopeFilters(scope)

  console.log(
    "Inventory filters:",
    filters,
  )

  try {
    const rows =
      await supabaseTable(
        "inventory_items",
        {
          select: "item",

          filters,

          order:
            "created_at.desc",

          limit: 10000,
        },
      )

    console.log(
      "Inventory rows:",
      rows.length,
    )

    return NextResponse.json(
      rows.map(
        (row: {
          item: unknown
        }) =>
          normalizeInventoryItem(
            row.item as Record<
              string,
              unknown
            >,
          ),
      ),
    )
  } catch (error) {
    console.error(
      "Inventory GET failed",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch inventory",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * POST /api/inventory
 *
 * Creates inventory under the resolved owner.
 *
 * Individual:
 *   user_id    = user UUID
 *   company_id = NULL
 *
 * Business:
 *   user_id    = NULL
 *   company_id = company UUID
 */
export async function POST(
  request: Request,
) {
  const scope =
    await resolveDataScope()

  if (
    scope instanceof NextResponse
  ) {
    return scope
  }

  const tenantGate =
    tenantScopeRequiredResponse(
      scope,
    )

  if (tenantGate) {
    return tenantGate
  }

  /*
   * Keep the existing subscription feature gate.
   *
   * We will make subscription-server.ts business-plan-aware
   * separately. Tenant ownership should not bypass the
   * application's existing feature checks.
   */
  const gate =
    await requireFeature(
      (e) => e.canAddCards,
      "Adding cards",
    )

  if (
    gate instanceof NextResponse
  ) {
    return gate
  }

  const item =
    await request
      .json()
      .catch(() => null)

  if (
    !item?.id ||
    !item?.cardId
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid inventory item",
      },
      {
        status: 400,
      },
    )
  }

  const createdAt =
    item.createdAt
      ? new Date(
          item.createdAt,
        )
      : new Date()

  const updatedAt =
    item.updatedAt
      ? new Date(
          item.updatedAt,
        )
      : createdAt

  if (
    Number.isNaN(
      createdAt.getTime(),
    ) ||
    Number.isNaN(
      updatedAt.getTime(),
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid inventory date",
      },
      {
        status: 400,
      },
    )
  }

  const normalizedItem =
    normalizeInventoryItem(
      item,
    )

  const ownership =
    ownerStamp(scope)

  console.log(
    "Inventory POST ownership:",
    ownership,
  )

  try {
    await supabaseTable(
      "inventory_items",
      {
        method: "POST",

        body: {
          id: String(
            normalizedItem.id,
          ),

          ...ownership,

          card_id: String(
            normalizedItem.cardId,
          ),

          item:
            normalizedItem,

          language:
            normalizedItem.language ??
            "en",

          created_at:
            createdAt.toISOString(),

          updated_at:
            updatedAt.toISOString(),
        },

        onConflict: "id",
      },
    )
  } catch (error) {
    console.error(
      "Inventory POST failed",
    )

    console.error(error)

    if (
      error instanceof Error
    ) {
      console.error(
        error.message,
      )

      console.error(
        error.stack,
      )
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
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

/**
 * PUT /api/inventory
 *
 * Updating requires BOTH:
 *
 *   id = requested inventory id
 *
 * AND the resolved ownership filter.
 *
 * Therefore knowing another tenant's inventory UUID does not
 * give permission to modify it.
 */
export async function PUT(
  request: Request,
) {
  const scope =
    await resolveDataScope()

  if (
    scope instanceof NextResponse
  ) {
    return scope
  }

  const tenantGate =
    tenantScopeRequiredResponse(
      scope,
    )

  if (tenantGate) {
    return tenantGate
  }

  const item =
    await request
      .json()
      .catch(() => null)

  if (
    !item?.id ||
    !item?.cardId
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid inventory item",
      },
      {
        status: 400,
      },
    )
  }

  const normalizedItem =
    normalizeInventoryItem(
      item,
    )

  const updatedAt =
    new Date().toISOString()

  const filters = [
    `id=eq.${String(
      normalizedItem.id,
    )}`,

    ...scopeFilters(scope),
  ]

  console.log(
    "Inventory PUT filters:",
    filters,
  )

  try {
    await supabaseTable(
      "inventory_items",
      {
        method: "PATCH",

        body: {
          card_id: String(
            normalizedItem.cardId,
          ),

          item:
            normalizedItem,

          language:
            normalizedItem.language ??
            "en",

          updated_at:
            updatedAt,
        },

        filters,
      },
    )
  } catch (error) {
    console.error(
      "Inventory PUT failed",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown inventory error",
      },
      {
        status: 500,
      },
    )
  }

  return NextResponse.json(
    normalizedItem,
  )
}
