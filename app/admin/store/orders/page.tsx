"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type OrderItem = {
  id: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  variant_name: string | null
  sku: string | null
  purchase_type: "single" | "case"
  quantity: number
  unit_price: number
  line_total: number
  is_preorder: boolean
  release_date: string | null
}

type StoreOrder = {
  id: string
  user_id: string
  order_number: string
  status: string
  payment_status: string
  fulfillment_status: string

  subtotal: number
  shipping_amount: number
  tax_amount: number
  discount_amount: number
  total: number

  customer_email: string | null
  customer_name: string | null

  shipping_name: string | null
  shipping_address1: string | null
  shipping_address2: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_postal_code: string | null
  shipping_country: string | null

  payment_provider: string | null
  payment_id: string | null
  payment_reference: string | null
  payment_submitted_at: string | null
  payment_confirmed_at: string | null
  inventory_finalized_at: string | null

  shipping_rate_id: string | null
  shipping_service: string | null
  shipping_courier: string | null

  tracking_number: string | null
  tracking_url: string | null
  carrier: string | null

  customer_notes: string | null
  admin_notes: string | null

  created_at: string
  updated_at: string

  items: OrderItem[]
}

type OrdersResponse = {
  orders?: StoreOrder[]
  error?: string
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0))
}

function dateTime(value: string | null | undefined) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function badgeClass(value: string) {
  switch (value) {
    case "paid":
    case "fulfilled":
    case "delivered":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"

    case "failed":
    case "cancelled":
    case "refunded":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"

    case "payment_pending":
    case "pending":
    case "authorized":
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"

    default:
      return "border-border bg-muted/40 text-muted-foreground"
  }
}

function StatusBadge({
  value,
}: {
  value: string
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${badgeClass(
        value,
      )}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  )
}

