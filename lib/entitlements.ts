// Subscription entitlements
//
// Plans:
//
// BASIC — $0.99/month
// Core collection management:
// - Browse sets
// - Inventory
// - Add / bulk add cards
// - TCGPlayer pricing
// - Binders
//
// PREMIUM — $3.99/month
// Everything in Basic, plus:
// - Full analytics
// - Showcase
// - Customer lists
// - Import
// - Scan
// - Square sync / advanced seller tools
//
// NEW USERS:
// - Receive a 7-day Premium trial.
// - After the trial they must choose Basic or Premium.
//
// EXISTING / GRANDFATHERED USERS:
// - Keep full Premium-equivalent access free forever.
//
// ADMIN:
// - Full unrestricted access.

export const BASIC_MONTHLY_PRICE_USD = 0.99
export const PREMIUM_MONTHLY_PRICE_USD = 3.99

export const TRIAL_DAYS = 7

export const CASHAPP_CASHTAG = "$Evileevee1"
export const CASHAPP_TAG_DISPLAY = "#Evileevee1"

export const BILLING_EMAIL = "Admin@evileevee.com"

// Existing accounts created before this point retain
// grandfathered Premium-equivalent access.
//
// Do not change this date unless you intentionally want
// to redefine which accounts are grandfathered.
export const PAID_PROGRAM_LAUNCH = "2026-07-18T00:00:00.000Z"

export type SubscriptionTier = "basic" | "premium"

export type BillingPlan =
  | "admin"
  | "grandfathered"
  | "trial"
  | "expired"
  | "basic"
  | "premium"

export interface Entitlements {
  plan: BillingPlan

  /**
   * Convenience indicator for Premium-equivalent access.
   *
   * True for:
   * - admin
   * - grandfathered
   * - trial
   * - premium
   *
   * IMPORTANT:
   * Feature authorization should use the specific
   * `can...` permission instead of relying on fullAccess.
   */
  fullAccess: boolean

  /**
   * Account was created on/after the paid-program launch.
   */
  isNewAccount: boolean

  /**
   * User currently has no active Basic/Premium subscription.
   *
   * This is primarily used for expired accounts.
   */
  mustPay: boolean

  /**
   * Effective subscription tier.
   *
   * Trial behaves like Premium.
   * Grandfathered/admin also receive Premium-equivalent access.
   */
  subscriptionTier: SubscriptionTier | null

  // ------------------------------------------------------------
  // CORE / BASIC
  // ------------------------------------------------------------

  canBrowseSets: boolean
  canManageInventory: boolean
  canAddCards: boolean
  canBulkAddCards: boolean
  canUseBinders: boolean
  canViewMarketPrices: boolean

  // ------------------------------------------------------------
  // PREMIUM
  // ------------------------------------------------------------

  canUseAnalytics: boolean
  canUseShowcase: boolean
  canUseCustomerLists: boolean
  canImport: boolean
  canScan: boolean
  canSyncSquare: boolean

  /**
   * Compatibility limits.
   *
   * Basic is intentionally useful and is not artificially
   * limited by inventory-card or binder counts.
   */
  maxBinders: number | null
  maxInventoryVisible: number | null

  trialEndsAt: string | null
  trialDaysLeft: number | null

  paidUntil: string | null

  /**
   * Monthly price corresponding to the effective tier.
   *
   * Grandfathered/admin/trial use the Premium price here
   * because their capability set matches Premium.
   */
  priceMonthly: number
}

/**
 * Basic should be a genuinely useful product.
 *
 * Do NOT cripple inventory or binders solely to force
 * users into Premium.
 */
const BASIC_ACCESS: Omit<
  Entitlements,
  | "plan"
  | "isNewAccount"
  | "mustPay"
  | "subscriptionTier"
  | "trialEndsAt"
  | "trialDaysLeft"
  | "paidUntil"
> = {
  fullAccess: false,

  canBrowseSets: true,
  canManageInventory: true,
  canAddCards: true,
  canBulkAddCards: true,
  canUseBinders: true,
  canViewMarketPrices: true,

  canUseAnalytics: false,
  canUseShowcase: false,
  canUseCustomerLists: false,
  canImport: false,
  canScan: false,
  canSyncSquare: false,

  maxBinders: null,
  maxInventoryVisible: null,

  priceMonthly: BASIC_MONTHLY_PRICE_USD,
}

/**
 * Premium-equivalent access.
 *
 * Used by:
 * - Premium subscribers
 * - Trial users
 * - Grandfathered users
 * - Admins
 */
const PREMIUM_ACCESS: Omit<
  Entitlements,
  | "plan"
  | "isNewAccount"
  | "mustPay"
  | "subscriptionTier"
  | "trialEndsAt"
  | "trialDaysLeft"
  | "paidUntil"
> = {
  fullAccess: true,

  canBrowseSets: true,
  canManageInventory: true,
  canAddCards: true,
  canBulkAddCards: true,
  canUseBinders: true,
  canViewMarketPrices: true,

  canUseAnalytics: true,
  canUseShowcase: true,
  canUseCustomerLists: true,
  canImport: true,
  canScan: true,
  canSyncSquare: true,

  maxBinders: null,
  maxInventoryVisible: null,

  priceMonthly: PREMIUM_MONTHLY_PRICE_USD,
}

