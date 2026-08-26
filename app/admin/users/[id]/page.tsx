"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle,
  Crown,
  Edit,
  ExternalLink,
  KeyRound,
  Layers3,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Store,
  User,
  Wallet,
} from "lucide-react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
  type SubscriptionTier,
} from "@/lib/entitlements"

type Company = {
  id: string
  name: string
}

type UserDetails = {
  user: {
    id: string
    email: string | null
    storeName: string | null
    companyId: string | null
    company: Company | null
    isAdmin: boolean
    confirmed: boolean
    createdAt: string
    lastSignInAt: string | null
    bannedUntil: string | null
  }

  subscription: {
    plan: SubscriptionTier | null
    paidUntil: string | null
  }

  stats: {
    inventoryCount: number
    binderCount: number
    showcaseCount: number
    paymentCount: number
    confirmedPaymentCount: number
    totalPaid: number
  }

  binders: Array<{
    id: string
    name?: string | null
  }>

  showcases: Array<{
    id: string
    name?: string | null
    share_token?: string | null
  }>

  payments: Array<{
    id: string
    email: string
    invoice_number: string
    amount: number
    method: string
    status: "pending" | "confirmed" | "rejected"
    plan?: SubscriptionTier | null
    period_start: string
    period_end: string
    created_at: string
  }>
}

function fmt(value: string | null | undefined) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isSuspended(bannedUntil: string | null) {
  if (!bannedUntil) {
    return false
  }

  const value = new Date(bannedUntil).getTime()

  return Number.isFinite(value) && value > Date.now()
}

