import type { User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseTable } from "@/lib/supabase"
import { isAdminUser } from "@/lib/auth"
import { computeEntitlements, type Entitlements } from "@/lib/entitlements"

export interface PaymentRow {
  id: string
  user_id: string
  email: string
  invoice_number: string
  amount: number
  currency: string
  method: string
  status: "pending" | "confirmed" | "rejected"
  cashtag: string
  note: string
  period_start: string
  period_end: string
  created_at: string
  confirmed_at: string | null
}

// Latest paid-period end across the user's *confirmed* payments — this is what
// keeps a paid account unlocked. Pending payments don't count until an admin
// confirms them.
export async function getPaidUntil(userId: string): Promise<string | null> {
  const rows = (await supabaseTable("subscription_payments", {
    select: "period_end,status",
    filters: [`user_id=eq.${userId}`, `status=eq.confirmed`],
    order: "period_end.desc",
    limit: 1,
  })) as Pick<PaymentRow, "period_end" | "status">[] | null

  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0].period_end
  }
  return null
}

// Resolves the signed-in user and their computed entitlements from the request
// cookies. Returns { user: null } when nobody is signed in.
export async function resolveEntitlements(): Promise<{
  user: User | null
  entitlements: Entitlements | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, entitlements: null }
  }

  const paidUntil = await getPaidUntil(user.id).catch(() => null)

  const entitlements = computeEntitlements({
    isAdmin: isAdminUser(user),
    createdAt: user.created_at,
    trialStartedAt: user.user_metadata?.trial_started_at as string | undefined,
    paidUntil,
  })

  return { user, entitlements }
}

// Route-handler guard for features that require a paid (or grandfathered /
// admin) account. Returns a ready-to-send 402 when the account is on the
// limited trial, so gating is enforced server-side and not just in the UI.
//
//   const gate = await requireFeature((e) => e.canAddCards, "Adding cards")
//   if (gate instanceof NextResponse) return gate
export async function requireFeature(
  allowed: (e: Entitlements) => boolean,
  featureLabel: string,
) {
  const { user, entitlements } = await resolveEntitlements()

  // If auth isn't resolvable we don't block — the app supports environments
  // where Supabase auth isn't configured, and middleware already gates pages.
  if (!user || !entitlements) {
    return { user: null, entitlements: null }
  }

  if (!allowed(entitlements)) {
    return NextResponse.json(
      {
        error: `${featureLabel} requires a subscription. Upgrade in Settings → Payments to unlock it.`,
        code: "upgrade_required",
        plan: entitlements.plan,
      },
      { status: 402 },
    )
  }

  return { user, entitlements }
}
