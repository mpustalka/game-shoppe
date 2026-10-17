export const BUSINESS_TRIAL_DAYS = 7

export type BusinessPlan =
  | "starter"
  | "pro"
  | "plus"

export type BusinessBillingInterval =
  | "monthly"
  | "yearly"

export type BusinessSupportLevel =
  | "email"
  | "chat"
  | "dedicated"

export interface BusinessPlanDefinition {
  id: BusinessPlan
  name: string

  monthlyPrice: number
  yearlyPrice: number

  includedSeats: number

  virtualEmployeeIncludedHours: number
  virtualEmployeeHourlyRate: number

  support: BusinessSupportLevel

  canUseAnalytics: boolean
  canImport: boolean
  canExport: boolean
  canScan: boolean
  canUseCustomBinders: boolean

  /*
   * POS integrations are intentionally modeled separately
   * from "platforms currently used".
   *
   * A business may report Shopify/eBay/etc. during signup
   * without Card Vault actually having a live connector yet.
   */
  includedPosIntegrations: number | null

  squareIncluded: boolean
}

export const BUSINESS_PLANS: Record<
  BusinessPlan,
  BusinessPlanDefinition
> = {
  starter: {
    id: "starter",
    name: "Starter",

    monthlyPrice: 9.99,
    yearlyPrice: 49.99,

    includedSeats: 1,

    virtualEmployeeIncludedHours: 0,
    virtualEmployeeHourlyRate: 10,

    support: "email",

    canUseAnalytics: false,
    canImport: true,
    canExport: true,
    canScan: false,
    canUseCustomBinders: true,

    /*
     * Starter gets Square as its included POS integration.
     */
    includedPosIntegrations: 1,
    squareIncluded: true,
  },

  pro: {
    id: "pro",
    name: "Pro",

    monthlyPrice: 19.99,
    yearlyPrice: 149.99,

    includedSeats: 5,

    virtualEmployeeIncludedHours: 4,
    virtualEmployeeHourlyRate: 8,

    support: "chat",

    canUseAnalytics: true,
    canImport: true,
    canExport: true,
    canScan: true,
    canUseCustomBinders: true,

    includedPosIntegrations: 3,
    squareIncluded: true,
  },

  plus: {
    id: "plus",
    name: "Plus",

    monthlyPrice: 29.99,
    yearlyPrice: 199.99,

    /*
     * We had not finalized Plus seats yet.
     * Start with 10; this stays centralized here so we can
     * change it without touching the UI or authorization.
     */
    includedSeats: 10,

    virtualEmployeeIncludedHours: 12,
    virtualEmployeeHourlyRate: 5,

    support: "dedicated",

    canUseAnalytics: true,
    canImport: true,
    canExport: true,
    canScan: true,
    canUseCustomBinders: true,

    /*
     * null = no plan-level integration count limit.
     */
    includedPosIntegrations: null,
    squareIncluded: true,
  },
}

export interface BusinessEntitlements
  extends BusinessPlanDefinition {
  status:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "inactive"

  billingInterval:
    | BusinessBillingInterval
    | null

  trialEndsAt: string | null
  trialDaysLeft: number | null

  isTrialing: boolean
  isActive: boolean
  mustSubscribe: boolean

  effectivePrice: number
}

const DAY_MS =
  24 * 60 * 60 * 1000

export function normalizeBusinessPlan(
  value:
    | string
    | null
    | undefined,
): BusinessPlan {
  const normalized =
    value?.trim().toLowerCase()

  if (
    normalized === "starter" ||
    normalized === "pro" ||
    normalized === "plus"
  ) {
    return normalized
  }

  return "starter"
}

export function normalizeBusinessBillingInterval(
  value:
    | string
    | null
    | undefined,
): BusinessBillingInterval | null {
  if (
    value === "monthly" ||
    value === "yearly"
  ) {
    return value
  }

  return null
}

function daysUntil(
  value:
    | string
    | null
    | undefined,
  now: number,
) {
  if (!value) return null

  const end =
    new Date(value).getTime()

  if (!Number.isFinite(end)) {
    return null
  }

  return Math.max(
    0,
    Math.ceil(
      (end - now) /
        DAY_MS,
    ),
  )
}

export function computeBusinessEntitlements(input: {
  subscriptionPlan?:
    | string
    | null

  trialPlan?:
    | string
    | null

  subscriptionStatus?:
    | string
    | null

  billingInterval?:
    | string
    | null

  trialEndsAt?:
    | string
    | null

  now?: number
}): BusinessEntitlements {
  const now =
    input.now ?? Date.now()

  const status =
    input.subscriptionStatus ===
      "trialing" ||
    input.subscriptionStatus ===
      "active" ||
    input.subscriptionStatus ===
      "past_due" ||
    input.subscriptionStatus ===
      "canceled"
      ? input.subscriptionStatus
      : "inactive"

  /*
   * While trialing, trial_plan is authoritative.
   * Otherwise subscription_plan is authoritative.
   */
  const planId =
    normalizeBusinessPlan(
      status === "trialing"
        ? input.trialPlan ??
            input.subscriptionPlan
        : input.subscriptionPlan ??
            input.trialPlan,
    )

  const definition =
    BUSINESS_PLANS[planId]

  const billingInterval =
    normalizeBusinessBillingInterval(
      input.billingInterval,
    )

  const trialDaysLeft =
    status === "trialing"
      ? daysUntil(
          input.trialEndsAt,
          now,
        )
      : null

  const isTrialing =
    status === "trialing" &&
    trialDaysLeft !== null &&
    trialDaysLeft > 0

  const isActive =
    status === "active" ||
    isTrialing

  return {
    ...definition,

    status,

    billingInterval,

    trialEndsAt:
      input.trialEndsAt ?? null,

    trialDaysLeft,

    isTrialing,

    isActive,

    mustSubscribe:
      !isActive,

    effectivePrice:
      billingInterval === "yearly"
        ? definition.yearlyPrice
        : definition.monthlyPrice,
  }
}

export function businessPlanPrice(
  plan: BusinessPlan,
  interval: BusinessBillingInterval,
) {
  const definition =
    BUSINESS_PLANS[plan]

  return interval === "yearly"
    ? definition.yearlyPrice
    : definition.monthlyPrice
}

export function businessSupportLabel(
  support: BusinessSupportLevel,
) {
  switch (support) {
    case "email":
      return "Email support"

    case "chat":
      return "Chat support"

    case "dedicated":
      return "Dedicated account specialist"
  }
}

