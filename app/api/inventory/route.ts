import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { requireFeature } from "@/lib/subscription-server"
import {
  scopeFilters,
  ownerStamp,
} from "@/lib/user-scope"
import { resolveInventoryScope } from "@/lib/inventory-scope"

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

// Card fields stored with each item that no inventory screen displays
// (gameplay text, legalities, evolution data). They make up most of each
// stored item, so list responses leave them out; the full card stays in the
// database, and item edits merge server-side so nothing is lost.
const UNUSED_CARD_FIELDS = [
  "attacks",
  "abilities",
  "flavorText",
  "legalities",
  "weaknesses",
  "resistances",
  "retreatCost",
  "convertedRetreatCost",
  "rules",
  "evolvesFrom",
  "evolvesTo",
  "nationalPokedexNumbers",
]

function slimInventoryItem(item: InventoryJson): InventoryJson {
  const card = item.card

  if (!card || typeof card !== "object") {
    return item
  }

  const slimCard = {
    ...(card as Record<string, unknown>),
  }

  for (const field of UNUSED_CARD_FIELDS) {
    delete slimCard[field]
  }

  if (slimCard.set && typeof slimCard.set === "object") {
    const { legalities: _legalities, ...set } =
      slimCard.set as Record<string, unknown>
    slimCard.set = set
  }

  return {
    ...item,
    card: slimCard,
  }
}

const MAX_PAGE_SIZE = 1000

/**
 * GET /api/inventory?limit=500&offset=0
 *
 * Returns one page of the account's inventory, newest first. Callers page
 * through with `offset` until a page comes back shorter than `limit`.
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
 *   Their own personal inventory, or the company they selected on
 *   /admin/inventory (see resolveInventoryScope).
 */
export async function GET(request: Request) {
  const scope =
    await resolveInventoryScope()

  if (
    scope instanceof NextResponse
  ) {
    return scope
  }

  const url = new URL(request.url)

  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number(url.searchParams.get("limit")) || MAX_PAGE_SIZE,
    ),
  )

  const offset = Math.max(
    0,
    Math.floor(Number(url.searchParams.get("offset")) || 0),
  )

  try {
    const rows =
      await supabaseTable(
        "inventory_items",
        {
          select: "item",

          filters: [
            ...scopeFilters(scope),
            `offset=${offset}`,
          ],

          // id breaks ties so pages never overlap or skip rows.
          order:
            "created_at.desc,id.desc",

          limit,
        },
      )

    return NextResponse.json(
      rows.map(
        (row: {
          item: unknown
        }) =>
          slimInventoryItem(
            normalizeInventoryItem(
              row.item as Record<
                string,
                unknown
              >,
            ),
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
    await resolveInventoryScope()

  if (
    scope instanceof NextResponse
  ) {
    return scope
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
    await resolveInventoryScope()

  if (
    scope instanceof NextResponse
  ) {
    return scope
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
