"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Loader2,
  Plus,
  Search,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  DialogTrigger,
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
  CASHAPP_CASHTAG,
  type SubscriptionTier,
} from "@/lib/entitlements"

interface AdminPayment {
  id: string

  user_id: string
  email: string

  invoice_number: string

  amount: number
  currency: string

  method: string

  status: "pending" | "confirmed" | "rejected"

  plan?: SubscriptionTier | null

  cashtag: string
  note: string

  period_start: string
  period_end: string

  created_at: string
  confirmed_at: string | null
}

interface AdminUser {
  id: string

  email: string | null

  storeName: string | null
  companyId: string | null

  isAdmin: boolean
  confirmed: boolean

  createdAt: string
  lastSignInAt: string | null

  subscriptionPlan?: "basic" | "premium" | null

  paidUntil?: string | null

  bannedUntil?: string | null
}

function fmt(iso: string | null | undefined) {
  if (!iso) {
    return "—"
  }

  const date = new Date(iso)

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

function planLabel(plan: SubscriptionTier | null | undefined) {
  if (plan === "basic") {
    return "Basic"
  }

  /**
   * Legacy payments without a plan
   * were full-access subscriptions.
   */
  return "Premium"
}

function planPrice(plan: SubscriptionTier) {
  return plan === "basic" ? BASIC_MONTHLY_PRICE_USD : PREMIUM_MONTHLY_PRICE_USD
}

function userDisplayName(user: AdminUser) {
  if (user.storeName && user.storeName.trim()) {
    return user.storeName.trim()
  }

  return user.email || "Unnamed account"
}

export function AdminPaymentsPanel() {
  const [payments, setPayments] = useState<AdminPayment[]>([])

  const [users, setUsers] = useState<AdminUser[]>([])

  const [loading, setLoading] = useState(true)

  const [usersLoading, setUsersLoading] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)

  const [creating, setCreating] = useState(false)

  /**
   * Selected customer.
   *
   * The Supabase UUID stays internal.
   * The admin never needs to enter it.
   */
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const [customerSearch, setCustomerSearch] = useState("")

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)

  const [plan, setPlan] = useState<SubscriptionTier>("premium")

  const [months, setMonths] = useState("1")

  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed")

  const [method, setMethod] = useState("manual")

  const [cashtag, setCashtag] = useState("")

  const [note, setNote] = useState("")

  /**
   * Load payment records.
   */
  const loadPayments = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/admin/payments", {
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load payments")
      }

      setPayments(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load payments",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load users for the customer picker.
   */
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)

    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load users")
      }

      setUsers(Array.isArray(data?.users) ? data.users : [])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load customer accounts",
      )
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  /**
   * Load users when Add Payment opens.
   *
   * We also refresh the list every time
   * so newly-created accounts appear.
   */
  useEffect(() => {
    if (!createOpen) {
      return
    }

    void loadUsers()
  }, [createOpen, loadUsers])

  const pending = useMemo(
    () => payments.filter((payment) => payment.status === "pending"),
    [payments],
  )

  const confirmed = useMemo(
    () => payments.filter((payment) => payment.status === "confirmed").length,
    [payments],
  )

  /**
   * Search customer accounts by:
   *
   * - email
   * - store/account name
   *
   * UUID is intentionally not required.
   */
  const filteredUsers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()

    const sorted = [...users].sort((a, b) =>
      userDisplayName(a).localeCompare(userDisplayName(b)),
    )

    if (!query) {
      return sorted.slice(0, 25)
    }

    return sorted
      .filter((user) => {
        const email = (user.email || "").toLowerCase()

        const storeName = (user.storeName || "").toLowerCase()

        return email.includes(query) || storeName.includes(query)
      })
      .slice(0, 25)
  }, [users, customerSearch])

  async function updateStatus(
    id: string,

    status: "confirmed" | "rejected",
  ) {
    setBusyId(id)

    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id,
          status,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update payment")
      }

      toast.success(
        status === "confirmed"
          ? "Payment confirmed — subscription activated"
          : "Payment rejected",
      )

      await loadPayments()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update that payment",
      )
    } finally {
      setBusyId(null)
    }
  }

  function selectCustomer(user: AdminUser) {
    setSelectedUser(user)

    setCustomerSearch("")

    setCustomerPickerOpen(false)
  }

  function clearCustomer() {
    setSelectedUser(null)

    setCustomerSearch("")

    setCustomerPickerOpen(true)
  }

  function resetCreateForm() {
    setSelectedUser(null)

    setCustomerSearch("")

    setCustomerPickerOpen(false)

    setPlan("premium")

    setMonths("1")

    setStatus("confirmed")

    setMethod("manual")

    setCashtag("")

    setNote("")
  }

  async function createPayment() {
    /**
     * No more manual UUID.
     *
     * It comes from the selected account.
     */
    if (!selectedUser) {
      toast.error("Select a customer account")

      setCustomerPickerOpen(true)

      return
    }

    const userId = selectedUser.id

    const email = selectedUser.email?.trim().toLowerCase() ?? ""

    if (!userId) {
      toast.error("The selected account has no user ID")

      return
    }

    if (!email) {
      toast.error("The selected account has no email address")

      return
    }

    const monthsValue = Number.parseInt(months, 10)

    if (!Number.isFinite(monthsValue) || monthsValue < 1) {
      toast.error("Enter a valid number of months")

      return
    }

    setCreating(true)

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          /**
           * UUID is sent internally.
           */
          userId,

          /**
           * Email comes from the same
           * selected Auth user.
           */
          email,

          plan,

          months: monthsValue,

          status,

          method,

          cashtag,

          note,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create payment")
      }

      toast.success(
        status === "confirmed"
          ? `${planLabel(plan)} subscription activated for ${email}`
          : `Pending payment created for ${email}`,
      )

      resetCreateForm()

      setCreateOpen(false)

      await loadPayments()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create payment",
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>

            <div>
              <CardTitle>Subscription Payments</CardTitle>

              <CardDescription>
                Review customer payments, activate Basic or Premium, and manage
                manual subscriptions.
              </CardDescription>
            </div>
          </div>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)

              if (!open) {
                resetCreateForm()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Subscription Payment</DialogTitle>

                <DialogDescription>
                  Select a customer, record a payment, and activate Basic or
                  Premium access.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* CUSTOMER PICKER */}
                <div className="space-y-2">
                  <Label>Customer Account</Label>

                  {selectedUser ? (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">
                                {userDisplayName(selectedUser)}
                              </p>

                              <Badge variant="outline" className="gap-1">
                                <Check className="h-3 w-3" />
                                Selected
                              </Badge>
                            </div>

                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {selectedUser.email || "No email"}
                            </p>

                            {selectedUser.subscriptionPlan && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Current plan:{" "}
                                <span className="font-medium capitalize">
                                  {selectedUser.subscriptionPlan}
                                </span>
                                {selectedUser.paidUntil &&
                                  ` · Paid through ${fmt(
                                    selectedUser.paidUntil,
                                  )}`}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearCustomer}
                          disabled={creating}
                        >
                          <X className="h-4 w-4" />

                          <span className="sr-only">Change customer</span>
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setCustomerPickerOpen(true)}
                        disabled={creating}
                      >
                        Change Customer
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-between px-4 py-3 text-left"
                      onClick={() => setCustomerPickerOpen(!customerPickerOpen)}
                    >
                      <div className="flex items-center gap-3">
                        <Search className="h-4 w-4 text-muted-foreground" />

                        <div>
                          <p>Select Customer</p>

                          <p className="text-xs font-normal text-muted-foreground">
                            Search by email or store name
                          </p>
                        </div>
                      </div>

                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}

                  {customerPickerOpen && (
                    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
                      <div className="border-b p-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                          <Input
                            autoFocus
                            value={customerSearch}
                            onChange={(event) =>
                              setCustomerSearch(event.target.value)
                            }
                            placeholder="Search email or store name..."
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto p-1">
                        {usersLoading ? (
                          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading customer accounts…
                          </div>
                        ) : filteredUsers.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No matching customers.
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => selectCustomer(user)}
                              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                                <User className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {userDisplayName(user)}
                                </p>

                                <p className="truncate text-xs text-muted-foreground">
                                  {user.email || "No email"}
                                </p>
                              </div>

                              {user.subscriptionPlan && (
                                <Badge
                                  variant={
                                    user.subscriptionPlan === "basic"
                                      ? "secondary"
                                      : "default"
                                  }
                                  className="shrink-0"
                                >
                                  {user.subscriptionPlan === "basic"
                                    ? "Basic"
                                    : "Premium"}
                                </Badge>
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      {users.length > 25 && !customerSearch && (
                        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                          Showing the first 25 accounts. Search to find a
                          specific customer.
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    The customer's Supabase user ID is selected automatically
                    and never needs to be entered manually.
                  </p>
                </div>

                {/* PLAN */}
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>

                  <Select
                    value={plan}
                    onValueChange={(value) =>
                      setPlan(value as SubscriptionTier)
                    }
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

                {/* MONTHS */}
                <div className="space-y-2">
                  <Label htmlFor="admin-payment-months">Months</Label>

                  <Input
                    id="admin-payment-months"
                    type="number"
                    min="1"
                    max="24"
                    value={months}
                    onChange={(event) => setMonths(event.target.value)}
                  />

                  <p className="text-xs text-muted-foreground">
                    Total: $
                    {(
                      planPrice(plan) * (Number.parseInt(months, 10) || 1)
                    ).toFixed(2)}
                  </p>
                </div>

                {/* STATUS */}
                <div className="space-y-2">
                  <Label>Status</Label>

                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(value as "pending" | "confirmed")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="confirmed">
                        Confirmed — activate now
                      </SelectItem>

                      <SelectItem value="pending">
                        Pending — review later
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PAYMENT METHOD */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>

                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>

                      <SelectItem value="cashapp">CashApp</SelectItem>

                      <SelectItem value="cash">Cash</SelectItem>

                      <SelectItem value="card">Card</SelectItem>

                      <SelectItem value="comp">Comp / Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CASHAPP */}
                {method === "cashapp" && (
                  <div className="space-y-2">
                    <Label htmlFor="admin-payment-cashtag">
                      Customer Cashtag
                    </Label>

                    <Input
                      id="admin-payment-cashtag"
                      value={cashtag}
                      onChange={(event) => setCashtag(event.target.value)}
                      placeholder="$customer"
                    />

                    <p className="text-xs text-muted-foreground">
                      Your payment destination is {CASHAPP_CASHTAG}.
                    </p>
                  </div>
                )}

                {/* NOTE */}
                <div className="space-y-2">
                  <Label htmlFor="admin-payment-note">Note</Label>

                  <Textarea
                    id="admin-payment-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional payment or subscription note..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>

                <Button
                  onClick={createPayment}
                  disabled={creating || !selectedUser}
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {status === "confirmed"
                    ? "Record & Activate"
                    : "Create Pending Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* SUMMARY */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Records</p>

            <p className="mt-1 text-2xl font-bold">{payments.length}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Confirmed</p>

            <p className="mt-1 text-2xl font-bold">{confirmed}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Awaiting Review</p>

            <p className="mt-1 text-2xl font-bold">{pending.length}</p>
          </div>
        </div>

        {/* PAYMENT LIST */}
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payments…
          </div>
        ) : payments.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No payments submitted yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">
                      {payment.email || "—"}
                    </p>

                    <Badge
                      variant={
                        payment.plan === "basic" ? "secondary" : "default"
                      }
                    >
                      {planLabel(payment.plan)}
                    </Badge>

                    {payment.status === "confirmed" && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Confirmed
                      </Badge>
                    )}

                    {payment.status === "rejected" && (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Rejected
                      </Badge>
                    )}

                    {payment.status === "pending" && (
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    ${Number(payment.amount).toFixed(2)}
                    {" · "}
                    {payment.invoice_number}
                    {" · "}
                    {payment.method || "unknown"}
                    {" · "}
                    {fmt(payment.created_at)}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Subscription period: {fmt(payment.period_start)} →{" "}
                    {fmt(payment.period_end)}
                  </p>

                  {payment.cashtag && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      CashApp: {payment.cashtag}
                    </p>
                  )}

                  {payment.note && (
                    <p className="mt-1 whitespace-pre-wrap text-xs italic text-muted-foreground">
                      “{payment.note}”
                    </p>
                  )}
                </div>

                {payment.status === "pending" && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === payment.id}
                      onClick={() => updateStatus(payment.id, "confirmed")}
                    >
                      {busyId === payment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === payment.id}
                      onClick={() => updateStatus(payment.id, "rejected")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
