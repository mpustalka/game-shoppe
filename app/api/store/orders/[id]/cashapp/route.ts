import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CASHAPP_CASHTAG } from "@/lib/entitlements"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const supabase =
      await createClient()

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Not signed in.",
        },
        {
          status: 401,
        },
      )
    }

    const { id } =
      await context.params

    const admin =
      createAdminClient()

    const {
      data: order,
      error,
    } =
      await admin
        .from("store_orders")
        .select(
          `
            id,
            order_number,
            user_id,
            status,
            payment_status,
            payment_provider,
            payment_submitted_at,
            total
          `,
        )
        .eq("id", id)
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle()

    if (error) {
      console.error(
        "Cash App order lookup error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load order.",
        },
        {
          status: 500,
        },
      )
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status: 404,
        },
      )
    }

    return NextResponse.json({
      order: {
        id:
          order.id,

        orderNumber:
          order.order_number,

        status:
          order.status,

        paymentStatus:
          order.payment_status,

        paymentSubmittedAt:
          order.payment_submitted_at,

        total:
          Number(
            order.total,
          ),
      },

      cashApp: {
        payTo:
          CASHAPP_CASHTAG,

        amount:
          Number(
            order.total,
          ),

        note:
          order.order_number,
      },
    })
  } catch (error) {
    console.error(
      "Cash App payment details exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Cash App payment details.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const supabase =
      await createClient()

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Not signed in.",
        },
        {
          status: 401,
        },
      )
    }

    const { id } =
      await context.params

    const admin =
      createAdminClient()

    const {
      data: order,
      error: lookupError,
    } =
      await admin
        .from("store_orders")
        .select(
          `
            id,
            order_number,
            user_id,
            status,
            payment_status,
            payment_provider,
            payment_submitted_at,
            total
          `,
        )
        .eq("id", id)
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle()

    if (lookupError) {
      console.error(
        "Cash App order lookup error:",
        lookupError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to verify order.",
        },
        {
          status: 500,
        },
      )
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status: 404,
        },
      )
    }

    if (
      order.payment_provider !==
      "cashapp"
    ) {
      return NextResponse.json(
        {
          error:
            "This order is not using Cash App.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      order.payment_status ===
      "paid"
    ) {
      return NextResponse.json({
        ok: true,

        alreadyPaid: true,

        order: {
          id:
            order.id,

          orderNumber:
            order.order_number,

          status:
            order.status,

          paymentStatus:
            order.payment_status,
        },
      })
    }

    if (
      order.status ===
        "cancelled" ||
      order.status ===
        "refunded"
    ) {
      return NextResponse.json(
        {
          error:
            "This order can no longer accept payment.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Customer is only reporting that
     * payment was sent.
     *
     * This does NOT mark the order paid.
     */
    const submittedAt =
      new Date().toISOString()

    const {
      data: updated,
      error: updateError,
    } =
      await admin
        .from("store_orders")
        .update({
          status:
            "payment_pending",

          payment_status:
            "pending",

          payment_submitted_at:
            submittedAt,

          payment_reference:
            order.order_number,
        })
        .eq(
          "id",
          order.id,
        )
        .eq(
          "user_id",
          user.id,
        )
        .select(
          `
            id,
            order_number,
            status,
            payment_status,
            payment_submitted_at,
            total
          `,
        )
        .single()

    if (
      updateError ||
      !updated
    ) {
      console.error(
        "Cash App submission update error:",
        updateError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to submit payment confirmation.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
      ok: true,

      order: {
        id:
          updated.id,

        orderNumber:
          updated.order_number,

        status:
          updated.status,

        paymentStatus:
          updated.payment_status,

        paymentSubmittedAt:
          updated.payment_submitted_at,

        total:
          Number(
            updated.total,
          ),
      },
    })
  } catch (error) {
    console.error(
      "Cash App payment submission exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit Cash App payment.",
      },
      {
        status: 500,
      },
    )
  }
}