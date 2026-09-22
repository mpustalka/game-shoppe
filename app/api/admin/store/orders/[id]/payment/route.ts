import {
  NextRequest,
  NextResponse,
} from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type PaymentAction =
  | "confirm"
  | "reject"

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const action = body?.action as PaymentAction | undefined

    if (
      action !== "confirm" &&
      action !== "reject"
    ) {
      return NextResponse.json(
        { error: "Invalid payment action." },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { data: order, error: orderError } =
      await supabase
        .from("store_orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          payment_provider,
          payment_submitted_at,
          payment_confirmed_at,
          inventory_finalized_at,
          total
        `)
        .eq("id", id)
        .maybeSingle()

    if (orderError) {
      console.error(
        "Admin store order payment lookup error:",
        orderError,
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

    if (order.payment_provider !== "cashapp") {
      return NextResponse.json(
        {
          error:
            "This payment action is only for Cash App orders.",
        },
        { status: 400 },
      )
    }

    if (
      order.status === "cancelled" ||
      order.status === "refunded"
    ) {
      return NextResponse.json(
        {
          error:
            `This order is ${order.status} and cannot be changed here.`,
        },
        { status: 409 },
      )
    }

    if (action === "reject") {
      if (
        order.payment_status === "paid" ||
        order.inventory_finalized_at
      ) {
        return NextResponse.json(
          {
            error:
              "A paid/finalized order cannot be rejected.",
          },
          { status: 409 },
        )
      }

      const { data: rejected, error } =
        await supabase
          .from("store_orders")
          .update({
            payment_status: "failed",
            status: "payment_pending",
            payment_confirmed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single()

      if (error) {
        console.error(
          "Cash App rejection error:",
          error,
        )

        return NextResponse.json(
          { error: "Unable to reject payment." },
          { status: 500 },
        )
      }

      return NextResponse.json({
        ok: true,
        action: "rejected",
        order: rejected,
      })
    }

    /*
     * IMPORTANT:
     * Inventory finalization is performed by a Postgres RPC.
     * The RPC runs in one database transaction so:
     * - every stock row is rechecked
     * - every stock decrement succeeds together
     * - the order becomes paid only after inventory succeeds
     * - retries/double-clicks cannot decrement stock twice
     */
    const { data, error } = await supabase.rpc(
      "confirm_store_cashapp_order",
      {
        p_order_id: id,
      },
    )

    if (error) {
      console.error(
        "Cash App confirmation RPC error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to confirm payment.",
        },
        { status: 409 },
      )
    }

    const result =
      Array.isArray(data)
        ? data[0] ?? null
        : data

    return NextResponse.json({
      ok: true,
      action: "confirmed",
      result,
    })
  } catch (error) {
    console.error(
      "Admin store payment exception:",
      error,
    )

    return NextResponse.json(
      { error: "Unable to update payment." },
      { status: 500 },
    )
  }
}