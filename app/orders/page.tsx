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
  ChevronRight,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type StoreOrder = {
  id: string
  order_number: string
  status: string
  payment_status: string
  fulfillment_status: string
  total: number
  payment_provider: string | null
  payment_submitted_at: string | null
  created_at: string
  items?: Array<{
    id: string
    product_name: string
    variant_name: string | null
    quantity: number
  }>
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

function date(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
}

function badgeClass(value: string) {
  if (["paid", "fulfilled", "delivered", "shipped"].includes(value)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  }

  if (["failed", "cancelled", "refunded"].includes(value)) {
    return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${badgeClass(value)}`}>
      {value.replaceAll("_", " ")}
    </span>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/store/orders", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })

      const data = (await response.json()) as OrdersResponse

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load your orders.")
      }

      setOrders(data.orders ?? [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load your orders.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return orders

    return orders.filter((order) =>
      [
        order.order_number,
        order.payment_status,
        order.fulfillment_status,
        ...(order.items ?? []).flatMap((item) => [
          item.product_name,
          item.variant_name,
        ]),
      ].some((value) => value?.toLowerCase().includes(query)),
    )
  }, [orders, search])

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Button asChild variant="ghost" className="-ml-3 mb-3">
            <Link href="/store">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Store
            </Link>
          </Button>

          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-rose-500">
            <ShoppingBag className="h-4 w-4" />
            Your Account
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            My Orders
          </h1>

          <p className="mt-2 text-muted-foreground">
            View your purchases, payment status, fulfillment and tracking.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadOrders()}
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

      <div className="relative mt-7">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search orders or products..."
          className="pl-9"
        />
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading your orders...
            </p>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-xl font-black">
            {orders.length ? "No matching orders" : "No orders yet"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {orders.length
              ? "Try another search."
              : "Your store purchases will appear here."}
          </p>
          {!orders.length && (
            <Button asChild className="mt-5">
              <Link href="/store">Shop Store</Link>
            </Button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="mt-6 space-y-4">
          {filtered.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-2xl border bg-card p-5 transition hover:border-rose-500/40 hover:shadow-md"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black">
                      {order.order_number}
                    </h2>
                    <StatusBadge value={order.payment_status} />
                    <StatusBadge value={order.fulfillment_status} />
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {date(order.created_at)}
                    {" · "}
                    {(order.items ?? []).reduce(
                      (sum, item) => sum + Number(item.quantity || 0),
                      0,
                    )}{" "}
                    item(s)
                  </p>

                  {order.payment_provider === "cashapp" &&
                    order.payment_status === "pending" &&
                    order.payment_submitted_at && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-500">
                        <Clock3 className="h-4 w-4" />
                        Cash App verification pending
                      </p>
                    )}

                  {!!order.items?.length && (
                    <p className="mt-2 truncate text-sm text-muted-foreground">
                      {order.items
                        .map((item) =>
                          item.variant_name
                            ? `${item.product_name} (${item.variant_name})`
                            : item.product_name,
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-5 md:justify-end">
                  <div className="md:text-right">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Total
                    </p>
                    <p className="text-xl font-black">
                      {money(order.total)}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}