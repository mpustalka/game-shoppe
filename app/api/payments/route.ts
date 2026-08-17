import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

import {
  resolveEntitlements,
  getPaidUntil,
  type PaymentRow,
} from "@/lib/subscription-server"

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
  CASHAPP_CASHTAG,
  type SubscriptionTier,
} from "@/lib/entitlements"

// GET: list the signed-in account's payments / invoices, newest first.
export async function GET() {
  const { user } = await resolveEntitlements()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const rows = (await supabaseTable("subscription_payments", {
    select: "*",
    filters: [`user_id=eq.${user.id}`],
    order: "created_at.desc",
  })) as PaymentRow[]

  return NextResponse.json(Array.isArray(rows) ? rows : [])
}

// POST: record that the user has sent a CashApp payment.
//
// Body:
// {
//   plan: "basic" | "premium",
//   cashtag?: string,
//   note?: string
// }
//
// The payment starts as pending.
// Admin confirmation later unlocks the subscription period.
export async function POST(request: Request) {
  const { user } = await resolveEntitlements()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    plan?: SubscriptionTier
    cashtag?: string
    note?: string
  }

  // ------------------------------------------------------------
  // Validate selected plan
  // ------------------------------------------------------------

  const plan: SubscriptionTier =
    body.plan === "basic"
      ? "basic"
      : body.plan === "premium"
        ? "premium"
        : "premium"

  const amount =
    plan === "basic" ? BASIC_MONTHLY_PRICE_USD : PREMIUM_MONTHLY_PRICE_USD

  const now = new Date()

  // ------------------------------------------------------------
  // Subscription period
  // ------------------------------------------------------------

  // If the account is already paid up, stack the new month
  // on top of the existing subscription period.
  const currentPaidUntil = await getPaidUntil(user.id).catch(() => null)

  const currentEnd = currentPaidUntil ? new Date(currentPaidUntil) : null

  const periodStart =
    currentEnd &&
    Number.isFinite(currentEnd.getTime()) &&
    currentEnd.getTime() > now.getTime()
      ? currentEnd
      : now

  const periodEnd = new Date(periodStart)

  periodEnd.setMonth(periodEnd.getMonth() + 1)

  // ------------------------------------------------------------
  // Generate payment ID
  // ------------------------------------------------------------

  // Server-side Node crypto.randomUUID() should normally be
  // available, but keep a fallback anyway.
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`

  // Compact human-readable invoice number.
  const invoiceNumber = `INV-${now.getTime().toString(36).toUpperCase()}`

  // ------------------------------------------------------------
  // Build payment row
  // ------------------------------------------------------------

  const row = {
    id,

    user_id: user.id,

    email: user.email ?? "",

    invoice_number: invoiceNumber,

    plan,

    amount,

    currency: "USD",

    method: "cashapp",

    status: "pending",

    cashtag: (body.cashtag ?? "").trim().slice(0, 120),

    note: (body.note ?? "").trim().slice(0, 500),

    period_start: periodStart.toISOString(),

    period_end: periodEnd.toISOString(),

    created_at: now.toISOString(),

    confirmed_at: null,
  }

  // ------------------------------------------------------------
  // Save payment
  // ------------------------------------------------------------

  try {
    await supabaseTable("subscription_payments", {
      method: "POST",
      body: row,
    })
  } catch (error) {
    console.error("Failed to create subscription payment:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create payment",
      },
      {
        status: 500,
      },
    )
  }

  // ------------------------------------------------------------
  // Response
  // ------------------------------------------------------------

  return NextResponse.json(
    {
      ...row,

      payTo: CASHAPP_CASHTAG,

      planName: plan === "basic" ? "Basic" : "Premium",
    },
    {
      status: 201,
    },
  )
}
