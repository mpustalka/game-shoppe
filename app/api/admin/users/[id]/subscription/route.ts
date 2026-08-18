import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { supabaseTable } from "@/lib/supabase"

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
  type SubscriptionTier,
} from "@/lib/entitlements"

import {
  getActiveSubscription,
  type PaymentRow,
} from "@/lib/subscription-server"

import {
  sendSubscriptionExpiredEmail,
  sendSubscriptionGrantedEmail,
  sendSubscriptionPlanChangedEmail,
} from "@/lib/email"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function createId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function addMonths(value: Date, months: number) {
  const result = new Date(value)

  result.setMonth(result.getMonth() + months)

  return result
}

function priceForPlan(plan: SubscriptionTier) {
  return plan === "basic" ? BASIC_MONTHLY_PRICE_USD : PREMIUM_MONTHLY_PRICE_USD
}

/**
 * Fire-and-forget transactional email.
 *
 * IMPORTANT:
 * A Resend failure should NEVER cause the admin's
 * subscription action to fail.
 */
function safelySendEmail(promise: Promise<unknown>, label: string) {
  void promise.catch((error) => {
    console.error(`${label} email failed:`, error)
  })
}

/**
 * GET /api/admin/users/[id]/subscription
 *
 * Returns the user's current paid subscription
 * and their payment history.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id } = await params

  if (!id?.trim()) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const subscription = await getActiveSubscription(id)

    const payments = (await supabaseTable("subscription_payments", {
      select: "*",

      filters: [`user_id=eq.${id}`],

      order: "created_at.desc",

      limit: 100,
    })) as PaymentRow[]

    return NextResponse.json({
      subscription,

      payments: Array.isArray(payments) ? payments : [],
    })
  } catch (error) {
    console.error("Admin subscription GET failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load subscription",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * POST /api/admin/users/[id]/subscription
 *
 * Grant or extend Basic/Premium access.
 *
 * Body:
 *
 * {
 *   action: "grant",
 *   plan: "premium",
 *   months: 1,
 *   note: "Admin granted Premium"
 * }
 */
