"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Tag,
} from "lucide-react"
import { toast } from "sonner"

import { MessageSellerButton } from "@/components/marketplace/message-seller-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type JsonObject = Record<string, unknown>

type MarketplaceListing = {
  id: string
  seller_id: string
  sell_binder_id: string
  inventory_item_id: string
  quantity: number
  asking_price: number | string
  status: string
  shipping_method?: string | null
  envelope_eligible?: boolean | null
  listing_type?: "sale" | "trade" | "both" | null
  trade_notes?: string | null
  payment_notes?: string | null
  shipping_notes?: string | null
  created_at?: string
  binder: {
    id: string
    user_id: string
    name: string
    description: string | null
    is_public: boolean
    is_active: boolean
  }
  seller: {
    id: string
    displayName: string
  }
  item: JsonObject | null
}

type MarketplaceResponse = {
  currentUserId: string
  listings: MarketplaceListing[]
}

function asObject(value: unknown): JsonObject | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as JsonObject)
    : null
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim()
    }
  }

  return ""
}

function getSnapshot(row: MarketplaceListing) {
  const item = row.item ?? {}
  const stored = asObject(item.item) ?? item
  const card = asObject(stored.card)
  const set = asObject(card?.set) ?? asObject(stored.set)

  return {
    name:
      firstString(
        stored.name,
        card?.name,
        item.name,
      ) || "Pokémon Card",
    number: firstString(
      stored.number,
      card?.number,
      stored.card_number,
    ),
    setName: firstString(
      stored.setName,
      stored.set_name,
      set?.name,
    ),
    condition: firstString(
      stored.condition,
      item.condition,
    ),
    finish: firstString(
      stored.finish,
      item.finish,
    ),
    language: firstString(
      stored.language,
      item.language,
    ),
    rarity: firstString(
      stored.rarity,
      card?.rarity,
    ),
    image: firstString(
      stored.image,
      stored.imageUrl,
      stored.image_url,
      stored.imageSmall,
      stored.image_small,
      card?.image,
      card?.imageUrl,
      card?.image_url,
      asObject(card?.images)?.small,
      asObject(card?.images)?.large,
    ),
  }
}

function money(value: unknown) {
  const amount = Number(value)

  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : "$0.00"
}

function listingTypeLabel(
  value: MarketplaceListing["listing_type"],
) {
  if (value === "trade") return "Trade"
  if (value === "both") return "Sale / Trade"
  return "For Sale"
}

function shippingLabel(value?: string | null) {
  if (value === "envelope") return "Envelope"
  if (value === "ground_advantage")
    return "Ground Advantage"
  return value
    ? value.replaceAll("_", " ")
    : "Seller arranged"
}

export default function MarketplacePage() {
  const [data, setData] =
    useState<MarketplaceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [type, setType] =
    useState<"all" | "sale" | "trade" | "both">(
      "all",
    )

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/marketplace", {
        cache: "no-store",
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to load marketplace",
        )
      }

      setData(result as MarketplaceResponse)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load marketplace",
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const rows = data?.listings ?? []
    const q = search.trim().toLowerCase()

    return rows.filter((listing) => {
      const snapshot = getSnapshot(listing)
      const listingType =
        listing.listing_type || "sale"

      if (
        type !== "all" &&
        listingType !== type
      ) {
        return false
      }

      if (!q) return true

      return [
        snapshot.name,
        snapshot.number,
        snapshot.setName,
        snapshot.condition,
        snapshot.finish,
        snapshot.rarity,
        listing.seller.displayName,
        listing.binder.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [data, search, type])

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#09090b] text-zinc-200">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading marketplace…
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-rose-500/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-rose-950/30 p-5 shadow-2xl shadow-black/30 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-600/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-rose-300">
                <Store className="h-3.5 w-3.5" />
                Team Rocket Markets
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Collector Marketplace
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
                Browse public listings from collectors. Team Rocket Markets charges 0% selling fees; buyers and sellers arrange payment, shipping, and trades directly.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                <Link href="/sell">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  My Sell Center
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                <Link href="/messages">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Messages
                </Link>
              </Button>

              <Button
                variant="outline"
                onClick={() => void load()}
                className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search card, set, seller, condition..."
                className="border-white/10 bg-zinc-900 pl-9 text-white placeholder:text-zinc-600"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["sale", "For Sale"],
                  ["trade", "Trade"],
                  ["both", "Sale / Trade"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={
                    type === value
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setType(value)}
                  className={
                    type === value
                      ? "bg-rose-600 text-white hover:bg-rose-500"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {!data ? (
          <Card className="mt-6 border-white/10 bg-zinc-950/70 text-zinc-100">
            <CardContent className="p-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-zinc-500" />
              <h2 className="mt-4 text-xl font-bold">
                Marketplace unavailable
              </h2>
              <Button
                className="mt-5"
                onClick={() => void load()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="mt-6 border-white/10 bg-zinc-950/70 text-zinc-100">
            <CardContent className="p-10 text-center">
              <Package className="mx-auto h-10 w-10 text-zinc-500" />
              <h2 className="mt-4 text-xl font-bold">
                No matching listings
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Public active listings will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((listing) => {
              const card = getSnapshot(listing)
              const isTradeOnly =
                listing.listing_type === "trade"

              return (
                <article
                  key={listing.id}
                  className="overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/75 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-rose-500/25"
                >
                  <div className="flex min-h-[280px] items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-5">
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image}
                        alt={card.name}
                        className="max-h-[245px] max-w-full rounded-xl object-contain shadow-2xl shadow-black/40"
                      />
                    ) : (
                      <div className="flex h-48 w-36 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03]">
                        <Package className="h-8 w-8 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">
                        {listingTypeLabel(
                          listing.listing_type,
                        )}
                      </Badge>
                      {card.condition && (
                        <Badge
                          variant="outline"
                          className="border-white/10 text-zinc-400"
                        >
                          {card.condition}
                        </Badge>
                      )}
                      {card.finish && (
                        <Badge
                          variant="outline"
                          className="border-white/10 text-zinc-400"
                        >
                          {card.finish}
                        </Badge>
                      )}
                    </div>

                    <h2 className="mt-3 text-lg font-black text-white">
                      {card.name}
                      {card.number
                        ? ` ${card.number}`
                        : ""}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      {card.setName ||
                        listing.binder.name}
                    </p>

                    <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-600">
                          {isTradeOnly
                            ? "Trade"
                            : "Asking price"}
                        </p>
                        <p className="mt-1 text-2xl font-black text-white">
                          {isTradeOnly
                            ? "Offers"
                            : money(
                                listing.asking_price,
                              )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-semibold text-zinc-300">
                          {listing.seller.displayName}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          Qty {listing.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-zinc-400">
                      <Tag className="mr-1.5 inline h-3.5 w-3.5 text-rose-400" />
                      {shippingLabel(
                        listing.shipping_method,
                      )}
                    </div>

                    {listing.trade_notes && (
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-500">
                        Trade: {listing.trade_notes}
                      </p>
                    )}

                    <MessageSellerButton
                      sellerId={listing.seller_id}
                      currentUserId={
                        data.currentUserId
                      }
                      className="mt-4 w-full"
                    />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}