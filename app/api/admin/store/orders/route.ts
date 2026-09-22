import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("store_orders")
      .select(`
        *,
        items:store_order_items (
          id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          sku,
          purchase_type,
          quantity,
          unit_price,
          line_total,
          is_preorder,
          release_date
        )
      `)
      .order("created_at", { ascending: false })
      .limit(250)

    if (error) {
      console.error("Admin store orders GET error:", error)

      return NextResponse.json(
        { error: "Unable to load store orders." },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { orders: data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("Admin store orders GET exception:", error)

    return NextResponse.json(
      { error: "Unable to load store orders." },
      { status: 500 },
    )
  }
}