export default function AdminStoreOrdersPage() {
  const [orders, setOrders] =
    useState<StoreOrder[]>([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState("")
  const [message, setMessage] =
    useState("")
  const [search, setSearch] =
    useState("")
  const [filter, setFilter] =
    useState("all")
  const [workingId, setWorkingId] =
    useState<string | null>(null)

  const loadOrders = useCallback(
    async () => {
      setLoading(true)
      setError("")

      try {
        const response = await fetch(
          "/api/admin/store/orders",
          {
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        )

        const data =
          (await response.json()) as OrdersResponse

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load orders.",
          )
        }

        setOrders(data.orders ?? [])
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load orders.",
        )
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const filteredOrders =
    useMemo(() => {
      const query =
        search.trim().toLowerCase()

      return orders.filter(
        (order) => {
          if (
            filter === "submitted" &&
            !(
              order.payment_provider ===
                "cashapp" &&
              order.payment_status ===
                "pending" &&
              order.payment_submitted_at
            )
          ) {
            return false
          }

          if (
            filter === "paid" &&
            order.payment_status !==
              "paid"
          ) {
            return false
          }

          if (
            filter === "failed" &&
            order.payment_status !==
              "failed"
          ) {
            return false
          }

          if (!query) {
            return true
          }

          return [
            order.order_number,
            order.customer_name,
            order.customer_email,
            order.payment_reference,
            order.shipping_name,
            order.shipping_city,
            order.shipping_state,
            ...(order.items ?? []).flatMap(
              (item) => [
                item.product_name,
                item.variant_name,
                item.sku,
              ],
            ),
          ].some((value) =>
            value
              ?.toLowerCase()
              .includes(query),
          )
        },
      )
    }, [
      orders,
      search,
      filter,
    ])

  const pendingCount =
    orders.filter(
      (order) =>
        order.payment_provider ===
          "cashapp" &&
        order.payment_status ===
          "pending" &&
        Boolean(
          order.payment_submitted_at,
        ),
    ).length

  const paidCount =
    orders.filter(
      (order) =>
        order.payment_status ===
        "paid",
    ).length

  async function paymentAction(
    order: StoreOrder,
    action: "confirm" | "reject",
  ) {
    if (workingId) {
      return
    }

    const verb =
      action === "confirm"
        ? "confirm"
        : "reject"

    const confirmed =
      window.confirm(
        action === "confirm"
          ? `Confirm Cash App payment of ${money(
              order.total,
            )} for ${order.order_number}? Inventory will be deducted.`
          : `Reject the Cash App payment for ${order.order_number}? Inventory will NOT be deducted.`,
      )

    if (!confirmed) {
      return
    }

    setWorkingId(order.id)
    setError("")
    setMessage("")

    try {
      const response = await fetch(
        `/api/admin/store/orders/${encodeURIComponent(
          order.id,
        )}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          body: JSON.stringify({
            action,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            `Unable to ${verb} payment.`,
        )
      }

      setMessage(
        action === "confirm"
          ? `${order.order_number} is paid and inventory has been finalized.`
          : `${order.order_number} payment was rejected. No inventory was changed.`,
      )

      await loadOrders()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : `Unable to ${verb} payment.`,
      )
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Button
        asChild
        variant="ghost"
        className="-ml-3 mb-4"
      >
        <Link href="/admin/store">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Store Products
        </Link>
      </Button>

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-rose-500">
            <ShoppingBag className="h-4 w-4" />
            Store Administration
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Store Orders
          </h1>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            Review customer orders and verify submitted Cash App payments.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void loadOrders()
          }
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Total Orders
          </p>
          <p className="mt-2 text-3xl font-black">
            {orders.length}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Cash App Submitted
          </p>
          <p className="mt-2 text-3xl font-black text-amber-500">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Paid
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-500">
            {paidCount}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-500">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {message}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search order, customer, product, SKU..."
            className="pl-9"
          />
        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(
              event.target.value,
            )
          }
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">
            All Orders
          </option>
          <option value="submitted">
            Cash App Submitted
          </option>
          <option value="paid">
            Paid
          </option>
          <option value="failed">
            Failed / Rejected
          </option>
        </select>
      </div>

      {loading && (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading orders...
            </p>
          </div>
        </div>
      )}

      {!loading &&
        filteredOrders.length === 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-lg font-black">
              No orders found
            </h2>
          </div>
        )}

      {!loading &&
        filteredOrders.length > 0 && (
          <div className="mt-6 space-y-5">
            {filteredOrders.map(
              (order) => {
                const canReviewCashApp =
                  order.payment_provider ===
                    "cashapp" &&
                  order.payment_status ===
                    "pending" &&
                  Boolean(
                    order.payment_submitted_at,
                  ) &&
                  !order.inventory_finalized_at

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-2xl border bg-card"
                  >
                    <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black">
                            {order.order_number}
                          </h2>

                          <StatusBadge
                            value={
                              order.payment_status
                            }
                          />

                          <StatusBadge
                            value={
                              order.status
                            }
                          />
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Created{" "}
                          {dateTime(
                            order.created_at,
                          )}
                        </p>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-2xl font-black">
                          {money(
                            order.total,
                          )}
                        </p>

                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {order.payment_provider ??
                            "No payment provider"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr_1.2fr]">
                      <section>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Customer
                        </p>

                        <p className="mt-2 font-bold">
                          {order.customer_name ||
                            order.shipping_name ||
                            "—"}
                        </p>

                        <p className="mt-1 break-all text-sm text-muted-foreground">
                          {order.customer_email ||
                            "—"}
                        </p>

                        <div className="mt-4 text-sm text-muted-foreground">
                          <p>
                            {order.shipping_address1}
                          </p>

                          {order.shipping_address2 && (
                            <p>
                              {
                                order.shipping_address2
                              }
                            </p>
                          )}

                          <p>
                            {[
                              order.shipping_city,
                              order.shipping_state,
                              order.shipping_postal_code,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      </section>

                      <section>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Payment
                        </p>

                        <div className="mt-2 space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Expected:{" "}
                            </span>
                            <strong>
                              {money(
                                order.total,
                              )}
                            </strong>
                          </div>

                          <div>
                            <span className="text-muted-foreground">
                              Note:{" "}
                            </span>
                            <strong>
                              {order.payment_reference ||
                                order.order_number}
                            </strong>
                          </div>

                          <div>
                            <span className="text-muted-foreground">
                              Submitted:{" "}
                            </span>
                            <strong>
                              {dateTime(
                                order.payment_submitted_at,
                              )}
                            </strong>
                          </div>

                          <div>
                            <span className="text-muted-foreground">
                              Confirmed:{" "}
                            </span>
                            <strong>
                              {dateTime(
                                order.payment_confirmed_at,
                              )}
                            </strong>
                          </div>
                        </div>
                      </section>

                      <section>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Items
                        </p>

                        <div className="mt-2 space-y-3">
                          {(order.items ?? []).map(
                            (item) => (
                              <div
                                key={item.id}
                                className="flex justify-between gap-4 text-sm"
                              >
                                <div>
                                  <p className="font-bold">
                                    {
                                      item.product_name
                                    }
                                  </p>

                                  <p className="text-xs text-muted-foreground">
                                    {item.variant_name
                                      ? `${item.variant_name} · `
                                      : ""}
                                    {item.purchase_type ===
                                    "case"
                                      ? "Case"
                                      : "Single"}{" "}
                                    ×{" "}
                                    {
                                      item.quantity
                                    }
                                  </p>

                                  {item.sku && (
                                    <p className="text-xs text-muted-foreground">
                                      SKU{" "}
                                      {
                                        item.sku
                                      }
                                    </p>
                                  )}
                                </div>

                                <strong>
                                  {money(
                                    item.line_total,
                                  )}
                                </strong>
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="flex flex-col gap-4 border-t bg-muted/20 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        {order.inventory_finalized_at ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : order.payment_status ===
                          "failed" ? (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        ) : (
                          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        )}

                        <span>
                          {order.inventory_finalized_at
                            ? `Inventory finalized ${dateTime(
                                order.inventory_finalized_at,
                              )}`
                            : order.payment_status ===
                                "failed"
                              ? "Payment rejected. Inventory was not deducted."
                              : order.payment_submitted_at
                                ? "Customer says payment was sent. Verify it in Cash App before confirming."
                                : "Waiting for the customer to submit payment."}
                        </span>
                      </div>

                      {canReviewCashApp && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              workingId ===
                              order.id
                            }
                            onClick={() =>
                              void paymentAction(
                                order,
                                "reject",
                              )
                            }
                          >
                            {workingId ===
                            order.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            Reject Payment
                          </Button>

                          <Button
                            type="button"
                            disabled={
                              workingId ===
                              order.id
                            }
                            onClick={() =>
                              void paymentAction(
                                order,
                                "confirm",
                              )
                            }
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            {workingId ===
                            order.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Confirm Payment
                          </Button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
    </main>
  )
}