export async function POST(request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id } = await params

  if (!id?.trim()) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  const body = await request.json().catch(() => null)

  const action = typeof body?.action === "string" ? body.action : ""

  if (action !== "grant") {
    return NextResponse.json(
      {
        error: "Invalid subscription action",
      },
      {
        status: 400,
      },
    )
  }

  if (body?.plan !== "basic" && body?.plan !== "premium") {
    return NextResponse.json(
      {
        error: "Plan must be basic or premium",
      },
      {
        status: 400,
      },
    )
  }

  const plan: SubscriptionTier = body.plan

  const requestedMonths = Number(body?.months)

  const months = Number.isFinite(requestedMonths)
    ? Math.min(24, Math.max(1, Math.floor(requestedMonths)))
    : 1

  const note =
    typeof body?.note === "string" ? body.note.trim().slice(0, 500) : ""

  try {
    /**
     * Verify the target Supabase Auth user.
     */
    const admin = createAdminClient()

    const { data: target, error: targetError } =
      await admin.auth.admin.getUserById(id)

    if (targetError || !target.user) {
      return NextResponse.json(
        {
          error: targetError?.message ?? "User not found",
        },
        {
          status: 404,
        },
      )
    }

    const email = target.user.email ?? ""

    /**
     * Determine the existing subscription.
     *
     * If the account is currently paid,
     * extend from its existing end date.
     *
     * Otherwise start from now.
     */
    const current = await getActiveSubscription(id).catch(() => ({
      paidUntil: null,
      paidPlan: null,
    }))

    const now = new Date()

    const currentEnd = current.paidUntil ? new Date(current.paidUntil) : null

    const periodStart =
      currentEnd &&
      Number.isFinite(currentEnd.getTime()) &&
      currentEnd.getTime() > now.getTime()
        ? currentEnd
        : now

    const periodEnd = addMonths(periodStart, months)

    const amount = Number((priceForPlan(plan) * months).toFixed(2))

    const payment = {
      id: createId("subscription"),

      user_id: id,

      email,

      invoice_number: `ADMIN-${Date.now().toString(36).toUpperCase()}`,

      amount,

      currency: "USD",

      method: "admin",

      status: "confirmed",

      plan,

      cashtag: "",

      note:
        note ||
        `Admin granted ${plan} subscription for ${months} month${
          months === 1 ? "" : "s"
        }`,

      period_start: periodStart.toISOString(),

      period_end: periodEnd.toISOString(),

      created_at: now.toISOString(),

      confirmed_at: now.toISOString(),
    }

    /**
     * Save the confirmed subscription.
     */
    await supabaseTable("subscription_payments", {
      method: "POST",
      body: payment,
    })

    /**
     * Send the user an email.
     *
     * This is intentionally non-blocking.
     * If Resend has a temporary problem,
     * the subscription is still successfully
     * granted.
     */
    if (email) {
      safelySendEmail(
        sendSubscriptionGrantedEmail({
          email,
          plan,
          paidUntil: periodEnd.toISOString(),
          months,
        }),
        "Subscription granted",
      )
    }

    return NextResponse.json(
      {
        ok: true,

        plan,

        paidUntil: periodEnd.toISOString(),

        payment,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error("Admin subscription POST failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update subscription",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * PATCH /api/admin/users/[id]/subscription
 *
 * Supported actions:
 *
 * CHANGE PLAN
 *
 * {
 *   action: "change_plan",
 *   plan: "basic"
 * }
 *
 *
 * EXPIRE IMMEDIATELY
 *
 * {
 *   action: "expire_now"
 * }
 *
 *
 * CANCEL AT END OF PERIOD
 *
 * {
 *   action: "cancel_at_period_end"
 * }
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id } = await params

  if (!id?.trim()) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  const body = await request.json().catch(() => null)

  const action = typeof body?.action === "string" ? body.action : ""

  if (
    action !== "change_plan" &&
    action !== "expire_now" &&
    action !== "cancel_at_period_end"
  ) {
    return NextResponse.json(
      {
        error: "Invalid subscription action",
      },
      {
        status: 400,
      },
    )
  }

  try {
    /**
     * Get the user's latest confirmed
     * subscription/payment record.
     */
    const rows = (await supabaseTable("subscription_payments", {
      select: "*",

      filters: [`user_id=eq.${id}`, "status=eq.confirmed"],

      order: "period_end.desc",

      limit: 1,
    })) as PaymentRow[]

    const payment = Array.isArray(rows) ? rows[0] : null

    if (!payment) {
      return NextResponse.json(
        {
          error: "This user does not have a confirmed subscription record",
        },
        {
          status: 404,
        },
      )
    }

    /**
     * -------------------------------------------------
     * CHANGE BASIC <-> PREMIUM
     * -------------------------------------------------
     */
    if (action === "change_plan") {
      if (body?.plan !== "basic" && body?.plan !== "premium") {
        return NextResponse.json(
          {
            error: "Plan must be basic or premium",
          },
          {
            status: 400,
          },
        )
      }

      const plan: SubscriptionTier = body.plan

      const previousPlan: SubscriptionTier =
        payment.plan === "basic" ? "basic" : "premium"

      /**
       * Don't perform unnecessary writes.
       */
      if (previousPlan === plan) {
        return NextResponse.json({
          ok: true,
          action,
          plan,
          paidUntil: payment.period_end,
          unchanged: true,
        })
      }

      await supabaseTable("subscription_payments", {
        method: "PATCH",

        filters: [`id=eq.${payment.id}`],

        body: {
          plan,
        },
      })

      /**
       * Notify user.
       */
      if (payment.email) {
        safelySendEmail(
          sendSubscriptionPlanChangedEmail({
            email: payment.email,

            previousPlan,

            newPlan: plan,

            paidUntil: payment.period_end,
          }),
          "Subscription plan changed",
        )
      }

      return NextResponse.json({
        ok: true,

        action,

        previousPlan,

        plan,

        paidUntil: payment.period_end,
      })
    }

    /**
     * -------------------------------------------------
     * EXPIRE IMMEDIATELY
     * -------------------------------------------------
     */
    if (action === "expire_now") {
      const now = new Date().toISOString()

      /**
       * We DO NOT delete the payment.
       *
       * Instead we shorten period_end so the
       * accounting/payment history remains.
       */
      await supabaseTable("subscription_payments", {
        method: "PATCH",

        filters: [`id=eq.${payment.id}`],

        body: {
          period_end: now,
        },
      })

      /**
       * Notify user.
       */
      if (payment.email) {
        safelySendEmail(
          sendSubscriptionExpiredEmail({
            email: payment.email,
          }),
          "Subscription expired",
        )
      }

      return NextResponse.json({
        ok: true,

        action,

        paidUntil: now,
      })
    }

    /**
     * -------------------------------------------------
     * CANCEL AT PERIOD END
     * -------------------------------------------------
     *
     * Your payment system is manual rather
     * than recurring billing.
     *
     * Therefore we leave period_end unchanged
     * and record the admin action in the note.
     */
    const previousNote = payment.note ?? ""

    const cancellationNote =
      "Admin marked subscription to end after current paid period."

    await supabaseTable("subscription_payments", {
      method: "PATCH",

      filters: [`id=eq.${payment.id}`],

      body: {
        note: previousNote
          ? `${previousNote}\n${cancellationNote}`
          : cancellationNote,
      },
    })

    return NextResponse.json({
      ok: true,

      action,

      paidUntil: payment.period_end,
    })
  } catch (error) {
    console.error("Admin subscription PATCH failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to modify subscription",
      },
      {
        status: 500,
      },
    )
  }
}
