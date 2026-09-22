import {
  NextRequest,
  NextResponse,
} from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      )
    }

    const admin = createAdminClient()

    const { data: order, error } =
      await admin
        .from("store_orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          fulfillment_status,
          subtotal,
          shipping_amount,
          tax_amount,
          discount_amount,
          total,
          customer_email,
          customer_name,
          shipping_name,
          shipping_address1,
          shipping_address2,
          shipping_city,
          shipping_state,
          shipping_postal_code,
          shipping_country,
          payment_provider,
          payment_reference,
          payment_submitted_at,
          payment_confirmed_at,
          shipping_service,
          shipping_courier,
          tracking_number,
          tracking_url,
          carrier,
          created_at,
          updated_at,
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
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()

    if (error) {
      console.error(
        "Customer store order GET error:",
        error,
      )

      return NextResponse.json(
        { error: "Unable to load order." },
        { status: 500 },
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { order },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error(
      "Customer store order GET exception:",
      error,
    )

    return NextResponse.json(
      { error: "Unable to load order." },
      { status: 500 },
    )
  }
}