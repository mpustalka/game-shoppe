import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
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

export const dynamic = "force-dynamic"

type PaymentStatus = "pending" | "confirmed" | "rejected"

function priceForPlan(plan: SubscriptionTier) {
  return plan === "basic" ? BASIC_MONTHLY_PRICE_USD : PREMIUM_MONTHLY_PRICE_USD
}

function addMonths(value: Date, months: number) {
  const result = new Date(value)

  result.setMonth(result.getMonth() + months)

  return result
}

/**
 * GET /api/admin/payments
 *
 * Admin-only.
 *
 * Returns every submitted payment across all users,
 * newest first.
 */
export async function GET() {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const rows = (await supabaseTable("subscription_payments", {
      select: "*",

      order: "created_at.desc",

      limit: 500,
    })) as PaymentRow[]

    return NextResponse.json(Array.isArray(rows) ? rows : [])
  } catch (error) {
    console.error("Admin payment GET failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load payments",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * POST /api/admin/payments
 *
 * Manually creates a subscription payment.
 *
 * Useful when:
 * - customer pays you in person
 * - customer pays CashApp and you want to enter it manually
 * - you want to comp/gift a subscription
 * - you want to immediately activate Basic/Premium
 *
 * Expected body:
 *
 * {
 *   userId: "...",
 *   email: "...",
 *   plan: "basic" | "premium",
 *   months: 1,
 *   status: "confirmed" | "pending",
 *   method: "cashapp",
 *   note: "..."
 * }
 */
export async function POST(request: Request) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const body = await request.json().catch(() => null)

  const userId = typeof body?.userId === "string" ? body.userId.trim() : ""

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  const plan: SubscriptionTier = body?.plan === "basic" ? "basic" : "premium"

  const requestedMonths = Number(body?.months)

  const months = Number.isFinite(requestedMonths)
    ? Math.min(24, Math.max(1, Math.floor(requestedMonths)))
    : 1

  const status: PaymentStatus =
    body?.status === "pending"
      ? "pending"
      : body?.status === "rejected"
        ? "rejected"
        : "confirmed"

  const method =
    typeof body?.method === "string"
      ? body.method.trim().slice(0, 40)
      : "manual"

  const note =
    typeof body?.note === "string" ? body.note.trim().slice(0, 500) : ""

  const cashtag =
    typeof body?.cashtag === "string" ? body.cashtag.trim().slice(0, 120) : ""

  if (!userId) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  if (!email) {
    return NextResponse.json(
      {
        error: "Email is required",
      },
      {
        status: 400,
      },
    )
  }

  const now = new Date()

  /**
   * If this customer is already paid ahead,
   * stack the new subscription on the end.
   */
  const current = await getActiveSubscription(userId).catch(() => ({
    paidUntil: null,
    paidPlan: null,
  }))

  const currentPaidUntil = current.paidUntil
    ? new Date(current.paidUntil)
    : null

  const periodStart =
    currentPaidUntil &&
    Number.isFinite(currentPaidUntil.getTime()) &&
    currentPaidUntil.getTime() > now.getTime()
      ? currentPaidUntil
      : now

  const periodEnd = addMonths(periodStart, months)

  const id =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `payment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`

  const amount = Number((priceForPlan(plan) * months).toFixed(2))

  const row = {
    id,

    user_id: userId,

    email,

    invoice_number: invoiceNumber,

    amount,

    currency: "USD",

    method,

    status,

    plan,

    cashtag,

    note,

    period_start: periodStart.toISOString(),

    period_end: periodEnd.toISOString(),

    created_at: now.toISOString(),

    confirmed_at: status === "confirmed" ? now.toISOString() : null,
  }

  try {
    await supabaseTable("subscription_payments", {
      method: "POST",

      body: row,
    })

    return NextResponse.json(row, {
      status: 201,
    })
  } catch (error) {
    console.error("Admin payment POST failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create payment",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * PATCH /api/admin/payments
 *
 * Confirm or reject an existing payment.
 *
 * Body:
 *
 * {
 *   id: "payment-id",
 *   status: "confirmed"
 * }
 *
 * or:
 *
 * {
 *   id: "payment-id",
 *   status: "rejected"
 * }
 */
export async function PATCH(request: Request) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const body = await request.json().catch(() => null)

  const id = typeof body?.id === "string" ? body.id.trim() : ""

  const status = body?.status

  if (!id) {
    return NextResponse.json(
      {
        error: "Payment id is required",
      },
      {
        status: 400,
      },
    )
  }

  if (status !== "confirmed" && status !== "rejected" && status !== "pending") {
    return NextResponse.json(
      {
        error: "Invalid payment status",
      },
      {
        status: 400,
      },
    )
  }

  const now = new Date().toISOString()

  const patch: {
    status: PaymentStatus
    confirmed_at: string | null
  } = {
    status,

    confirmed_at: status === "confirmed" ? now : null,
  }

  try {
    await supabaseTable("subscription_payments", {
      method: "PATCH",

      filters: [`id=eq.${id}`],

      body: patch,
    })

    return NextResponse.json({
      ok: true,

      id,

      status,

      confirmedAt: patch.confirmed_at,
    })
  } catch (error) {
    console.error("Admin payment PATCH failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update payment",
      },
      {
        status: 500,
      },
    )
  }
}
