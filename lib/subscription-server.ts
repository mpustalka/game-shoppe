import type { User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseTable } from "@/lib/supabase"
import { isAdminUser } from "@/lib/auth"

import {
  computeEntitlements,
  type Entitlements,
  type SubscriptionTier,
} from "@/lib/entitlements"

export interface PaymentRow {
  id: string
  user_id: string
  email: string
  invoice_number: string
  amount: number
  currency: string
  method: string

  status: "pending" | "confirmed" | "rejected"

  /**
   * Which subscription tier this payment purchased.
   *
   * Older payment rows may not have this populated yet.
   * Those are treated as Premium because the previous
   * subscription model granted full application access.
   */
  plan?: SubscriptionTier | null

  cashtag: string
  note: string

  period_start: string
  period_end: string

  created_at: string
  confirmed_at: string | null
}

export interface ActiveSubscription {
  paidUntil: string | null
  paidPlan: SubscriptionTier | null
}

/**
 * Get the most recent confirmed subscription period.
 *
 * Pending payments never unlock access.
 *
 * Existing legacy payments without a `plan` are treated as Premium
 * because the previous subscription model granted full application access.
 */
export async function getActiveSubscription(
  userId: string,
): Promise<ActiveSubscription> {
  const rows = (await supabaseTable("subscription_payments", {
    select: "period_end,status,plan,created_at",

    filters: [`user_id=eq.${userId}`, "status=eq.confirmed"],

    order: "period_end.desc",

    limit: 1,
  })) as
    | Pick<PaymentRow, "period_end" | "status" | "plan" | "created_at">[]
    | null

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      paidUntil: null,
      paidPlan: null,
    }
  }

  const payment = rows[0]

  /**
   * Any old confirmed payment without a plan came from the previous
   * full-access subscription system.
   *
   * Preserve that access by treating it as Premium.
   */
  const paidPlan: SubscriptionTier =
    payment.plan === "basic" ? "basic" : "premium"

  return {
    paidUntil: payment.period_end,
    paidPlan,
  }
}

/**
 * Compatibility helper for routes/code that only need
 * the user's current paid-through date.
 */
export async function getPaidUntil(userId: string): Promise<string | null> {
  const subscription = await getActiveSubscription(userId)

  return subscription.paidUntil
}

/**
 * Convenience helper for code that only needs
 * the active paid subscription tier.
 */
export async function getPaidPlan(
  userId: string,
): Promise<SubscriptionTier | null> {
  const subscription = await getActiveSubscription(userId)

  return subscription.paidPlan
}

/**
 * Resolve the signed-in user and all subscription entitlements.
 *
 * Flow:
 *
 * Admin
 *   → Premium-equivalent access
 *
 * Grandfathered account
 *   → Premium-equivalent access forever
 *
 * New user during trial
 *   → Premium trial access
 *
 * Active Basic payment
 *   → Basic entitlements
 *
 * Active Premium payment
 *   → Premium entitlements
 *
 * No active subscription after trial
 *   → Expired / upgrade required
 */
export async function resolveEntitlements(): Promise<{
  user: User | null
  entitlements: Entitlements | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      entitlements: null,
    }
  }

  /**
   * Billing/database failures should not crash authentication
   * or make the entire application unusable.
   *
   * If subscription lookup fails, computeEntitlements()
   * still evaluates admin, trial, and grandfathered status.
   */
  const subscription = await getActiveSubscription(user.id).catch((error) => {
    console.error("Failed to resolve active subscription:", error)

    return {
      paidUntil: null,
      paidPlan: null,
    } satisfies ActiveSubscription
  })

  const entitlements = computeEntitlements({
    isAdmin: isAdminUser(user),

    createdAt: user.created_at,

    trialStartedAt: user.user_metadata?.trial_started_at as string | undefined,

    paidUntil: subscription.paidUntil,

    paidPlan: subscription.paidPlan,
  })

  return {
    user,
    entitlements,
  }
}

/**
 * Server-side feature gate.
 *
 * Basic feature example:
 *
 * const gate = await requireFeature(
 *   (e) => e.canAddCards,
 *   "Adding cards",
 * )
 *
 * Premium feature example:
 *
 * const gate = await requireFeature(
 *   (e) => e.canImport,
 *   "Importing cards",
 *   "premium",
 * )
 *
 * if (gate instanceof NextResponse) {
 *   return gate
 * }
 */
export async function requireFeature(
  allowed: (entitlements: Entitlements) => boolean,

  featureLabel: string,

  requiredTier: SubscriptionTier = "basic",
) {
  const { user, entitlements } = await resolveEntitlements()

  /**
   * Preserve the application's existing permissive behavior
   * when auth cannot be resolved.
   *
   * Page middleware/proxy is still responsible for normal
   * authentication protection.
   */
  if (!user || !entitlements) {
    return {
      user: null,
      entitlements: null,
    }
  }

  if (!allowed(entitlements)) {
    const premiumRequired = requiredTier === "premium"

    return NextResponse.json(
      {
        error: premiumRequired
          ? `${featureLabel} requires Premium. Upgrade for $3.99/month in Settings → Payments.`
          : `${featureLabel} requires an active Basic or Premium subscription.`,

        code: "upgrade_required",

        plan: entitlements.plan,

        subscriptionTier: entitlements.subscriptionTier,

        requiredTier,

        premiumRequired,
      },
      {
        status: 402,
      },
    )
  }

  return {
    user,
    entitlements,
  }
}
