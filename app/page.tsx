"use client"

import Link from "next/link"

import { useInventory } from "@/lib/inventory-context"

import { TrialBanner } from "@/components/billing/trial-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Layers3,
  Package,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react"

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  })
}

export default function DashboardPage() {
  const { items } = useInventory()

  const totalItems = items.length

  const totalQuantity = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity ?? 0),
    0,
  )

  const totalValue = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price ?? 0) *
        Number(item.quantity ?? 0),
    0,
  )

  const lowStockItems = items.filter(
    (item) =>
      Number(item.quantity ?? 0) <= 2,
  )

  const unsyncedItems = items.filter(
    (item) => !item.syncedToSquare,
  )

  const uniqueSets = new Set(
    items.map((item) => item.card.set.id),
  ).size

  const recentItems = items.slice(0, 6)

  const topValueItems = [...items]
    .sort(
      (a, b) =>
        Number(b.price ?? 0) *
          Number(b.quantity ?? 0) -
        Number(a.price ?? 0) *
          Number(a.quantity ?? 0),
    )
    .slice(0, 5)

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(225,29,72,.16),transparent_28%),radial-gradient(circle_at_92%_7%,rgba(127,29,29,.14),transparent_28%)]" />

      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-5 sm:mb-6">
          <TrialBanner />
        </div>

        <section className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_82%_18%,rgba(225,29,72,.20),transparent_28%),linear-gradient(135deg,#111114,#09090b)] px-5 py-6 shadow-2xl shadow-black/20 sm:rounded-[32px] sm:px-7 sm:py-8 lg:px-9 lg:py-10">
          <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:42px_42px]" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Collection Command Center
              </Badge>

              <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                Your collection,
                <span className="block bg-gradient-to-r from-rose-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
                  at a glance.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/50 sm:text-base sm:leading-7">
                Track your cards, organize binders, follow value, and move cards
                into the marketplace from one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                asChild
                variant="outline"
                className="h-11 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/scan">
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan
                </Link>
              </Button>

              <Button
                asChild
                className="h-11 bg-rose-600 text-white hover:bg-rose-500"
              >
                <Link href="/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Card
                </Link>
              </Button>
            </div>
          </div>
                </section>

        {/* =====================================================
            STORE PROMOTION
        ====================================================== */}

        <section className="relative mt-4 overflow-hidden rounded-[26px] border border-rose-500/20 bg-gradient-to-br from-[#171014] via-[#0d0d10] to-[#09090b] sm:mt-5 sm:rounded-[30px]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-rose-600/20 blur-3xl" />

          <div className="pointer-events-none absolute bottom-[-100px] left-[25%] h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:38px_38px]" />

          <div className="relative flex flex-col gap-6 px-5 py-7 sm:px-7 sm:py-8 lg:flex-row lg:items-center lg:justify-between lg:px-9 lg:py-9">
            <div className="max-w-3xl">
              <Badge className="mb-4 border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/10">
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                Team Rocket Markets Store
              </Badge>

              <h2 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">
                Stock up on
                <span className="ml-2 bg-gradient-to-r from-rose-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
                  Pokémon TCG.
                </span>
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 sm:text-base sm:leading-7">
                Shop booster packs, sealed products, cases, pre-orders,
                collectibles, and more directly from Team Rocket Markets.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] text-white/55"
                >
                  <Package className="mr-1.5 h-3.5 w-3.5" />
                  Sealed Products
                </Badge>

                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] text-white/55"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  New Releases
                </Badge>

                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] text-white/55"
                >
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                  Pre-Orders
                </Badge>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-rose-600 px-6 font-bold text-white shadow-lg shadow-rose-950/30 hover:bg-rose-500"
              >
                <Link href="/store">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            label="Collection Value"
            value={money(totalValue)}
            detail={`${uniqueSets} sets tracked`}
            icon={CircleDollarSign}
            accent
          />

          <MetricCard
            label="Unique Cards"
            value={totalItems.toLocaleString()}
            detail={`${totalQuantity.toLocaleString()} total copies`}
            icon={WalletCards}
          />

          <MetricCard
            label="Low Stock"
            value={lowStockItems.length.toLocaleString()}
            detail="2 copies or fewer"
            icon={AlertTriangle}
          />

          <MetricCard
            label="Square Sync"
            value={`${items.length - unsyncedItems.length}/${items.length}`}
            detail={`${unsyncedItems.length} pending`}
            icon={TrendingUp}
          />
        </section>

        <section className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035] sm:rounded-[30px]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
              <div>
                <p className="text-lg font-bold sm:text-xl">
                  Recent Inventory
                </p>
                <p className="mt-1 text-xs text-white/40 sm:text-sm">
                  Your latest cards
                </p>
              </div>

              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-white/65 hover:bg-white/10 hover:text-white"
              >
                <Link href="/inventory">
                  View all
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {recentItems.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
                <Layers3 className="h-10 w-10 text-white/25" />
                <p className="mt-4 font-semibold">
                  Your inventory is empty
                </p>
                <p className="mt-1 text-sm text-white/40">
                  Browse a set or add your first card.
                </p>
                <Button
                  asChild
                  className="mt-5 bg-rose-600 hover:bg-rose-500"
                >
                  <Link href="/sets">
                    Browse Sets
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3">
                {recentItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="group min-w-0 bg-[#0b0b0e] p-4 transition hover:bg-[#111116]"
                  >
                    <div className="flex gap-3">
                      <div className="h-24 w-[68px] shrink-0 overflow-hidden rounded-xl bg-white/5">
                        <img
                          src={
                            item.customImage ||
                            item.card.images.small
                          }
                          alt={item.card.name}
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">
                          {item.card.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-white/40">
                          {item.card.set.name} · #{item.card.number}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-white/10 bg-white/5 text-[10px] text-white/65"
                          >
                            {item.condition}
                          </Badge>

                          {item.finish && (
                            <Badge
                              variant="outline"
                              className="border-white/10 bg-white/5 text-[10px] text-white/65"
                            >
                              {item.finish}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/30">
                              Value
                            </p>
                            <p className="font-bold text-rose-300">
                              {money(
                                Number(item.price ?? 0),
                              )}
                            </p>
                          </div>

                          <p className="text-xs text-white/35">
                            Qty {item.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 sm:rounded-[30px] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold sm:text-xl">
                  Quick Actions
                </p>
                <p className="mt-1 text-xs text-white/40 sm:text-sm">
                  Jump back into your workflow
                </p>
              </div>

              <ZapMark />
            </div>

            <div className="mt-5 grid gap-2">
              <QuickAction
                href="/inventory"
                title="Inventory"
                subtitle="Search and manage every card"
                icon={Package}
              />
              <QuickAction
                href="/binders"
                title="Binders"
                subtitle="Budget, Mid and Premium"
                icon={BookOpen}
              />
              <QuickAction
                href="/sell"
                title="Sell Center"
                subtitle="List cards for sale or trade"
                icon={ShoppingBag}
              />
              <QuickAction
                href="/analytics"
                title="Analytics"
                subtitle="Value, sales and price movement"
                icon={BarChart3}
              />
              <QuickAction
                href="/sets"
                title="Browse Sets"
                subtitle="English and Japanese releases"
                icon={Boxes}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-2">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 sm:rounded-[30px] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold sm:text-xl">
                  Highest Value Cards
                </p>
                <p className="mt-1 text-xs text-white/40 sm:text-sm">
                  Biggest positions in your collection
                </p>
              </div>

              <TrendingUp className="h-5 w-5 text-rose-400" />
            </div>

            <div className="mt-5 space-y-2">
              {topValueItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/35">
                  Add cards to see collection leaders.
                </p>
              ) : (
                topValueItems.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 transition hover:border-white/15 hover:bg-white/5"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-black text-white/25">
                      {index + 1}
                    </span>

                    <img
                      src={
                        item.customImage ||
                        item.card.images.small
                      }
                      alt={item.card.name}
                      className="h-14 w-10 shrink-0 rounded-md object-contain"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.card.name}
                      </p>
                      <p className="truncate text-xs text-white/35">
                        {item.card.set.name}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-rose-300">
                        {money(
                          Number(item.price ?? 0) *
                            Number(item.quantity ?? 0),
                        )}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {item.quantity} owned
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,.16),transparent_36%),rgba(255,255,255,.035)] p-5 sm:rounded-[30px] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10">
                <Search className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-lg font-bold sm:text-xl">
                  Keep building
                </p>
                <p className="text-xs text-white/40 sm:text-sm">
                  Find the next card for your collection
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-white/45">
              Browse sets, add exact finishes and languages, then organize
              everything into binders without losing track of market value.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                asChild
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/sets">
                  English Sets
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/japanese-sets">
                  Japanese
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string | number
  detail: string
  icon: typeof Package
  accent?: boolean
}) {
  return (
    <div
      className={
        accent
          ? "relative overflow-hidden rounded-[22px] border border-rose-500/20 bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,.18),transparent_48%),rgba(255,255,255,.04)] p-4 sm:rounded-[26px] sm:p-5"
          : "rounded-[22px] border border-white/10 bg-white/[0.035] p-4 sm:rounded-[26px] sm:p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 sm:text-xs">
          {label}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
          <Icon
            className={
              accent
                ? "h-4 w-4 text-rose-400"
                : "h-4 w-4 text-white/45"
            }
          />
        </div>
      </div>

      <p className="mt-3 truncate text-xl font-black tracking-[-0.03em] sm:text-2xl xl:text-3xl">
        {value}
      </p>

      <p className="mt-1 truncate text-[11px] text-white/35 sm:text-xs">
        {detail}
      </p>
    </div>
  )
}

function QuickAction({
  href,
  title,
  subtitle,
  icon: Icon,
}: {
  href: string
  title: string
  subtitle: string
  icon: typeof Package
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 transition hover:border-rose-500/25 hover:bg-white/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition group-hover:border-rose-400/20 group-hover:bg-rose-500/10">
        <Icon className="h-4 w-4 text-white/55 transition group-hover:text-rose-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {title}
        </p>
        <p className="truncate text-xs text-white/35">
          {subtitle}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-rose-400" />
    </Link>
  )
}

function ZapMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-xs font-black text-rose-400">
      TR
    </div>
  )
}