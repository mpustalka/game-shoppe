// Subscription entitlements — the single source of truth for what a given
// account is allowed to do.
//
// Business rules (set by the owner):
//   • NEW accounts get a 14-day free trial with LIMITED access, then must pay
//     $7.99/month for full access.
//   • EXISTING accounts — created before the paid program launched — keep FULL
//     access free, forever (grandfathered).
//   • The platform admin always has full access.
//
// This module is pure and isomorphic: the same computation runs on the server
// (from the Supabase auth user + payment rows) and is surfaced to the client
// through /api/subscription, so the UI and the API never disagree.

export const MONTHLY_PRICE_USD = 7.99
export const TRIAL_DAYS = 14

// CashApp is how payment is collected. These are shown to the user on the
// billing screen and stamped onto the landing page.
export const CASHAPP_CASHTAG = "$Evileevee1"
export const CASHAPP_TAG_DISPLAY = "#Evileevee1"
export const BILLING_EMAIL = "Admin@evileevee.com"

// The moment the paid program went live. Accounts whose auth record predates
// this are grandfathered into free, full access forever. Everyone who signs up
// from this point on is a "new" account subject to the trial + subscription.
export const PAID_PROGRAM_LAUNCH = "2026-07-18T00:00:00.000Z"

// Inventory rows a trial account can see, binders it can open, etc.
export const TRIAL_INVENTORY_LIMIT = 50
export const TRIAL_BINDER_LIMIT = 1

export type BillingPlan =
  | "admin" // platform owner — unrestricted
  | "grandfathered" // pre-launch account, free forever
  | "trial" // new account inside the 14-day window
  | "expired" // new account whose trial ended without payment
  | "paid" // new account with an active paid period

export interface Entitlements {
  plan: BillingPlan
  /** True when the account can use every feature without limits. */
  fullAccess: boolean
  /** True for accounts created after the paid program launched. */
  isNewAccount: boolean
  /** Whether the account still needs to pay to keep using the platform. */
  mustPay: boolean
  // Feature gates (a limit of `null` means "unlimited").
  maxBinders: number | null
  maxInventoryVisible: number | null
  canImport: boolean
  canAddCards: boolean
  canSyncSquare: boolean
  limitedAnalytics: boolean
  // Trial / billing timeline.
  trialEndsAt: string | null
  trialDaysLeft: number | null
  paidUntil: string | null
  priceMonthly: number
}

const FULL: Omit<Entitlements, "plan" | "isNewAccount" | "trialEndsAt" | "trialDaysLeft" | "paidUntil"> = {
  fullAccess: true,
  mustPay: false,
  maxBinders: null,
  maxInventoryVisible: null,
  canImport: true,
  canAddCards: true,
  canSyncSquare: true,
  limitedAnalytics: false,
  priceMonthly: MONTHLY_PRICE_USD,
}

const LIMITED: Omit<Entitlements, "plan" | "isNewAccount" | "trialEndsAt" | "trialDaysLeft" | "paidUntil" | "mustPay"> = {
  fullAccess: false,
  maxBinders: TRIAL_BINDER_LIMIT,
  maxInventoryVisible: TRIAL_INVENTORY_LIMIT,
  canImport: false,
  canAddCards: false,
  canSyncSquare: false,
  limitedAnalytics: true,
  priceMonthly: MONTHLY_PRICE_USD,
}

export interface EntitlementInput {
  isAdmin: boolean
  /** auth user's created_at (ISO string). */
  createdAt: string | null | undefined
  /** trial_started_at from user metadata, if present (ISO string). */
  trialStartedAt?: string | null
  /** Latest paid-period end across confirmed payments (ISO string). */
  paidUntil?: string | null
  /** Current time, injected for testability. */
  now?: number
}

function daysBetween(fromMs: number, toMs: number): number {
  return Math.ceil((toMs - fromMs) / (1000 * 60 * 60 * 24))
}

export function computeEntitlements(input: EntitlementInput): Entitlements {
  const now = input.now ?? Date.now()

  // Admin: unrestricted.
  if (input.isAdmin) {
    return {
      ...FULL,
      plan: "admin",
      isNewAccount: false,
      trialEndsAt: null,
      trialDaysLeft: null,
      paidUntil: null,
    }
  }

  const createdMs = input.createdAt ? new Date(input.createdAt).getTime() : now
  const launchMs = new Date(PAID_PROGRAM_LAUNCH).getTime()
  const isNewAccount = createdMs >= launchMs

  // Grandfathered: existing account, free full access forever.
  if (!isNewAccount) {
    return {
      ...FULL,
      plan: "grandfathered",
      isNewAccount: false,
      trialEndsAt: null,
      trialDaysLeft: null,
      paidUntil: null,
    }
  }

  // New account with an active paid period → full access.
  const paidUntilMs = input.paidUntil
    ? new Date(input.paidUntil).getTime()
    : null
  if (paidUntilMs && paidUntilMs > now) {
    return {
      ...FULL,
      plan: "paid",
      isNewAccount: true,
      trialEndsAt: null,
      trialDaysLeft: null,
      paidUntil: input.paidUntil ?? null,
    }
  }

  // New account, not paid → trial or expired.
  const trialStartMs = input.trialStartedAt
    ? new Date(input.trialStartedAt).getTime()
    : createdMs
  const trialEndMs = trialStartMs + TRIAL_DAYS * 24 * 60 * 60 * 1000
  const trialEndsAt = new Date(trialEndMs).toISOString()
  const withinTrial = now < trialEndMs

  return {
    ...LIMITED,
    plan: withinTrial ? "trial" : "expired",
    isNewAccount: true,
    mustPay: true,
    trialEndsAt,
    trialDaysLeft: withinTrial ? Math.max(0, daysBetween(now, trialEndMs)) : 0,
    paidUntil: input.paidUntil ?? null,
  }
}

// Default entitlements used before the real ones have loaded (and if the
// billing API ever fails). Conservatively grants full access so the UI never
// blocks a legitimate paying/grandfathered user on a transient error.
export const DEFAULT_ENTITLEMENTS: Entitlements = {
  ...FULL,
  plan: "grandfathered",
  isNewAccount: false,
  trialEndsAt: null,
  trialDaysLeft: null,
  paidUntil: null,
}
