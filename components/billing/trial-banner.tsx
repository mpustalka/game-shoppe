"use client"

import Link from "next/link"
import { Lock, Sparkles, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEntitlements } from "@/hooks/use-entitlements"
import { MONTHLY_PRICE_USD } from "@/lib/entitlements"

// A slim banner shown at the top of gated pages while an account is on the
// trial (or the trial has expired). Grandfathered / paid / admin accounts see
// nothing. Links to the billing tab in Settings.
export function TrialBanner() {
  const { entitlements: e, loading, signedIn } = useEntitlements()

  if (loading || !signedIn || e.fullAccess) return null

  const expired = e.plan === "expired"

  return (
    <Alert className={expired ? "border-destructive/50" : "border-primary/40"}>
      {expired ? (
        <Lock className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <AlertTitle>
        {expired
          ? "Your free trial has ended"
          : `Free trial — ${e.trialDaysLeft} day${e.trialDaysLeft === 1 ? "" : "s"} left`}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {expired
            ? `Subscribe for $${MONTHLY_PRICE_USD}/month to unlock unlimited binders, full inventory, imports, and analytics.`
            : `You're on the limited trial (1 binder, 50 cards, no import/add/sync). Upgrade any time for $${MONTHLY_PRICE_USD}/month.`}
        </span>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/settings?tab=billing">
            <Sparkles className="h-4 w-4" /> Upgrade
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

// A full "this feature is locked" panel used to replace the body of a page a
// trial account can't use (Import, Add Card, Scan-to-sync, etc.).
export function FeatureLocked({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <p className="text-sm font-medium text-foreground">
        Unlock everything for ${MONTHLY_PRICE_USD}/month.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/settings?tab=billing">
            <Sparkles className="h-4 w-4" /> Upgrade now
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

// Wraps a gated page: shows a spinner-free permissive render while loading,
// the locked panel when the account lacks `allowed`, otherwise the children.
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

  if (loading) return <>{children}</>
  if (!allowed(entitlements)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FeatureLocked title={title} description={description} />
      </div>
    )
  }
  return <>{children}</>
}
