"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  FileUp,
  LifeBuoy,
  Loader2,
  Package,
  Plug,
  PlusCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
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

type CompanyRole =
  | "owner"
  | "manager"
  | "employee"

type AccountAccess = {
  authenticated: boolean

  accountType:
    | "individual"
    | "business"
    | "super_admin"
    | null

  isSuperAdmin: boolean

  user: {
    id: string
    email: string | null
  } | null

  company: {
    id: string
    name: string | null
    slug: string | null
    role: CompanyRole
    permissions?: Record<string, unknown>

    membershipStatus?: string | null

    subscriptionStatus?: string | null
    subscriptionPlan?: string | null
    billingInterval?: string | null

    trialPlan?: string | null
    trialStartedAt?: string | null
    trialEndsAt?: string | null

    includedSeats?: number | null
  } | null
}

type InventoryItem = {
  id?: string
  price?: number | string | null
  quantity?: number | string | null
  quantitySold?: number | string | null
}

const BUSINESS_PRICING = {
  starter: {
    name: "Starter",
    monthly: 9.99,
    yearly: 49.99,
  },

  pro: {
    name: "Pro",
    monthly: 19.99,
    yearly: 149.99,
  },

  plus: {
    name: "Plus",
    monthly: 29.99,
    yearly: 199.99,
  },
} as const

type BusinessPlan =
  keyof typeof BUSINESS_PRICING

function normalizePlan(
  plan?: string | null,
): BusinessPlan {
  const normalized =
    plan?.trim().toLowerCase()

  if (
    normalized === "starter" ||
    normalized === "pro" ||
    normalized === "plus"
  ) {
    return normalized
  }

  return "starter"
}

function formatRole(role: CompanyRole) {
  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  )
}

function money(value: number) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(value)
}

function daysRemaining(
  end?: string | null,
) {
  if (!end) return null

  const endTime =
    new Date(end).getTime()

  if (!Number.isFinite(endTime)) {
    return null
  }

  const difference =
    endTime - Date.now()

  return Math.max(
    0,
    Math.ceil(
      difference /
        (1000 * 60 * 60 * 24),
    ),
  )
}

function quantityOf(
  item: InventoryItem,
) {
  const quantity =
    Number(item.quantity)

  if (
    Number.isFinite(quantity) &&
    quantity > 0
  ) {
    return quantity
  }

  return 1
}

function inventoryValue(
  items: InventoryItem[],
) {
  return items.reduce(
    (total, item) => {
      const price =
        Number(item.price)

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return total
      }

      return (
        total +
        price * quantityOf(item)
      )
    },
    0,
  )
}

