"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useRouter } from "next/navigation"

import {
  Ban,
  Building2,
  CheckCircle,
  Crown,
  Edit,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"

import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/auth"

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
  type SubscriptionTier,
} from "@/lib/entitlements"

import { AdminPaymentsPanel } from "@/components/admin/admin-payments-panel"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AdminUser = {
  id: string

  email: string | null

  storeName: string | null
  companyId: string | null

  isAdmin: boolean
  confirmed: boolean

  createdAt: string
  lastSignInAt: string | null

  subscriptionPlan: "basic" | "premium" | null

  paidUntil: string | null

  bannedUntil: string | null
}

type Company = {
  id: string
  name: string
  created_at: string
  userCount?: number
}

const NO_COMPANY = "none"

function formatDate(value: string | null | undefined) {
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

function isSuspended(user: AdminUser) {
  if (!user.bannedUntil) {
    return false
  }

  const bannedUntil = new Date(user.bannedUntil).getTime()

  return Number.isFinite(bannedUntil) && bannedUntil > Date.now()
}

export default function AdminPage() {
  const router = useRouter()

  const [ready, setReady] = useState(false)

  const [allowed, setAllowed] = useState(false)

  /**
   * Client-side convenience gate.
   *
   * Real security remains enforced by
   * requireAdmin() in every admin API.
   */
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?redirect=/admin")

        return
      }

      if (!isAdminUser(data.user)) {
        toast.error("Admin access required")

        router.replace("/")

        return
      }

      setAllowed(true)
      setReady(true)
    })
  }, [router])

  if (!ready || !allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking access…
      </div>
    )
  }

  return <AdminPortal />
}

