import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

import {
  resolveDataScope,
  ownerStamp,
  tenantScopeRequiredResponse,
} from "@/lib/user-scope"

/**
 * Append-only ledger of realized sales.
 *
 * Recorded from inventory-context's recordSale so the analytics page
 * can later report exact, time-stamped revenue, COGS, ROI, and margin.
 *
 * This endpoint remains available to Basic accounts so sales history
 * continues accumulating even when Analytics viewing is Premium-only.
 *
 * Ownership:
 *
 * Individual:
 *   user_id    = authenticated user
 *   company_id = null
 *
 * Business:
 *   user_id    = null
 *   company_id = active company
 *
 * Super admins do not receive an implicit tenant here. A platform
 * administrator must operate through an explicit tenant-aware admin
 * workflow instead of creating unowned sales records.
 */
export async function POST(request: Request) {
  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  const tenantError =
    tenantScopeRequiredResponse(scope)

  if (tenantError) {
    return tenantError
  }

  const body = await request
    .json()
    .catch(() => null)

  const cardId =
    typeof body?.cardId === "string"
      ? body.cardId
      : ""

  const quantity = Math.max(
    1,
    Math.floor(
      Number(body?.quantity) || 1,
    ),
  )

  const unitPrice = Math.max(
    0,
    Number(body?.unitPrice) || 0,
  )

  const purchasePrice = Math.max(
    0,
    Number(body?.purchasePrice) || 0,
  )

  if (!cardId) {
    return NextResponse.json(
      {
        error: "Missing cardId",
      },
      {
        status: 400,
      },
    )
  }

  try {
    await supabaseTable(
      "card_sales",
      {
        method: "POST",

        body: {
          /*
           * Stamp this sale to the authenticated
           * individual or business tenant.
           */
          ...ownerStamp(scope),

          inventory_id:
            typeof body?.inventoryId ===
            "string"
              ? body.inventoryId
              : null,

          card_id: cardId,

          card_name:
            typeof body?.cardName ===
            "string"
              ? body.cardName
              : null,

          set_name:
            typeof body?.setName ===
            "string"
              ? body.setName
              : null,

          rarity:
            typeof body?.rarity ===
            "string"
              ? body.rarity
              : null,

          finish:
            typeof body?.finish ===
            "string"
              ? body.finish
              : null,

          condition:
            typeof body?.condition ===
            "string"
              ? body.condition
              : null,

          quantity,

          unit_price: Number(
            unitPrice.toFixed(2),
          ),

          purchase_price: Number(
            purchasePrice.toFixed(2),
          ),
        },
      },
    )
  } catch (error) {
    console.error(
      "Sale record failed",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sale record failed",
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