export interface EntitlementInput {
  isAdmin: boolean

  /**
   * Supabase auth user's created_at.
   */
  createdAt: string | null | undefined

  /**
   * trial_started_at stored in user metadata.
   */
  trialStartedAt?: string | null

  /**
   * Latest confirmed paid-period end.
   */
  paidUntil?: string | null

  /**
   * Tier attached to the currently-active payment.
   */
  paidPlan?: SubscriptionTier | null

  /**
   * Optional timestamp injected during testing.
   */
  now?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function daysBetween(fromMs: number, toMs: number): number {
  return Math.ceil((toMs - fromMs) / DAY_MS)
}

function safeTimestamp(
  value: string | null | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value).getTime()

  return Number.isFinite(parsed) ? parsed : fallback
}

export function computeEntitlements(input: EntitlementInput): Entitlements {
  const now = input.now ?? Date.now()

  // ------------------------------------------------------------
  // ADMIN
  // ------------------------------------------------------------

  if (input.isAdmin) {
    return {
      ...PREMIUM_ACCESS,

      plan: "admin",

      isNewAccount: false,

      mustPay: false,

      subscriptionTier: "premium",

      trialEndsAt: null,

      trialDaysLeft: null,

      paidUntil: null,
    }
  }

  const createdMs = safeTimestamp(input.createdAt, now)

  const launchMs = safeTimestamp(PAID_PROGRAM_LAUNCH, now)

  const isNewAccount = createdMs >= launchMs

  // ------------------------------------------------------------
  // GRANDFATHERED ACCOUNTS
  // ------------------------------------------------------------

  if (!isNewAccount) {
    return {
      ...PREMIUM_ACCESS,

      plan: "grandfathered",

      isNewAccount: false,

      mustPay: false,

      subscriptionTier: "premium",

      trialEndsAt: null,

      trialDaysLeft: null,

      paidUntil: null,
    }
  }

  // ------------------------------------------------------------
  // ACTIVE PAID SUBSCRIPTION
  // ------------------------------------------------------------

  const paidUntilMs = input.paidUntil
    ? new Date(input.paidUntil).getTime()
    : null

  const hasActivePayment =
    paidUntilMs !== null && Number.isFinite(paidUntilMs) && paidUntilMs > now

  if (hasActivePayment) {
    /**
     * Legacy active payments without a plan are interpreted
     * as Premium by subscription-server.ts before reaching here.
     *
     * We still default unknown values to Premium to preserve
     * legacy access if computeEntitlements() is called elsewhere.
     */
    const tier: SubscriptionTier =
      input.paidPlan === "basic" ? "basic" : "premium"

    if (tier === "basic") {
      return {
        ...BASIC_ACCESS,

        plan: "basic",

        isNewAccount: true,

        mustPay: false,

        subscriptionTier: "basic",

        trialEndsAt: null,

        trialDaysLeft: null,

        paidUntil: input.paidUntil ?? null,
      }
    }

    return {
      ...PREMIUM_ACCESS,

      plan: "premium",

      isNewAccount: true,

      mustPay: false,

      subscriptionTier: "premium",

      trialEndsAt: null,

      trialDaysLeft: null,

      paidUntil: input.paidUntil ?? null,
    }
  }

  // ------------------------------------------------------------
  // 7-DAY PREMIUM TRIAL
  // ------------------------------------------------------------

  const trialStartMs = safeTimestamp(input.trialStartedAt, createdMs)

  const trialEndMs = trialStartMs + TRIAL_DAYS * DAY_MS

  const trialEndsAt = new Date(trialEndMs).toISOString()

  const withinTrial = now < trialEndMs

  if (withinTrial) {
    return {
      ...PREMIUM_ACCESS,

      plan: "trial",

      isNewAccount: true,

      mustPay: false,

      // Trial has the complete Premium feature set.
      subscriptionTier: "premium",

      trialEndsAt,

      trialDaysLeft: Math.max(0, daysBetween(now, trialEndMs)),

      paidUntil: null,
    }
  }

  // ------------------------------------------------------------
  // TRIAL EXPIRED / NO ACTIVE SUBSCRIPTION
  // ------------------------------------------------------------

  return {
    ...BASIC_ACCESS,

    plan: "expired",

    isNewAccount: true,

    mustPay: true,

    subscriptionTier: null,

    /**
     * Expired accounts retain read access to their existing
     * collection so inventory never appears deleted.
     *
     * They cannot add additional cards until they activate
     * Basic or Premium.
     */
    canAddCards: false,

    canBulkAddCards: false,

    trialEndsAt,

    trialDaysLeft: 0,

    paidUntil: input.paidUntil ?? null,
  }
}

/**
 * Permissive defaults during hydration/API failures.
 *
 * This preserves your existing fail-open behavior and prevents
 * a temporary subscription lookup failure from making an
 * established user's inventory appear inaccessible.
 *
 * Server-side feature routes still perform their own entitlement
 * checks when billing data is successfully available.
 */
export const DEFAULT_ENTITLEMENTS: Entitlements = {
  ...PREMIUM_ACCESS,

  plan: "grandfathered",

  isNewAccount: false,

  mustPay: false,

  subscriptionTier: "premium",

  trialEndsAt: null,

  trialDaysLeft: null,

  paidUntil: null,
}
