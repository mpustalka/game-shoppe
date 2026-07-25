import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import {
  resolveEntitlements,
  getPaidUntil,
  type PaymentRow,
} from "@/lib/subscription-server"
import { MONTHLY_PRICE_USD, CASHAPP_CASHTAG } from "@/lib/entitlements"

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

// POST: record that the user has sent a CashApp payment. Creates a `pending`
// row (an invoice) that the admin later confirms to unlock the paid period.
export async function POST(request: Request) {
  const { user } = await resolveEntitlements()
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    cashtag?: string
    note?: string
  }

  const now = new Date()

  // If the account is already paid up, stack the new month on the end of the
  // current period so paying early never costs the customer time.
  const currentPaidUntil = await getPaidUntil(user.id).catch(() => null)
  const currentEnd = currentPaidUntil ? new Date(currentPaidUntil) : null
  const periodStart =
    currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now

  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const id = crypto.randomUUID()
  // Compact, unique, human-readable invoice number.
  const invoiceNumber = `INV-${now.getTime().toString(36).toUpperCase()}`

  const row = {
    id,
    user_id: user.id,
    email: user.email ?? "",
    invoice_number: invoiceNumber,
    amount: MONTHLY_PRICE_USD,
    currency: "USD",
    method: "cashapp",
    status: "pending",
    cashtag: (body.cashtag ?? "").slice(0, 120),
    note: (body.note ?? "").slice(0, 500),
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    created_at: now.toISOString(),
    confirmed_at: null,
  }

  await supabaseTable("subscription_payments", {
    method: "POST",
    body: row,
  })

  return NextResponse.json(
    { ...row, payTo: CASHAPP_CASHTAG },
    { status: 201 },
  )
}
