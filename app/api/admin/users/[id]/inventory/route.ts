import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type InventoryRow = {
  id: string
  user_id: string | null

  card_id?: string | null
  name?: string | null
  set_name?: string | null
  set_id?: string | null
  number?: string | null

  condition?: string | null
  finish?: string | null
  variant?: string | null
  language?: string | null

  quantity?: number | null
  quantity_sold?: number | null

  price?: number | null
  purchase_price?: number | null
  market_value?: number | null

  notes?: string | null

  image?: string | null
  image_url?: string | null

  created_at?: string | null
  updated_at?: string | null
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function cleanNumber(value: unknown) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * GET /api/admin/users/[id]/inventory
 *
 * Admin-only inventory lookup for ONE selected user.
 *
 * This does NOT use the logged-in user's inventory scope.
 * The selected user's UUID comes directly from the route.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id: rawId } = await params

  const id = rawId?.trim()

  if (!id) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  if (!looksLikeUuid(id)) {
    return NextResponse.json(
      {
        error: "Invalid user id",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const admin = createAdminClient()

    /**
     * Verify the selected Auth user exists first.
     */
    const { data: authData, error: authError } =
      await admin.auth.admin.getUserById(id)

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: authError?.message ?? "User not found",
        },
        {
          status: 404,
        },
      )
    }

    const url = new URL(request.url)

    const search = url.searchParams.get("search")?.trim() ?? ""

    const condition = url.searchParams.get("condition")?.trim() ?? ""

    const finish = url.searchParams.get("finish")?.trim() ?? ""

    const language = url.searchParams.get("language")?.trim() ?? ""

    const limitParam = Number(url.searchParams.get("limit") ?? 200)

    const limit = Math.min(
      500,
      Math.max(1, Number.isFinite(limitParam) ? Math.floor(limitParam) : 200),
    )

    /**
     * -------------------------------------------------
     * QUERY
     * -------------------------------------------------
     */
    let query = admin
      .from("inventory_items")
      .select("*")
      .eq("user_id", id)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit)

    /**
     * Search across common inventory fields.
     *
     * If your schema uses slightly different field names,
     * we can adjust after seeing the actual response.
     */
    if (search) {
      query = query.or(
        [
          `name.ilike.%${search}%`,
          `card_id.ilike.%${search}%`,
          `set_name.ilike.%${search}%`,
          `number.ilike.%${search}%`,
        ].join(","),
      )
    }

    if (condition) {
      query = query.eq("condition", condition)
    }

    if (finish) {
      query = query.eq("finish", finish)
    }

    if (language) {
      query = query.eq("language", language)
    }

    const { data, error } = await query

    if (error) {
      console.error("Admin inventory GET failed:", error)

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      )
    }

    const rows = (data ?? []) as InventoryRow[]

    /**
     * -------------------------------------------------
     * SUMMARY
     * -------------------------------------------------
     */
    const totalQuantity = rows.reduce(
      (sum, item) => sum + cleanNumber(item.quantity),
      0,
    )

    const totalSold = rows.reduce(
      (sum, item) => sum + cleanNumber(item.quantity_sold),
      0,
    )

    const estimatedValue = rows.reduce((sum, item) => {
      const quantity = cleanNumber(item.quantity)

      const value = cleanNumber(item.market_value ?? item.price)

      return sum + quantity * value
    }, 0)

    const totalCost = rows.reduce((sum, item) => {
      const quantity = cleanNumber(item.quantity)

      const cost = cleanNumber(item.purchase_price)

      return sum + quantity * cost
    }, 0)

    return NextResponse.json({
      scope: {
        selectedUserId: id,
        adminUserId: gate.user.id,
      },

      user: {
        id: authData.user.id,
        email: authData.user.email ?? null,
        storeName:
          typeof authData.user.user_metadata?.store_name === "string"
            ? authData.user.user_metadata.store_name
            : null,
      },

      summary: {
        rowCount: rows.length,

        totalQuantity,

        totalSold,

        estimatedValue: Number(estimatedValue.toFixed(2)),

        totalCost: Number(totalCost.toFixed(2)),
      },

      items: rows,
    })
  } catch (error) {
    console.error("Admin selected-user inventory GET failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load user inventory",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * PATCH /api/admin/users/[id]/inventory
 *
 * Admin edit of one inventory item belonging to
 * the selected customer.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  console.log(
    "ADMIN INVENTORY AUTH:",
    gate instanceof NextResponse
      ? {
          blocked: true,
          status: gate.status,
        }
      : {
          blocked: false,
          userId: gate.user.id,
          email: gate.user.email,
        },
  )

  if (gate instanceof NextResponse) {
    return gate
  }

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id: rawId } = await params

  const id = rawId?.trim()

  if (!id || !looksLikeUuid(id)) {
    return NextResponse.json(
      {
        error: "Invalid user id",
      },
      {
        status: 400,
      },
    )
  }

  const body = await request.json().catch(() => null)

  const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : ""

  if (!itemId) {
    return NextResponse.json(
      {
        error: "Inventory item id is required",
      },
      {
        status: 400,
      },
    )
  }

  const allowed: Record<string, unknown> = {}

  if (typeof body?.condition === "string") {
    allowed.condition = body.condition.trim()
  }

  if (typeof body?.finish === "string") {
    allowed.finish = body.finish.trim()
  }

  if (typeof body?.variant === "string") {
    allowed.variant = body.variant.trim()
  }

  if (typeof body?.language === "string") {
    allowed.language = body.language.trim()
  }

  if (typeof body?.notes === "string") {
    allowed.notes = body.notes
  }

  if (body?.quantity !== undefined) {
    const quantity = Number(body.quantity)

    if (!Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json(
        {
          error: "Quantity must be zero or greater",
        },
        {
          status: 400,
        },
      )
    }

    allowed.quantity = Math.floor(quantity)
  }

  if (body?.price !== undefined) {
    const price = Number(body.price)

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          error: "Price must be zero or greater",
        },
        {
          status: 400,
        },
      )
    }

    allowed.price = price
  }

  if (body?.purchasePrice !== undefined) {
    const purchasePrice = Number(body.purchasePrice)

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      return NextResponse.json(
        {
          error: "Purchase price must be zero or greater",
        },
        {
          status: 400,
        },
      )
    }

    allowed.purchase_price = purchasePrice
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json(
      {
        error: "Nothing to update",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const admin = createAdminClient()

    /**
     * CRITICAL:
     *
     * Both id and user_id must match.
     *
     * This prevents the admin UI from accidentally
     * editing an inventory record belonging to some
     * other customer.
     */
    const { data, error } = await admin
      .from("inventory_items")
      .update({
        ...allowed,

        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("user_id", id)
      .select("*")
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Inventory item not found for this user",
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      ok: true,
      item: data,
    })
  } catch (error) {
    console.error("Admin inventory PATCH failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update inventory item",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * DELETE /api/admin/users/[id]/inventory?itemId=...
 *
 * Permanently removes one inventory row from
 * the selected customer's inventory.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id: rawId } = await params

  const id = rawId?.trim()

  if (!id || !looksLikeUuid(id)) {
    return NextResponse.json(
      {
        error: "Invalid user id",
      },
      {
        status: 400,
      },
    )
  }

  const url = new URL(request.url)

  const itemId = url.searchParams.get("itemId")?.trim() ?? ""

  if (!itemId) {
    return NextResponse.json(
      {
        error: "Inventory item id is required",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("inventory_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", id)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Inventory item not found for this user",
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      ok: true,
      deletedId: data.id,
    })
  } catch (error) {
    console.error("Admin inventory DELETE failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete inventory item",
      },
      {
        status: 500,
      },
    )
  }
}