function AdminPortal() {
  const [users, setUsers] = useState<AdminUser[]>([])

  const [companies, setCompanies] = useState<Company[]>([])

  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [userResponse, companyResponse] = await Promise.all([
        fetch("/api/admin/users", {
          cache: "no-store",
        }),

        fetch("/api/admin/companies", {
          cache: "no-store",
        }),
      ])

      const userData = await userResponse.json().catch(() => null)

      const companyData = await companyResponse.json().catch(() => null)

      if (!userResponse.ok) {
        throw new Error(userData?.error || "Failed to load users")
      }

      if (!companyResponse.ok) {
        throw new Error(companyData?.error || "Failed to load companies")
      }

      setUsers(userData?.users ?? [])

      setCompanies(companyData?.companies ?? [])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load admin data",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const companyName = useCallback(
    (id: string | null) =>
      companies.find((company) => company.id === id)?.name ?? null,
    [companies],
  )

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return users
    }

    return users.filter((user) => {
      const company = companyName(user.companyId)

      return [user.email, user.storeName, company, user.subscriptionPlan]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [users, search, companyName])

  const basicUsers = users.filter(
    (user) => user.subscriptionPlan === "basic",
  ).length

  const premiumUsers = users.filter(
    (user) => user.subscriptionPlan === "premium",
  ).length

  const suspendedUsers = users.filter(isSuspended).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Control Center
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage users, companies, subscriptions, payments and account
              access.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Users" value={users.length} icon={Users} />

        <SummaryCard
          label="Companies"
          value={companies.length}
          icon={Building2}
        />

        <SummaryCard label="Basic" value={basicUsers} icon={Wallet} />

        <SummaryCard label="Premium" value={premiumUsers} icon={Crown} />

        <SummaryCard label="Suspended" value={suspendedUsers} icon={Ban} />
      </div>

      {/* Creation */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CreateUserCard companies={companies} onCreated={load} />

        <CompanyManager companies={companies} onChanged={load} />
      </div>

      {/* Users */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Users ({users.length})
              </CardTitle>

              <CardDescription>
                Manage customer accounts, passwords, companies, subscriptions
                and access.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading users…
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No matching users.
            </p>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  companies={companies}
                  companyName={companyName(user.companyId)}
                  onChanged={load}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <div className="mt-6">
        <AdminPaymentsPanel />
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Users
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{label}</p>

          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateUserCard({
  companies,
  onCreated,
}: {
  companies: Company[]
  onCreated: () => void
}) {
  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [storeName, setStoreName] = useState("")

  const [companyId, setCompanyId] = useState<string>(NO_COMPANY)

  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()

    setSaving(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
          storeName,

          companyId: companyId === NO_COMPANY ? "" : companyId,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create user")
      }

      toast.success(`Created ${email}`)

      setEmail("")
      setPassword("")
      setStoreName("")
      setCompanyId(NO_COMPANY)

      onCreated()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create user",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" />
          Create User
        </CardTitle>

        <CardDescription>
          Create a normal customer account. Administrator privileges cannot be
          granted here.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>

            <Input
              id="new-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Temporary Password</Label>

            <Input
              id="new-password"
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <p className="text-xs text-muted-foreground">
              Minimum 8 characters.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-store">Store / Account Name</Label>

            <Input
              id="new-store"
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
                <SelectItem value={NO_COMPANY}>No Company</SelectItem>

                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CompanyManager({
  companies,
  onChanged,
}: {
  companies: Company[]
  onChanged: () => void
}) {
  const [name, setName] = useState("")

  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<Company | null>(null)

  const [editName, setEditName] = useState("")

  async function createCompany(event: React.FormEvent) {
    event.preventDefault()

    setSaving(true)

    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create company")
      }

      toast.success(`Created ${name}`)

      setName("")

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create company",
      )
    } finally {
      setSaving(false)
    }
  }

  async function renameCompany() {
    if (!editing) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/admin/companies", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: editing.id,

          name: editName,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to rename company")
      }

      toast.success("Company renamed")

      setEditing(null)
      setEditName("")

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename company",
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeCompany(company: Company) {
    if (!confirm(`Delete "${company.name}"?`)) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        `/api/admin/companies?id=${encodeURIComponent(company.id)}`,
        {
          method: "DELETE",
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete company")
      }

      toast.success("Company deleted")

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete company",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Companies ({companies.length})
          </CardTitle>

          <CardDescription>
            Create and manage companies used to group customer accounts.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={createCompany} className="flex gap-2">
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Company name"
            />

            <Button type="submit" disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </form>

          <div className="mt-5 space-y-2">
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No companies yet.</p>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{company.name}</p>

                    <p className="text-xs text-muted-foreground">
                      {company.userCount ?? 0} user
                      {(company.userCount ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(company)

                        setEditName(company.name)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={saving}
                      onClick={() => removeCompany(company)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Company</DialogTitle>

            <DialogDescription>
              Update the company name used throughout the admin portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Company Name</Label>

            <Input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>

            <Button onClick={renameCompany} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function UserRow({
  user,
  companies,
  companyName,
  onChanged,
}: {
  user: AdminUser
  companies: Company[]
  companyName: string | null
  onChanged: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)

  const [subscriptionOpen, setSubscriptionOpen] = useState(false)

  const [working, setWorking] = useState(false)

  const [email, setEmail] = useState(user.email ?? "")

  const [storeName, setStoreName] = useState(user.storeName ?? "")

  const [companyId, setCompanyId] = useState<string>(
    user.companyId ?? NO_COMPANY,
  )

  const [newPassword, setNewPassword] = useState("")

  const [plan, setPlan] = useState<SubscriptionTier>(
    user.subscriptionPlan ?? "premium",
  )

  const [months, setMonths] = useState("1")

  const suspended = isSuspended(user)

  async function saveAccount() {
    setWorking(true)

    try {
      const body: Record<string, unknown> = {
        email,
        storeName,

        companyId: companyId === NO_COMPANY ? "" : companyId,
      }

      if (newPassword.trim()) {
        body.password = newPassword
      }

      const response = await fetch(`/api/admin/users/${user.id}`, {
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

      setNewPassword("")
      setEditOpen(false)

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account",
      )
    } finally {
      setWorking(false)
    }
  }

  async function toggleSuspension() {
    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
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

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account",
      )
    } finally {
      setWorking(false)
    }
  }

  async function confirmEmail() {
    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          confirmEmail: true,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to confirm email")
      }

      toast.success("Email confirmed")

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to confirm email",
      )
    } finally {
      setWorking(false)
    }
  }

  /**
   * Grant or extend subscription.
   *
   * Uses the new per-user subscription API.
   */
  async function grantSubscription() {
    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "grant",

          plan,

          months: Number.parseInt(months, 10) || 1,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to activate subscription")
      }

      toast.success(
        `${plan === "basic" ? "Basic" : "Premium"} subscription activated`,
      )

      setSubscriptionOpen(false)

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to activate subscription",
      )
    } finally {
      setWorking(false)
    }
  }

  /**
   * Change an existing paid period
   * from Basic ↔ Premium.
   */
  async function changeCurrentPlan(newPlan: SubscriptionTier) {
    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "change_plan",

          plan: newPlan,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to change subscription plan")
      }

      toast.success(
        `Changed subscription to ${newPlan === "basic" ? "Basic" : "Premium"}`,
      )

      setPlan(newPlan)

      setSubscriptionOpen(false)

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to change subscription",
      )
    } finally {
      setWorking(false)
    }
  }

  /**
   * Immediately end current paid access.
   */
  async function expireSubscription() {
    if (!confirm(`Expire ${user.email}'s subscription immediately?`)) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "expire_now",
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to expire subscription")
      }

      toast.success("Subscription expired")

      setSubscriptionOpen(false)

      onChanged()
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

  async function remove() {
    if (!confirm(`Permanently delete ${user.email}? This cannot be undone.`)) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete user")
      }

      toast.success("User deleted")

      onChanged()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user",
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />

            <span className="truncate font-medium">
              {user.email || "No email"}
            </span>

            {user.isAdmin && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                <Crown className="mr-1 h-3 w-3" />
                Owner Admin
              </Badge>
            )}

            {!user.confirmed && <Badge variant="outline">Unconfirmed</Badge>}

            {suspended && <Badge variant="destructive">Suspended</Badge>}

            {user.subscriptionPlan === "basic" && (
              <Badge variant="secondary">Basic</Badge>
            )}

            {user.subscriptionPlan === "premium" && <Badge>Premium</Badge>}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {user.storeName ? `${user.storeName} · ` : ""}

            {companyName ? `${companyName} · ` : ""}

            {user.lastSignInAt
              ? `Last sign-in ${formatDate(user.lastSignInAt)}`
              : "Never signed in"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Created {formatDate(user.createdAt)}
            {user.paidUntil
              ? ` · Paid until ${formatDate(user.paidUntil)}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!user.confirmed && (
            <Button
              variant="outline"
              size="sm"
              onClick={confirmEmail}
              disabled={working}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Email
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            disabled={working}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>

          {!user.isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubscriptionOpen(true)}
                disabled={working}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Subscription
              </Button>

              <Button
                variant={suspended ? "default" : "outline"}
                size="sm"
                onClick={toggleSuspension}
                disabled={working}
              >
                <Ban className="mr-2 h-4 w-4" />

                {suspended ? "Reactivate" : "Suspend"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={remove}
                disabled={working}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit Account */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>

            <DialogDescription>
              Manage account details for {user.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>

              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={user.isAdmin}
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
                  <SelectItem value={NO_COMPANY}>No Company</SelectItem>

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

              <Input
                type="text"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Leave blank to keep current password"
              />

              <p className="text-xs text-muted-foreground">
                Minimum 8 characters.
              </p>
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

      {/* Subscription Manager */}
      <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>

            <DialogDescription>
              Manage Basic or Premium access for {user.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Current status */}
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Current plan</span>

                <strong className="capitalize">
                  {user.subscriptionPlan ?? "None"}
                </strong>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Paid through</span>

                <strong>{formatDate(user.paidUntil)}</strong>
              </div>
            </div>

            {/* Existing subscription actions */}
            {user.subscriptionPlan && (
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <p className="font-medium">Current Subscription</p>

                  <p className="text-xs text-muted-foreground">
                    Change the current tier without changing the paid through
                    date.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {user.subscriptionPlan !== "basic" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={working}
                      onClick={() => changeCurrentPlan("basic")}
                    >
                      Change to Basic
                    </Button>
                  )}

                  {user.subscriptionPlan !== "premium" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={working}
                      onClick={() => changeCurrentPlan("premium")}
                    >
                      Change to Premium
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={working}
                    onClick={expireSubscription}
                  >
                    Expire Now
                  </Button>
                </div>
              </div>
            )}

            {/* Grant/extend */}
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <p className="font-medium">Grant / Extend Subscription</p>

                <p className="text-xs text-muted-foreground">
                  Adds a confirmed subscription period. If already paid ahead,
                  the new time is added to the end.
                </p>
              </div>

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
                <Label>Number of Months</Label>

                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={months}
                  onChange={(event) => setMonths(event.target.value)}
                />

                <p className="text-xs text-muted-foreground">
                  {plan === "basic"
                    ? `Basic: $${BASIC_MONTHLY_PRICE_USD.toFixed(2)}/month`
                    : `Premium: $${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}/month`}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubscriptionOpen(false)}
              disabled={working}
            >
              Cancel
            </Button>

            <Button onClick={grantSubscription} disabled={working}>
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

              {user.subscriptionPlan
                ? "Extend Subscription"
                : "Grant Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
