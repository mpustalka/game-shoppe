"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"
import Link from "next/link"

import {
  ArrowLeft,
  BarChart3,
  Bot,
  Building2,
  Check,
  Clock3,
  CreditCard,
  FileUp,
  Headphones,
  Loader2,
  Plug,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type BusinessPlan =
  | "starter"
  | "pro"
  | "plus"

type BillingInterval =
  | "monthly"
  | "yearly"

type SupportLevel =
  | "email"
  | "chat"
  | "dedicated"

type BusinessEntitlements = {
  id: BusinessPlan
  name: string

  monthlyPrice: number
  yearlyPrice: number

  includedSeats: number

  virtualEmployeeIncludedHours: number
  virtualEmployeeHourlyRate: number

  support: SupportLevel

  canUseAnalytics: boolean
  canImport: boolean
  canExport: boolean
  canScan: boolean
  canUseCustomBinders: boolean

  includedPosIntegrations:
    | number
    | null

  squareIncluded: boolean

  status:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "inactive"

  billingInterval:
    | BillingInterval
    | null

  trialEndsAt:
    | string
    | null

  trialDaysLeft:
    | number
    | null

  isTrialing: boolean
  isActive: boolean
  mustSubscribe: boolean

  effectivePrice: number
}

type BusinessSubscriptionResponse = {
  company: {
    id: string
    name: string
  }

  role:
    | "owner"
    | "manager"
    | "employee"
    | null

  canManageBilling: boolean

  subscription: {
    status:
      | string
      | null

    plan:
      | string
      | null

    billingInterval:
      | string
      | null

    price:
      | number
      | string
      | null

    startedAt:
      | string
      | null

    includedSeats:
      | number
      | null

    trialPlan:
      | string
      | null

    trialStartedAt:
      | string
      | null

    trialEndsAt:
      | string
      | null

    promoCode:
      | string
      | null

    promoStartedAt:
      | string
      | null

    promoEndsAt:
      | string
      | null
  }

  entitlements: BusinessEntitlements
}

type PlanDefinition = {
  id: BusinessPlan
  name: string
  description: string

  monthly: number
  yearly: number

  seats: number

  integrations:
    | number
    | null

  virtualHours: number
  virtualRate: number

  support: string

  analytics: boolean
  importExport: boolean
  scan: boolean
  customBinders: boolean

  featured?: boolean
}

const PLANS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",

    description:
      "A simple, affordable starting point for small card businesses.",

    monthly: 9.99,
    yearly: 49.99,

    seats: 1,

    integrations: 1,

    virtualHours: 0,
    virtualRate: 10,

    support: "Email support",

    analytics: false,
    importExport: true,
    scan: false,
    customBinders: true,
  },

  {
    id: "pro",
    name: "Pro",

    description:
      "Built for growing shops managing inventory, staff, and multiple sales channels.",

    monthly: 19.99,
    yearly: 149.99,

    seats: 5,

    integrations: 3,

    virtualHours: 4,
    virtualRate: 8,

    support: "Chat support",

    analytics: true,
    importExport: true,
    scan: true,
    customBinders: true,

    featured: true,
  },

  {
    id: "plus",
    name: "Plus",

    description:
      "Maximum access for established stores and higher-volume operations.",

    monthly: 29.99,
    yearly: 199.99,

    seats: 10,

    integrations: null,

    virtualHours: 12,
    virtualRate: 5,

    support:
      "Dedicated account specialist",

    analytics: true,
    importExport: true,
    scan: true,
    customBinders: true,
  },
]

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(value)
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—"
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—"
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  ).format(date)
}

function yearlySavings(
  plan: PlanDefinition,
) {
  return (
    plan.monthly * 12 -
    plan.yearly
  )
}

function yearlyMonthlyEquivalent(
  plan: PlanDefinition,
) {
  return (
    plan.yearly / 12
  )
}

function PlanFeature({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5 text-sm text-white/65">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
        <Check className="h-3 w-3" />
      </div>

      <span>
        {children}
      </span>
    </div>
  )
}

