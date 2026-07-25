import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { supabaseTable } from "@/lib/supabase"
import type { PaymentRow } from "@/lib/subscription-server"

// Admin-only: every submitted payment across all accounts, newest first, so the
// owner can review and confirm CashApp payments from the admin portal.
export async function GET() {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const rows = (await supabaseTable("subscription_payments", {
    select: "*",
    order: "created_at.desc",
    limit: 500,
  })) as PaymentRow[]

  return NextResponse.json(Array.isArray(rows) ? rows : [])
}
