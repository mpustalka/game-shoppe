"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"

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
  payment_reference: string | null
  payment_submitted_at: string | null
  payment_confirmed_at: string | null

  shipping_service: string | null
  shipping_courier: string | null

  tracking_number: string | null
  tracking_url: string | null
  carrier: string | null

  created_at: string
  updated_at: string

  items: OrderItem[]
}

type OrderResponse = {
  order?: StoreOrder
  error?: string
}

function money(
  value:
    | number
    | string
    | null
    | undefined,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(Number(value ?? 0))
}

function dateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString()
}

function statusClass(
  value: string,
) {
  switch (value) {
    case "paid":
    case "fulfilled":
    case "delivered":
    case "shipped":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"

    case "failed":
    case "cancelled":
    case "refunded":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"

    case "pending":
    case "payment_pending":
    case "authorized":
    case "processing":
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${statusClass(
        value,
      )}`}
    >
      {value.replaceAll(
        "_",
        " ",
      )}
    </span>
  )
}

function PaymentMessage({
  order,
}: {
  order: StoreOrder
}) {
  if (
    order.payment_status ===
    "paid"
  ) {
    return (
      <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />

        <div>
          <p className="font-black text-emerald-600 dark:text-emerald-400">
            Payment confirmed
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Your payment has been
            verified. We'll continue
            processing your order.
          </p>
        </div>
      </div>
    )
  }

  if (
    order.payment_status ===
    "failed"
  ) {
    return (
      <div className="flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

        <div>
          <p className="font-black text-red-600 dark:text-red-400">
            Payment not confirmed
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            This payment was not
            confirmed. Please contact
            the store if you believe
            this is an error.
          </p>
        </div>
      </div>
    )
  }

  if (
    order.payment_provider ===
      "cashapp" &&
    order.payment_submitted_at
  ) {
    return (
      <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

        <div>
          <p className="font-black text-amber-600 dark:text-amber-400">
            Payment verification pending
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            You marked your Cash App
            payment as sent. We're
            waiting for the store to
            verify it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 rounded-2xl border bg-muted/30 p-4">
      <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

      <div>
        <p className="font-black">
          Payment pending
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          This order has not been
          marked paid yet.
        </p>
      </div>
    </div>
  )
}

export default function CustomerOrderPage() {
  const params = useParams<{
    id: string
  }>()

  const orderId =
    typeof params?.id === "string"
      ? params.id
      : ""

  const [order, setOrder] =
    useState<StoreOrder | null>(
      null,
    )

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const loadOrder =
    useCallback(
      async () => {
        if (!orderId) {
          return
        }

        setLoading(true)
        setError("")

        try {
          const response =
            await fetch(
              `/api/store/orders/${encodeURIComponent(
                orderId,
              )}`,
              {
                cache: "no-store",
                headers: {
                  Accept:
                    "application/json",
                },
              },
            )

          const data =
            (await response.json()) as OrderResponse

          if (!response.ok) {
            throw new Error(
              data.error ??
                "Unable to load order.",
            )
          }

          if (!data.order) {
            throw new Error(
              "Order not found.",
            )
          }

          setOrder(data.order)
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load order.",
          )
        } finally {
          setLoading(false)
        }
      },
      [orderId],
    )

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />

          <p className="mt-3 text-sm text-muted-foreground">
            Loading your order...
          </p>
        </div>
      </main>
    )
  }

  if (
    error ||
    !order
  ) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 text-xl font-black">
            Unable to load order
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error ||
              "Order not found."}
          </p>

          <div className="mt-5 flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadOrder()
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button asChild>
              <Link href="/store">
                Store
              </Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          className="-ml-3"
        >
          <Link href="/store">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void loadOrder()
          }
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-rose-500">
              <ShoppingBag className="h-4 w-4" />
              Order Details
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {order.order_number}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Placed{" "}
              {dateTime(
                order.created_at,
              )}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge
                value={
                  order.payment_status
                }
              />

              <StatusBadge
                value={
                  order.fulfillment_status
                }
              />
            </div>
          </div>

          <div className="lg:text-right">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Order Total
            </p>

            <p className="mt-1 text-3xl font-black">
              {money(
                order.total,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <PaymentMessage
          order={order}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b p-5">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-rose-500" />

              <h2 className="text-lg font-black">
                Items
              </h2>
            </div>
          </div>

          <div className="divide-y">
            {(order.items ?? []).map(
              (item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-5 p-5"
                >
                  <div>
                    <p className="font-black">
                      {
                        item.product_name
                      }
                    </p>

                    {item.variant_name && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {
                          item.variant_name
                        }
                      </p>
                    )}

                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.purchase_type ===
                      "case"
                        ? "Case"
                        : "Single"}{" "}
                      × {item.quantity}
                    </p>

                    {item.sku && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        SKU {item.sku}
                      </p>
                    )}

                    {item.is_preorder && (
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-500">
                        Pre-order
                        {item.release_date
                          ? ` · Release ${item.release_date}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-black">
                      {money(
                        item.line_total,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {money(
                        item.unit_price,
                      )}{" "}
                      each
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-black">
              Order Summary
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Subtotal
                </span>

                <span>
                  {money(
                    order.subtotal,
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Shipping
                </span>

                <span>
                  {money(
                    order.shipping_amount,
                  )}
                </span>
              </div>

              {Number(
                order.tax_amount ??
                  0,
              ) > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Tax
                  </span>

                  <span>
                    {money(
                      order.tax_amount,
                    )}
                  </span>
                </div>
              )}

              {Number(
                order.discount_amount ??
                  0,
              ) > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Discount
                  </span>

                  <span>
                    -
                    {money(
                      order.discount_amount,
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-4 border-t pt-3 text-base font-black">
                <span>Total</span>

                <span>
                  {money(
                    order.total,
                  )}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-rose-500" />

              <h2 className="font-black">
                Shipping
              </h2>
            </div>

            <div className="mt-4 text-sm">
              <p className="font-bold">
                {order.shipping_name ||
                  order.customer_name ||
                  "—"}
              </p>

              <div className="mt-2 text-muted-foreground">
                <p>
                  {
                    order.shipping_address1
                  }
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

                <p>
                  {
                    order.shipping_country
                  }
                </p>
              </div>

              {(order.shipping_courier ||
                order.shipping_service) && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Shipping Method
                  </p>

                  <p className="mt-1 font-bold">
                    {[
                      order.shipping_courier,
                      order.shipping_service,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              )}

              {order.tracking_number && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Tracking
                  </p>

                  {order.tracking_url ? (
                    <a
                      href={
                        order.tracking_url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-bold text-rose-500 hover:underline"
                    >
                      {
                        order.tracking_number
                      }

                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="mt-1 font-bold">
                      {
                        order.tracking_number
                      }
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-black">
              Payment
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Method
                </span>

                <span className="font-bold">
                  {order.payment_provider ===
                  "cashapp"
                    ? "Cash App"
                    : order.payment_provider ||
                      "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Status
                </span>

                <span className="font-bold capitalize">
                  {order.payment_status.replaceAll(
                    "_",
                    " ",
                  )}
                </span>
              </div>

              {order.payment_reference && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Payment Note
                  </span>

                  <span className="font-bold">
                    {
                      order.payment_reference
                    }
                  </span>
                </div>
              )}

              {order.payment_confirmed_at && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Confirmed
                  </span>

                  <span className="text-right font-bold">
                    {dateTime(
                      order.payment_confirmed_at,
                    )}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}