export default function AdminUserDetailPage() {
  const params = useParams<{
    id: string
  }>()

  const router = useRouter()

  const userId = params.id

  const [details, setDetails] = useState<UserDetails | null>(null)

  const [companies, setCompanies] = useState<Company[]>([])

  const [loading, setLoading] = useState(true)

  const [working, setWorking] = useState(false)

  const [editOpen, setEditOpen] = useState(false)

  const [subscriptionOpen, setSubscriptionOpen] = useState(false)

  const [email, setEmail] = useState("")

  const [storeName, setStoreName] = useState("")

  const [companyId, setCompanyId] = useState("none")

  const [password, setPassword] = useState("")

  const [plan, setPlan] = useState<SubscriptionTier>("premium")

  const [months, setMonths] = useState("1")

  const load = useCallback(async () => {
    if (!userId) {
      return
    }

    setLoading(true)

    try {
      const [detailsResponse, companiesResponse] = await Promise.all([
        fetch(`/api/admin/users/${userId}/details`, {
          cache: "no-store",
        }),

        fetch("/api/admin/companies", {
          cache: "no-store",
        }),
      ])

      const detailsData = await detailsResponse.json().catch(() => null)

      const companiesData = await companiesResponse.json().catch(() => null)

      if (!detailsResponse.ok) {
        throw new Error(detailsData?.error || "Failed to load user details")
      }

      if (!companiesResponse.ok) {
        throw new Error(companiesData?.error || "Failed to load companies")
      }

      const loaded = detailsData as UserDetails

      setDetails(loaded)

      setCompanies(
        Array.isArray(companiesData?.companies) ? companiesData.companies : [],
      )

      setEmail(loaded.user.email ?? "")

      setStoreName(loaded.user.storeName ?? "")

      setCompanyId(loaded.user.companyId ?? "none")

      setPlan(loaded.subscription.plan ?? "premium")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load user",
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const suspended = isSuspended(details?.user.bannedUntil ?? null)

  const recentPayments = useMemo(
    () => details?.payments.slice(0, 8) ?? [],
    [details],
  )

  async function saveAccount() {
    if (!details) {
      return
    }

    setWorking(true)

    try {
      const body: Record<string, unknown> = {
        email,
        storeName,

        companyId: companyId === "none" ? "" : companyId,
      }

      if (password.trim()) {
        body.password = password
      }

      const response = await fetch(`/api/admin/users/${details.user.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update account")
      }

      toast.success("Account updated")

      setPassword("")
      setEditOpen(false)

      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account",
      )
    } finally {
      setWorking(false)
    }
  }

  async function toggleSuspension() {
    if (!details) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${details.user.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          suspended: !suspended,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update account")
      }

      toast.success(suspended ? "Account reactivated" : "Account suspended")

      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account",
      )
    } finally {
      setWorking(false)
    }
  }

  async function grantSubscription() {
    if (!details) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/admin/users/${details.user.id}/subscription`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            action: "grant",

            plan,

            months: Number.parseInt(months, 10) || 1,
          }),
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update subscription")
      }

      toast.success("Subscription updated")

      setSubscriptionOpen(false)

      await load()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update subscription",
      )
    } finally {
      setWorking(false)
    }
  }

  async function changePlan(newPlan: SubscriptionTier) {
    if (!details) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/admin/users/${details.user.id}/subscription`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            action: "change_plan",

            plan: newPlan,
          }),
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to change plan")
      }

      toast.success(
        `Changed plan to ${newPlan === "basic" ? "Basic" : "Premium"}`,
      )

      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change plan",
      )
    } finally {
      setWorking(false)
    }
  }

  async function expireSubscription() {
    if (!details) {
      return
    }

    if (!confirm(`Expire ${details.user.email}'s subscription immediately?`)) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/admin/users/${details.user.id}/subscription`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            action: "expire_now",
          }),
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to expire subscription")
      }

      toast.success("Subscription expired")

      await load()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to expire subscription",
      )
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading user…
      </div>
    )
  }

  if (!details) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">User could not be loaded.</p>

            <Button className="mt-4" onClick={() => router.push("/admin")}>
              Back to Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 -ml-3" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {details.user.storeName || details.user.email || "User Account"}
            </h1>

            {details.user.isAdmin && (
              <Badge className="bg-amber-500 hover:bg-amber-500">
                <Crown className="mr-1 h-3 w-3" />
                Admin
              </Badge>
            )}

            {suspended && <Badge variant="destructive">Suspended</Badge>}

            {details.user.confirmed && (
              <Badge variant="outline">
                <CheckCircle className="mr-1 h-3 w-3" />
                Email Confirmed
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {details.user.email}
          </p>
          <Button variant="default" asChild>
            <Link href={`/admin/users/${userId}/inventory`}>
              <Package className="mr-2 h-4 w-4" />
              View Inventory
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Account
          </Button>

          {!details.user.isAdmin && (
            <Button
              variant={suspended ? "default" : "outline"}
              onClick={toggleSuspension}
              disabled={working}
            >
              <Ban className="mr-2 h-4 w-4" />

              {suspended ? "Reactivate" : "Suspend"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Inventory"
          value={details.stats.inventoryCount}
          icon={Package}
        />

        <StatCard
          title="Binders"
          value={details.stats.binderCount}
          icon={Layers3}
        />

        <StatCard
          title="Showcases"
          value={details.stats.showcaseCount}
          icon={Store}
        />

        <StatCard
          title="Payments"
          value={details.stats.confirmedPaymentCount}
          icon={Wallet}
        />

        <StatCard
          title="Total Paid"
          value={`$${details.stats.totalPaid.toFixed(2)}`}
          icon={Wallet}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <InfoRow label="Email" value={details.user.email || "—"} />

            <InfoRow label="Store" value={details.user.storeName || "—"} />

            <InfoRow
              label="Company"
              value={details.user.company?.name || "No company"}
            />

            <InfoRow label="Created" value={fmt(details.user.createdAt)} />

            <InfoRow
              label="Last Sign In"
              value={fmt(details.user.lastSignInAt)}
            />

            <InfoRow
              label="Status"
              value={suspended ? "Suspended" : "Active"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Subscription
            </CardTitle>

            <CardDescription>Manage Basic or Premium access.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <InfoRow
              label="Current Plan"
              value={
                details.subscription.plan
                  ? details.subscription.plan === "basic"
                    ? "Basic"
                    : "Premium"
                  : "None"
              }
            />

            <InfoRow
              label="Paid Through"
              value={fmt(details.subscription.paidUntil)}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => setSubscriptionOpen(true)}>
                <Wallet className="mr-2 h-4 w-4" />
                Grant / Extend
              </Button>

              {details.subscription.plan === "premium" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={working}
                  onClick={() => changePlan("basic")}
                >
                  Change to Basic
                </Button>
              )}

              {details.subscription.plan === "basic" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={working}
                  onClick={() => changePlan("premium")}
                >
                  Change to Premium
                </Button>
              )}

              {details.subscription.plan && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={working}
                  onClick={expireSubscription}
                >
                  Expire Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company
            </CardTitle>
          </CardHeader>

          <CardContent>
            {details.user.company ? (
              <div className="rounded-lg border p-4">
                <p className="font-medium">{details.user.company.name}</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Assigned company
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This account is not assigned to a company.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Binders</CardTitle>

            <CardDescription>
              {details.binders.length} binder
              {details.binders.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {details.binders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No binders found for this account.
              </p>
            ) : (
              <div className="space-y-2">
                {details.binders.map((binder) => (
                  <div
                    key={binder.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="font-medium">
                      {binder.name || "Binder"}
                    </span>

                    <Badge variant="outline">Binder</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Showcases</CardTitle>

            <CardDescription>
              {details.showcases.length} showcase
              {details.showcases.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {details.showcases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No showcases found for this account.
              </p>
            ) : (
              <div className="space-y-2">
                {details.showcases.map((showcase) => (
                  <div
                    key={showcase.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {showcase.name || "Showcase"}
                      </p>

                      {showcase.share_token && (
                        <p className="text-xs text-muted-foreground">
                          {showcase.share_token}
                        </p>
                      )}
                    </div>

                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>

          <CardDescription>
            Latest subscription transactions for this account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment history.</p>
          ) : (
            <div className="divide-y">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        ${Number(payment.amount).toFixed(2)}
                      </span>

                      <Badge
                        variant={
                          payment.status === "confirmed"
                            ? "default"
                            : payment.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>

                      <Badge variant="outline">
                        {payment.plan === "basic" ? "Basic" : "Premium"}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {payment.invoice_number} · {payment.method || "unknown"}
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground sm:text-right">
                    <p>
                      {fmt(payment.period_start)} → {fmt(payment.period_end)}
                    </p>

                    <p>{fmt(payment.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>

            <DialogDescription>
              Update account information and password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>

              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={details.user.isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label>Store / Account Name</Label>

              <Input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Company</Label>

              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">No Company</SelectItem>

                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>

              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  className="pl-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveAccount} disabled={working}>
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Grant / Extend Subscription</DialogTitle>

            <DialogDescription>
              Add Basic or Premium time to this account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan</Label>

              <Select
                value={plan}
                onValueChange={(value) => setPlan(value as SubscriptionTier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="basic">
                    Basic — ${BASIC_MONTHLY_PRICE_USD.toFixed(2)}
                    /month
                  </SelectItem>

                  <SelectItem value="premium">
                    Premium — ${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
                    /month
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Months</Label>

              <Input
                type="number"
                min="1"
                max="24"
                value={months}
                onChange={(event) => setMonths(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubscriptionOpen(false)}
            >
              Cancel
            </Button>

            <Button onClick={grantSubscription} disabled={working}>
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant / Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number | string
  icon: typeof Package
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{title}</p>

          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>

      <span className="text-right font-medium">{value}</span>
    </div>
  )
}