export default function BusinessBillingPage() {
  const [
    data,
    setData,
  ] =
    useState<BusinessSubscriptionResponse | null>(
      null,
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    )

  const [
    interval,
    setInterval,
  ] =
    useState<BillingInterval>(
      "monthly",
    )

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const response =
          await fetch(
            "/api/business/subscription",
            {
              cache:
                "no-store",
            },
          )

        const result =
          await response
            .json()
            .catch(
              () => null,
            )

        if (
          !response.ok
        ) {
          throw new Error(
            result?.error ||
              "Unable to load business billing.",
          )
        }

        if (!active) {
          return
        }

        const billing =
          result as BusinessSubscriptionResponse

        setData(
          billing,
        )

        if (
          billing
            .entitlements
            .billingInterval ===
            "yearly"
        ) {
          setInterval(
            "yearly",
          )
        }
      } catch (err) {
        if (!active) {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load business billing.",
        )
      } finally {
        if (active) {
          setLoading(
            false,
          )
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const currentPlan =
    data?.entitlements.id ??
    null

  const trialDays =
    data?.entitlements
      .trialDaysLeft ??
    null

  const trialProgress =
    useMemo(() => {
      if (
        trialDays ===
        null
      ) {
        return 0
      }

      return Math.min(
        100,
        Math.max(
          0,
          ((7 -
            trialDays) /
            7) *
            100,
        ),
      )
    }, [trialDays])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" />

            Loading business billing…
          </div>
        </div>
      </main>
    )
  }

  if (
    error ||
    !data
  ) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="border-red-500/20 bg-red-500/[0.04] text-white">
            <CardHeader>
              <CardTitle>
                Billing unavailable
              </CardTitle>

              <CardDescription className="text-white/45">
                {error ||
                  "Unable to load your business billing information."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                asChild
                variant="outline"
              >
                <Link href="/business">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Business Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const {
    company,
    subscription,
    entitlements,
    canManageBilling,
  } = data

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-rose-500/10 via-white/[0.035] to-violet-500/10 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="border-rose-400/20 bg-rose-500/10 text-rose-200">
                  <Building2 className="mr-1 h-3.5 w-3.5" />
                  Business Billing
                </Badge>

                <Badge
                  variant="outline"
                  className="border-white/10 text-white/60"
                >
                  {entitlements.name}
                  {entitlements.isTrialing
                    ? " Trial"
                    : ""}
                </Badge>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Billing & Plans
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                Manage the plan for{" "}
                <span className="font-semibold text-white/70">
                  {company.name}
                </span>
                , compare business features,
                and choose the plan that fits
                your operation.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.03]"
            >
              <Link href="/business">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Business Dashboard
              </Link>
            </Button>
          </div>
        </section>

        {/* CURRENT SUBSCRIPTION */}

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.03] text-white lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-rose-300" />
                    Current Plan
                  </CardTitle>

                  <CardDescription className="mt-2 text-white/40">
                    Your active business subscription and trial status.
                  </CardDescription>
                </div>

                <Badge className="w-fit border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                  {entitlements.isTrialing
                    ? "Trial Active"
                    : entitlements.status ===
                        "active"
                      ? "Active"
                      : entitlements.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/35">
                    Plan
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {entitlements.name}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/35">
                    Billing
                  </div>

                  <div className="mt-2 text-xl font-black capitalize">
                    {subscription.billingInterval ||
                      "Not started"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/35">
                    Seats
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {subscription.includedSeats ??
                      entitlements.includedSeats}
                  </div>
                </div>
              </div>

              {entitlements.isTrialing && (
                <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <Clock3 className="h-4 w-4 text-violet-300" />
                        {trialDays}{" "}
                        {trialDays === 1
                          ? "day"
                          : "days"}{" "}
                        left in your{" "}
                        {entitlements.name} trial
                      </div>

                      <p className="mt-1 text-sm text-white/40">
                        Trial ends{" "}
                        {formatDate(
                          subscription.trialEndsAt,
                        )}
                        .
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className="w-fit border-violet-400/20 text-violet-200"
                    >
                      No charge during trial
                    </Badge>
                  </div>

                  <Progress
                    value={trialProgress}
                    className="mt-4 h-2 bg-white/10"
                  />
                </div>
              )}

              {!canManageBilling && (
                <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.05] px-4 py-3 text-sm text-amber-100/70">
                  Only the business owner can
                  change the subscription plan.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-300" />
                Virtual Employee
              </CardTitle>

              <CardDescription className="text-white/40">
                Included with your current plan.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-black">
                {
                  entitlements
                    .virtualEmployeeIncludedHours
                }
                <span className="ml-1 text-base font-semibold text-white/35">
                  hrs/mo
                </span>
              </div>

              <p className="mt-2 text-sm text-white/45">
                Additional time is{" "}
                <span className="font-semibold text-white/70">
                  {money(
                    entitlements
                      .virtualEmployeeHourlyRate,
                  )}
                  /hour
                </span>
                .
              </p>
            </CardContent>
          </Card>
        </section>

        {/* INTERVAL */}

        <section className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row">
          <div>
            <h2 className="font-bold">
              Choose your billing cycle
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Annual billing gives businesses
              our lowest pricing.
            </p>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setInterval("monthly")
              }
              className={
                interval === "monthly"
                  ? "rounded-lg bg-white/10 text-white hover:bg-white/15"
                  : "rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
              }
            >
              Monthly
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setInterval("yearly")
              }
              className={
                interval === "yearly"
                  ? "rounded-lg bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
                  : "rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
              }
            >
              Yearly
              <Sparkles className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </section>

        {/* PLAN CARDS */}

        <section className="grid gap-5 lg:grid-cols-3">
          {PLANS.map(
            (plan) => {
              const isCurrent =
                currentPlan ===
                plan.id

              const price =
                interval ===
                "monthly"
                  ? plan.monthly
                  : plan.yearly

              return (
                <Card
                  key={plan.id}
                  className={
                    plan.featured
                      ? "relative overflow-hidden border-rose-400/25 bg-gradient-to-b from-rose-500/[0.08] to-white/[0.025] text-white shadow-2xl shadow-rose-950/10"
                      : "relative overflow-hidden border-white/10 bg-white/[0.025] text-white"
                  }
                >
                  {plan.featured && (
                    <div className="absolute right-4 top-4">
                      <Badge className="border-rose-400/20 bg-rose-500/15 text-rose-200">
                        Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-2xl">
                        {plan.name}
                      </CardTitle>

                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="border-emerald-400/20 text-emerald-200"
                        >
                          Current
                        </Badge>
                      )}
                    </div>

                    <CardDescription className="min-h-[48px] pr-10 text-white/40">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">
                          {money(
                            price,
                          )}
                        </span>

                        <span className="pb-1 text-sm text-white/35">
                          /
                          {interval ===
                          "monthly"
                            ? "month"
                            : "year"}
                        </span>
                      </div>

                      {interval ===
                        "yearly" && (
                        <div className="mt-2 space-y-1">
                          <div className="text-sm font-semibold text-emerald-300">
                            Save{" "}
                            {money(
                              yearlySavings(
                                plan,
                              ),
                            )}{" "}
                            per year
                          </div>

                          <div className="text-xs text-white/35">
                            About{" "}
                            {money(
                              yearlyMonthlyEquivalent(
                                plan,
                              ),
                            )}
                            /month
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <PlanFeature>
                        <Users className="mr-1 inline h-4 w-4" />
                        {plan.seats}{" "}
                        {plan.seats ===
                        1
                          ? "employee account"
                          : "employee accounts"}
                      </PlanFeature>

                      <PlanFeature>
                        <Plug className="mr-1 inline h-4 w-4" />

                        {plan.integrations ===
                        null
                          ? "Unlimited supported POS integrations"
                          : `${plan.integrations} supported POS ${
                              plan.integrations ===
                              1
                                ? "integration"
                                : "integrations"
                            }`}
                      </PlanFeature>

                      <PlanFeature>
                        <Bot className="mr-1 inline h-4 w-4" />

                        {plan.virtualHours >
                        0
                          ? `${plan.virtualHours} Virtual Employee hours included monthly`
                          : `Virtual Employee available at ${money(
                              plan.virtualRate,
                            )}/hour`}
                      </PlanFeature>

                      {plan.virtualHours >
                        0 && (
                        <PlanFeature>
                          Additional Virtual Employee
                          time{" "}
                          {money(
                            plan.virtualRate,
                          )}
                          /hour
                        </PlanFeature>
                      )}

                      <PlanFeature>
                        <Headphones className="mr-1 inline h-4 w-4" />
                        {plan.support}
                      </PlanFeature>

                      <PlanFeature>
                        Custom business binders
                      </PlanFeature>

                      {plan.importExport && (
                        <PlanFeature>
                          <FileUp className="mr-1 inline h-4 w-4" />
                          Inventory import & export
                        </PlanFeature>
                      )}

                      {plan.analytics && (
                        <PlanFeature>
                          <BarChart3 className="mr-1 inline h-4 w-4" />
                          Business analytics
                        </PlanFeature>
                      )}

                      {plan.scan && (
                        <PlanFeature>
                          <QrCode className="mr-1 inline h-4 w-4" />
                          Card scanning tools
                        </PlanFeature>
                      )}
                    </div>

                    <div className="pt-2">
  {isCurrent ? (
    <Button
      disabled
      className="
        w-full rounded-xl
        border border-emerald-400/20
        bg-emerald-500/10
        text-emerald-200
        opacity-100
        disabled:pointer-events-none
        disabled:opacity-100
        disabled:bg-emerald-500/10
        disabled:text-emerald-200
      "
    >
      <ShieldCheck className="mr-2 h-4 w-4" />

      {entitlements.isTrialing
        ? "Current Trial Plan"
        : "Current Plan"}
    </Button>
  ) : (
    <Button
      disabled={!canManageBilling}
      className="
        w-full rounded-xl
        border border-rose-400/25
        bg-rose-500/10
        text-rose-200
        hover:bg-rose-500/20
        hover:text-rose-100
        disabled:pointer-events-none
        disabled:opacity-50
        disabled:bg-white/[0.04]
        disabled:text-white/30
      "
      title={
        !canManageBilling
          ? "Only the business owner can change plans."
          : "Checkout will be enabled when business payments are connected."
      }
    >
      <CreditCard className="mr-2 h-4 w-4" />

      {canManageBilling
        ? `Choose ${plan.name}`
        : "Owner Access Required"}
    </Button>
  )}

  {canManageBilling &&
    !isCurrent && (
      <p className="mt-2 text-center text-[11px] leading-4 text-white/35">
        Plan checkout is coming next. No subscription
        changes will be made yet.
      </p>
    )}
</div>
                  </CardContent>
                </Card>
              )
            },
          )}
        </section>

        {/* COMPARISON */}

        <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="mb-6">
            <Badge
              variant="outline"
              className="mb-3 border-white/10 text-white/45"
            >
              Plan Comparison
            </Badge>

            <h2 className="text-2xl font-black">
              Built for card businesses at
              every stage
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
              Upgrade as your inventory,
              employees, sales channels, and
              operational needs grow.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureBox
              icon={Users}
              title="Team Access"
              description="Give employees access without sharing the owner's login."
            />

            <FeatureBox
              icon={Plug}
              title="POS Integrations"
              description="Connect supported sales platforms while keeping company inventory isolated."
            />

            <FeatureBox
              icon={Bot}
              title="Virtual Employee"
              description="Use included monthly assistance or purchase additional hours as needed."
            />

            <FeatureBox
              icon={BarChart3}
              title="Analytics"
              description="Pro and Plus unlock business inventory analytics and operational insights."
            />

            <FeatureBox
              icon={FileUp}
              title="Import & Export"
              description="Move inventory into and out of Card Vault using business-focused tools."
            />

            <FeatureBox
              icon={ShieldCheck}
              title="Company Ownership"
              description="Inventory, binders, integrations, and billing belong to the business—not an individual employee."
            />
          </div>
        </section>

        {/* BILLING NOTICE */}

        <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-white/35" />

            <div>
              <h3 className="font-semibold">
                Business payment processing
              </h3>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/40">
                Plan selection is displayed
                here, but automatic business
                subscription checkout has not
                been connected yet. Your
                current trial and company
                subscription data remain
                unchanged until payment
                processing is deliberately
                configured.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function FeatureBox({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
        <Icon className="h-5 w-5 text-rose-300" />
      </div>

      <h3 className="font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/40">
        {description}
      </p>
    </div>
  )
}