export default function BusinessDashboardPage() {
  const [
    access,
    setAccess,
  ] =
    useState<AccountAccess | null>(
      null,
    )

  const [
    inventory,
    setInventory,
  ] =
    useState<InventoryItem[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const accessResponse =
          await fetch(
            "/api/account/access",
            {
              cache: "no-store",
            },
          )

        if (!accessResponse.ok) {
          throw new Error(
            "Unable to load business access.",
          )
        }

        const accessData =
          (await accessResponse.json()) as AccountAccess

        if (!active) return

        setAccess(accessData)

        if (
          accessData.accountType !==
            "business" ||
          !accessData.company
        ) {
          setInventory([])
          return
        }

        const inventoryResponse =
          await fetch(
            "/api/inventory",
            {
              cache: "no-store",
            },
          )

        if (!inventoryResponse.ok) {
          throw new Error(
            "Unable to load business inventory.",
          )
        }

        const inventoryData =
          await inventoryResponse.json()

        if (!active) return

        setInventory(
          Array.isArray(inventoryData)
            ? inventoryData
            : [],
        )
      } catch (err) {
        if (!active) return

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the business dashboard.",
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const company =
    access?.company ?? null

  const role =
    company?.role ?? null

  const canManage =
    role === "owner" ||
    role === "manager"

  const isOwner =
    role === "owner"

  const planKey =
    normalizePlan(
      company?.trialPlan ||
        company?.subscriptionPlan,
    )

  const plan =
    BUSINESS_PRICING[planKey]

  const trialing =
    company?.subscriptionStatus ===
    "trialing"

  const trialDays =
    daysRemaining(
      company?.trialEndsAt,
    )

  const cardCount =
    useMemo(
      () =>
        inventory.reduce(
          (total, item) =>
            total +
            quantityOf(item),
          0,
        ),
      [inventory],
    )

  const totalValue =
    useMemo(
      () =>
        inventoryValue(inventory),
      [inventory],
    )

  const trialProgress =
    trialDays === null
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            ((7 - trialDays) / 7) *
              100,
          ),
        )

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading business dashboard…
          </div>
        </div>
      </main>
    )
  }

  if (
    !access?.authenticated
  ) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>
                Sign in required
              </CardTitle>

              <CardDescription className="text-white/45">
                Sign in to access your
                business dashboard.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Button asChild>
                <Link href="/login?redirect=/business">
                  Sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (
    access.accountType !==
      "business" ||
    !company
  ) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>
                Business account required
              </CardTitle>

              <CardDescription className="text-white/45">
                This area is reserved for
                business accounts.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/">
                  Return to dashboard
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
              >
                <Link href="/business/signup">
                  Create business account
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            HEADER
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-rose-500/10 via-white/[0.035] to-violet-500/10 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-rose-400/20 bg-rose-500/10 text-rose-200">
                  <Building2 className="mr-1 h-3.5 w-3.5" />
                  Business
                </Badge>

                <Badge
                  variant="outline"
                  className="border-white/10 text-white/60"
                >
                  {formatRole(
                    company.role,
                  )}
                </Badge>

                <Badge
                  variant="outline"
                  className="border-white/10 text-white/60"
                >
                  {plan.name}
                  {trialing
                    ? " Trial"
                    : ""}
                </Badge>
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  {company.name ||
                    "Business Dashboard"}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                  Manage your card
                  inventory, staff,
                  integrations, binders,
                  analytics, imports, and
                  subscription from one
                  place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-xl"
              >
                <Link href="/add">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Cards
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.03]"
              >
                <Link href="/inventory">
                  <Package className="mr-2 h-4 w-4" />
                  Inventory
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* =================================================
            BUSINESS TRIAL
        ================================================= */}

        {trialing && (
          <Card className="border-emerald-500/15 bg-emerald-500/[0.055] text-white">
            <CardContent className="p-6">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-3xl">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-300" />

                    <h2 className="font-bold">
                      {plan.name} Business
                      Trial
                      {trialDays !== null
                        ? ` — ${trialDays} day${
                            trialDays ===
                            1
                              ? ""
                              : "s"
                          } left`
                        : ""}
                    </h2>
                  </div>

                  <p className="text-sm leading-6 text-white/55">
                    You currently have
                    access to your{" "}
                    {plan.name} business
                    plan during the
                    7-day trial.
                    {planKey === "pro" &&
                      " Continue with Pro for $19.99/month or $149.99/year."}
                    {planKey ===
                      "starter" &&
                      " Continue with Starter for $9.99/month or $49.99/year."}
                    {planKey === "plus" &&
                      " Continue with Plus for $29.99/month or $199.99/year."}
                  </p>

                  {trialDays !== null && (
                    <div className="mt-4 max-w-xl">
                      <Progress
                        value={
                          trialProgress
                        }
                        className="h-2"
                      />
                    </div>
                  )}
                </div>

                {isOwner && (
                  <Button
                    asChild
                    variant="outline"
                    className="shrink-0 rounded-xl border-emerald-400/20 bg-emerald-400/5"
                  >
                    <Link href="/business/billing">
                      View Business Plans
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Boxes}
            label="Inventory"
            value={cardCount.toLocaleString()}
            detail={`${inventory.length.toLocaleString()} inventory ${
              inventory.length === 1
                ? "entry"
                : "entries"
            }`}
          />

          <StatCard
            icon={WalletCards}
            label="Inventory Value"
            value={money(totalValue)}
            detail="Based on saved inventory prices"
          />

          <StatCard
            icon={Users}
            label="Included Seats"
            value={String(
              company.includedSeats ??
                1,
            )}
            detail={`${formatRole(
              company.role,
            )} access`}
          />

          <StatCard
            icon={CreditCard}
            label="Business Plan"
            value={plan.name}
            detail={
              trialing
                ? `${trialDays ?? 0} trial days remaining`
                : company.billingInterval
                  ? `${company.billingInterval} billing`
                  : "Business subscription"
            }
          />
        </section>

        {/* =================================================
            OPERATIONS
        ================================================= */}

        <section>
          <SectionHeading
            title="Operations"
            description="Day-to-day tools for running your card inventory."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard
              icon={Package}
              title="Inventory"
              description="Search, edit, price, and manage company-owned cards."
              href="/inventory"
              action="Open Inventory"
            />

            <ActionCard
              icon={BookOpen}
              title="Business Binders"
              description="Organize inventory into company-owned binders and locations."
              href="/binders"
              action="Open Binders"
            />

            <ActionCard
              icon={BarChart3}
              title="Analytics"
              description="Track company inventory value, price movement, and sales."
              href="/analytics"
              action="View Analytics"
            />

            <ActionCard
              icon={FileUp}
              title="Import / Export"
              description="Move inventory into or out of Card Vault using bulk tools."
              href="/import"
              action="Import / Export"
            />
          </div>
        </section>

        {/* =================================================
            MANAGEMENT
        ================================================= */}

        <section>
          <SectionHeading
            title="Business Management"
            description="Manage the company, team, integrations, and subscription."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {canManage && (
              <ActionCard
                icon={Users}
                title="Team & Permissions"
                description="Invite employees and control what each team member can access."
                href="/business/team"
                action="Manage Team"
              />
            )}

            {canManage && (
              <ActionCard
                icon={Plug}
                title="Integrations"
                description="Manage POS, marketplace, payment, and inventory platforms."
                href="/business/integrations"
                action="Manage Integrations"
              />
            )}

            {isOwner && (
              <ActionCard
                icon={CreditCard}
                title="Billing & Plan"
                description={`${plan.name} business plan${
                  trialing
                    ? " currently in trial"
                    : ""
                }.`}
                href="/business/billing"
                action="Manage Billing"
              />
            )}

            {canManage && (
              <ActionCard
                icon={Settings}
                title="Business Settings"
                description="Update company information, addresses, and operational preferences."
                href="/business/settings"
                action="Business Settings"
              />
            )}

            <ActionCard
              icon={LifeBuoy}
              title="Business Support"
              description="Get help with your account, inventory, imports, and integrations."
              href="/support"
              action="Get Support"
            />

            <ActionCard
              icon={ShieldCheck}
              title="Account Access"
              description={`Signed in as ${formatRole(
                company.role,
              )} of ${
                company.name ||
                "this business"
              }.`}
              href="/settings"
              action="Account Settings"
            />
          </div>
        </section>

        {/* =================================================
            VIRTUAL EMPLOYEE
        ================================================= */}

        <section>
          <SectionHeading
            title="Virtual Employee"
            description="Optional hands-on assistance for repetitive inventory and catalog work."
          />

          <Card className="overflow-hidden border-white/10 bg-white/[0.025] text-white">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-[1fr_auto]">
                <div className="p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
                      <Clock3 className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-bold">
                        Virtual Employee
                        Hours
                      </h3>

                      <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">
                        Use assistance for
                        inventory cleanup,
                        imports, catalog
                        organization, and
                        other repetitive
                        business tasks.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {planKey ===
                          "starter" && (
                          <>
                            <Badge variant="outline">
                              0 included
                              hours
                            </Badge>

                            <Badge variant="outline">
                              $10/hour
                            </Badge>
                          </>
                        )}

                        {planKey ===
                          "pro" && (
                          <>
                            <Badge variant="outline">
                              4 hours/month
                              included
                            </Badge>

                            <Badge variant="outline">
                              $8/hour after
                            </Badge>
                          </>
                        )}

                        {planKey ===
                          "plus" && (
                          <>
                            <Badge variant="outline">
                              12 hours/month
                              included
                            </Badge>

                            <Badge variant="outline">
                              $5/hour after
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center border-t border-white/10 p-6 lg:border-l lg:border-t-0">
                  <Button
                    variant="outline"
                    disabled
                    className="rounded-xl border-white/10"
                  >
                    Coming Soon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* =================================================
            ACCOUNT DETAILS
        ================================================= */}

        <section className="pb-8">
          <SectionHeading
            title="Account"
            description="Current business account details."
          />

          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardContent className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <Detail
                label="Business"
                value={
                  company.name || "—"
                }
              />

              <Detail
                label="Role"
                value={formatRole(
                  company.role,
                )}
              />

              <Detail
                label="Plan"
                value={`${plan.name}${
                  trialing
                    ? " Trial"
                    : ""
                }`}
              />

              <Detail
                label="Trial Ends"
                value={
                  company.trialEndsAt
                    ? new Date(
                        company.trialEndsAt,
                      ).toLocaleDateString()
                    : "—"
                }
                icon={CalendarDays}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-white/40">
        {description}
      </p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Package
  label: string
  value: string
  detail: string
}) {
  return (
    <Card className="border-white/10 bg-white/[0.025] text-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              {label}
            </p>

            <p className="mt-2 text-2xl font-black">
              {value}
            </p>

            <p className="mt-1 text-xs text-white/35">
              {detail}
            </p>
          </div>

          <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-300">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: typeof Package
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <Card className="group border-white/10 bg-white/[0.025] text-white transition hover:border-white/20 hover:bg-white/[0.04]">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
          <Icon className="h-5 w-5" />
        </div>

        <CardTitle className="text-base">
          {title}
        </CardTitle>

        <CardDescription className="min-h-[48px] text-sm leading-6 text-white/40">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button
          asChild
          variant="ghost"
          className="-ml-3 rounded-xl text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <Link href={href}>
            {action}

            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof CalendarDays
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/30">
        {Icon && (
          <Icon className="h-3.5 w-3.5" />
        )}

        {label}
      </div>

      <div className="mt-2 font-semibold text-white/80">
        {value}
      </div>
    </div>
  )
}
