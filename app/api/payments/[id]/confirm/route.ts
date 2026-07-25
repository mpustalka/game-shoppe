import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { supabaseTable } from "@/lib/supabase"

interface RouteContext {
  params: Promise<{ id: string }>
}

// Admin-only: confirm (or reject) a manually-submitted CashApp payment. On
// confirmation the row flips to `confirmed`, which is what unlocks the paid
// period for the account (see getPaidUntil).
export async function POST(request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as {
    action?: "confirm" | "reject"
  }
  const action = body.action === "reject" ? "reject" : "confirm"

  const now = new Date().toISOString()

  await supabaseTable("subscription_payments", {
    method: "PATCH",
    filters: [`id=eq.${id}`],
    body:
      action === "confirm"
        ? { status: "confirmed", confirmed_at: now }
        : { status: "rejected", confirmed_at: null },
  })

  return NextResponse.json({ ok: true, status: action === "confirm" ? "confirmed" : "rejected" })
}
