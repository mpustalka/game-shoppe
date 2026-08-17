"use client"

import Link from "next/link"
import { Lock, Sparkles, Clock, Crown, BadgeDollarSign } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { useEntitlements } from "@/hooks/use-entitlements"

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
} from "@/lib/entitlements"

/**
 * Top-of-page subscription banner.
 *
 * Behavior:
 *
 * trial
 *   → show Premium trial countdown
 *
 * expired
 *   → prompt user to choose Basic or Premium
 *
 * basic
 *   → no general warning banner
 *
 * premium / grandfathered / admin
 *   → no banner
 */
export function TrialBanner() {
  const { entitlements: e, loading, signedIn } = useEntitlements()

  if (loading || !signedIn) {
    return null
  }

  // Premium-equivalent accounts do not need a warning banner,
  // except for trial users where we want to show the countdown.
  if (e.fullAccess && e.plan !== "trial") {
    return null
  }

  // Basic is a valid active subscription.
  // Don't nag Basic users on every page.
  if (e.plan === "basic") {
    return null
  }

  const expired = e.plan === "expired"

  const trial = e.plan === "trial"

  if (!expired && !trial) {
    return null
  }

  return (
    <Alert className={expired ? "border-destructive/50" : "border-primary/40"}>
      {expired ? <Lock className="h-4 w-4" /> : <Clock className="h-4 w-4" />}

      <AlertTitle>
        {expired
          ? "Your Premium trial has ended"
          : `Premium trial — ${e.trialDaysLeft ?? 0} day${
              e.trialDaysLeft === 1 ? "" : "s"
            } left`}
      </AlertTitle>

      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {expired
            ? `Choose Basic for $${BASIC_MONTHLY_PRICE_USD.toFixed(
                2,
              )}/month to keep managing your collection, or Premium for $${PREMIUM_MONTHLY_PRICE_USD.toFixed(
                2,
              )}/month to unlock analytics, showcase, customer lists, import, scan, and advanced tools.`
            : `You currently have full Premium access during your trial. After it ends, choose Basic for $${BASIC_MONTHLY_PRICE_USD.toFixed(
                2,
              )}/month or Premium for $${PREMIUM_MONTHLY_PRICE_USD.toFixed(
                2,
              )}/month.`}
        </span>

        <Button asChild size="sm" className="shrink-0">
          <Link href="/settings?tab=billing">
            <Sparkles className="mr-2 h-4 w-4" />

            {expired ? "Choose a Plan" : "View Plans"}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Full-page locked-state panel.
 *
 * Used for Premium-only features like:
 *
 * - Analytics
 * - Showcase
 * - Customer Lists
 * - Import
 * - Scan
 */
export function FeatureLocked({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const { entitlements } = useEntitlements()

  const isBasic = entitlements.plan === "basic"

  const isExpired = entitlements.plan === "expired"

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {isBasic ? <Crown className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
      </div>

      <h2 className="text-xl font-semibold text-foreground">{title}</h2>

      <p className="max-w-md text-sm text-muted-foreground">{description}</p>

      {isBasic ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            This feature is included with Premium.
          </p>

          <p className="text-sm text-muted-foreground">
            Upgrade from Basic to Premium for $
            {PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
            /month.
          </p>
        </div>
      ) : isExpired ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Choose a subscription to continue.
          </p>

          <p className="text-sm text-muted-foreground">
            Basic starts at ${BASIC_MONTHLY_PRICE_USD.toFixed(2)}
            /month. Premium is ${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
            /month.
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-foreground">
          Unlock this feature with Premium for $
          {PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
          /month.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/settings?tab=billing">
            <BadgeDollarSign className="mr-2 h-4 w-4" />

            {isBasic ? "Upgrade to Premium" : "View Plans"}
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Generic feature gate.
 *
 * Example:
 *
 * <FeatureGate
 *   allowed={(e) => e.canUseAnalytics}
 *   title="Premium Analytics"
 *   description="Upgrade to Premium to unlock advanced analytics."
 * >
 *   <AnalyticsPage />
 * </FeatureGate>
 */
export function FeatureGate({
  allowed,
  title,
  description,
  children,
}: {
  allowed: (e: ReturnType<typeof useEntitlements>["entitlements"]) => boolean

  title: string
  description: string
  children: React.ReactNode
}) {
  const { entitlements, loading } = useEntitlements()

  /**
   * Keep the existing permissive-loading behavior
   * so legitimate Premium users don't briefly see
   * a locked screen while /api/subscription loads.
   */
  if (loading) {
    return <>{children}</>
  }

  if (!allowed(entitlements)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FeatureLocked title={title} description={description} />
      </div>
    )
  }

  return <>{children}</>
}
