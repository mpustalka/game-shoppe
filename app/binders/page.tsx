"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import Link from "next/link"

import { toast } from "sonner"

import { useInventory } from "@/lib/inventory-context"

import {
  PRICE_TIERS,
  type PriceTier,
  CARD_CONDITIONS,
  type CardCondition,
  type InventoryItem,
} from "@/lib/types"

import {
  compareRarity,
  getAvailableRarities,
  getAvailableSets,
  getCardRarityLabel,
  rarityColors,
} from "@/lib/card-metadata"

import * as binderApi from "@/lib/binders"

import { SetFilter } from "@/components/inventory/set-filter"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Filter,
  Grid3X3,
  ImageOff,
  List,
  Loader2,
  Lock,
  Mail,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
} from "lucide-react"

import { useEntitlements } from "@/hooks/use-entitlements"
import { TrialBanner } from "@/components/billing/trial-banner"

type ViewMode = "grid" | "list"

type ShippingMethod =
  | "envelope"
  | "ground_advantage"

type PriceMove = {
  last: number
  prev: number
  change: number
  changePercent: number
  direction: "up" | "down" | "flat"
  spanDays: number
}

type PriceMovesResponse = {
  asOf: string | null
  tracked: number
  moves: Record<string, PriceMove>
}

type SortOption =
  | "price-low"
  | "price-high"
  | "name"
  | "set"
  | "rarity-asc"
  | "rarity-desc"

type SellBinder = {
  id: string
  user_id: string
  name: string
  description: string | null
  slug: string | null
  is_public: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type SellBindersResponse = {
  plan: "basic" | "premium" | "admin"

  entitlement: {
    included: number
    purchased: number
    maximum: number
    used: number
    remaining: number
    unlimited: boolean
    additionalBinderPrice: number
  }

  binders: SellBinder[]
}

type BinderStats = {
  count: number
  totalQty: number
  totalValue: number
}

const CARDS_PER_SPREAD = 18

const moveKey = (
  item: InventoryItem,
) =>
  `${item.cardId}|${item.finish || "Normal"}`

function money(
  value: number | string | null | undefined,
) {
  const amount =
    Number(value || 0)

  return Number.isFinite(amount)
    ? amount.toLocaleString(
        "en-US",
        {
          style: "currency",
          currency: "USD",
        },
      )
    : "$0.00"
}

function getCardImage(
  item: InventoryItem,
) {
  return (
    item.customImage ||
    item.card.images?.small ||
    item.card.images?.large ||
    null
  )
}

function getMarketValue(
  item: InventoryItem,
) {
  const market =
    Number(item.marketValue || 0)

  if (
    Number.isFinite(market) &&
    market > 0
  ) {
    return market
  }

  const price =
    Number(item.price || 0)

  return Number.isFinite(price)
    ? price
    : 0
}

function WeeklyMoveBadge({
  move,
  size = "sm",
}: {
  move?: PriceMove
  size?: "sm" | "xs"
}) {
  const text =
    size === "xs"
      ? "text-[10px]"
      : "text-xs"

  if (
    !move ||
    move.direction === "flat"
  ) {
    return (
      <Badge
        variant="secondary"
        className={`gap-1 bg-white/90 ${text} text-slate-500 shadow-sm`}
        title={
          move
            ? "No change over the last week"
            : "No price history yet for this card"
        }
      >
        <Minus className="h-3 w-3" />

        Flat
      </Badge>
    )
  }

  const up =
    move.direction === "up"

  return (
    <Badge
      className={`gap-1 border-0 ${text} text-white shadow ${
        up
          ? "bg-emerald-600"
          : "bg-red-600"
      }`}
      title={`Market ${
        up ? "up" : "down"
      } from $${move.prev.toFixed(
        2,
      )} to $${move.last.toFixed(
        2,
      )} over ~${move.spanDays} days`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}

      {up ? "+" : ""}

      {move.changePercent.toFixed(1)}%
    </Badge>
  )
}

export default function BindersPage() {
  const {
    items: inventoryItems,
  } = useInventory()

  const {
    entitlements,
  } = useEntitlements()

  const [
    activeTier,
    setActiveTier,
  ] =
    useState<PriceTier>(
      "budget",
    )

  const [
    language,
    setLanguage,
  ] =
    useState<
      "en" | "ja"
    >("en")

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("")

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      "grid",
    )

  const [
    sortBy,
    setSortBy,
  ] =
    useState<SortOption>(
      "price-low",
    )

  const [
    filterCondition,
    setFilterCondition,
  ] =
    useState<
      CardCondition | "all"
    >("all")

  const [
    filterRarity,
    setFilterRarity,
  ] =
    useState("all")

  const [
    filterSet,
    setFilterSet,
  ] =
    useState("all")

  const [
    binderItems,
    setBinderItems,
  ] =
    useState<
      InventoryItem[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const [
    addCardId,
    setAddCardId,
  ] =
    useState("")

  const [
    adding,
    setAdding,
  ] =
    useState(false)

  const [
    removingId,
    setRemovingId,
  ] =
    useState<
      string | null
    >(null)

  const [
    priceMoves,
    setPriceMoves,
  ] =
    useState<
      PriceMovesResponse | null
    >(null)

  /*
   * =========================================================
   * COLLECTION BINDER PAGINATION
   * =========================================================
   */

  const [
    page,
    setPage,
  ] =
    useState(1)

  /*
   * =========================================================
   * SELL BINDER STATE
   * =========================================================
   */

  const [
    sellBinders,
    setSellBinders,
  ] =
    useState<
      SellBinder[]
    >([])

  const [
    sellBindersLoading,
    setSellBindersLoading,
  ] =
    useState(true)

  const [
    selectedSellBinderId,
    setSelectedSellBinderId,
  ] =
    useState("")

  const [
    sellDialogOpen,
    setSellDialogOpen,
  ] =
    useState(false)

  const [
    selectedSellItem,
    setSelectedSellItem,
  ] =
    useState<
      InventoryItem | null
    >(null)

  const [
    sellPrice,
    setSellPrice,
  ] =
    useState("")

  const [
    sellQuantity,
    setSellQuantity,
  ] =
    useState("1")

  const [
    shippingMethod,
    setShippingMethod,
  ] =
    useState<ShippingMethod>(
      "ground_advantage",
    )

  const [
    listing,
    setListing,
  ] =
    useState(false)

  /*
   * =========================================================
   * STATS FOR ALL THREE COLLECTION BINDERS
   * =========================================================
   */

  const [
    binderStats,
    setBinderStats,
  ] =
    useState<
      Record<
        PriceTier,
        BinderStats
      >
    >({
      budget: {
        count: 0,
        totalQty: 0,
        totalValue: 0,
      },

      mid: {
        count: 0,
        totalQty: 0,
        totalValue: 0,
      },

      premium: {
        count: 0,
        totalQty: 0,
        totalValue: 0,
      },
    })

  /*
   * =========================================================
   * WEEKLY MARKET MOVES
   * =========================================================
   */

  useEffect(() => {
    fetch(
      "/api/analytics/price-moves",
    )
      .then((response) =>
        response.ok
          ? response.json()
          : null,
      )
      .then((data) => {
        if (data) {
          setPriceMoves(
            data as PriceMovesResponse,
          )
        }
      })
      .catch(
        () => undefined,
      )
  }, [])

  const moveFor = (
    item: InventoryItem,
  ): PriceMove | undefined =>
    priceMoves?.moves[
      moveKey(item)
    ]

  /*
   * =========================================================
   * LOAD ACTIVE COLLECTION BINDER
   * =========================================================
   */

  async function reloadActiveBinder() {
    setLoading(true)

    setError(null)

    try {
      const items =
        await binderApi.loadBinder(
          activeTier,
          language,
        )

      setBinderItems(
        items,
      )
    } catch (error) {
      console.error(
        "Failed to load binder:",
        error,
      )

      setError(
        "Failed to load binder",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reloadActiveBinder()
  }, [
    activeTier,
    language,
  ])

  /*
   * =========================================================
   * LOAD STATS FOR ALL THREE BINDERS
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      try {
        const [
          budget,
          mid,
          premium,
        ] =
          await Promise.all([
            binderApi.loadBinder(
              "budget",
              language,
            ),

            binderApi.loadBinder(
              "mid",
              language,
            ),

            binderApi.loadBinder(
              "premium",
              language,
            ),
          ])

        if (cancelled) {
          return
        }

        function stats(
          items:
            InventoryItem[],
        ): BinderStats {
          return {
            count:
              items.length,

            totalQty:
              items.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  Number(
                    item.quantity ||
                      0,
                  ),
                0,
              ),

            totalValue:
              items.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  Number(
                    item.price ||
                      0,
                  ) *
                    Number(
                      item.quantity ||
                        0,
                    ),
                0,
              ),
          }
        }

        setBinderStats({
          budget:
            stats(budget),

          mid:
            stats(mid),

          premium:
            stats(
              premium,
            ),
        })
      } catch (error) {
        console.error(
          "Unable to load binder stats:",
          error,
        )
      }
    }

    void loadStats()

    return () => {
      cancelled = true
    }
  }, [language])

  /*
   * =========================================================
   * LOAD SELL BINDERS
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false

    async function loadSellBinders() {
      setSellBindersLoading(
        true,
      )

      try {
        const response =
          await fetch(
            "/api/sell-binders",
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

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Unable to load Sell Binders",
          )
        }

        const data =
          result as SellBindersResponse

        const active =
          (
            data.binders ||
            []
          ).filter(
            (binder) =>
              binder.is_active,
          )

        if (cancelled) {
          return
        }

        setSellBinders(
          active,
        )

        setSelectedSellBinderId(
          (current) => {
            if (
              current &&
              active.some(
                (binder) =>
                  binder.id ===
                  current,
              )
            ) {
              return current
            }

            return (
              active[0]?.id ||
              ""
            )
          },
        )
      } catch (error) {
        console.error(
          "Sell Binder load failed:",
          error,
        )

        if (!cancelled) {
          setSellBinders(
            [],
          )
        }
      } finally {
        if (!cancelled) {
          setSellBindersLoading(
            false,
          )
        }
      }
    }

    void loadSellBinders()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * =========================================================
   * ADD CARD TO COLLECTION BINDER
   * =========================================================
   */

  async function handleAddCard() {
    if (!addCardId) {
      return
    }

    setAdding(true)

    const card =
      inventoryItems.find(
        (item) =>
          item.id ===
          addCardId,
      )

    if (!card) {
      setError(
        "Card not found in inventory",
      )

      setAdding(false)

      return
    }

    try {
      await binderApi.addToBinder(
        activeTier,
        card,
        language,
      )

      const updated =
        await binderApi.loadBinder(
          activeTier,
          language,
        )

      setBinderItems(
        updated,
      )

      setAddCardId("")

      toast.success(
        `${card.card.name} added to binder`,
      )
    } catch (error) {
      console.error(error)

      setError(
        "Failed to add card",
      )
    } finally {
      setAdding(false)
    }
  }

  /*
   * =========================================================
   * REMOVE CARD FROM COLLECTION BINDER
   * =========================================================
   */

  async function handleRemoveCard(
    id: string,
  ) {
    setRemovingId(id)

    try {
      await binderApi.removeFromBinder(
        activeTier,
        id,
      )

      const updated =
        await binderApi.loadBinder(
          activeTier,
          language,
        )

      setBinderItems(
        updated,
      )

      toast.success(
        "Card removed from binder",
      )
    } catch (error) {
      console.error(error)

      setError(
        "Failed to remove card",
      )
    } finally {
      setRemovingId(
        null,
      )
    }
  }

  /*
   * =========================================================
   * FILTERING + SORTING
   * =========================================================
   */

  const filteredItems =
    useMemo(() => {
      let result = [
        ...binderItems,
      ]

      if (searchQuery) {
        const query =
          searchQuery.toLowerCase()

        result =
          result.filter(
            (item) =>
              item.card.name
                .toLowerCase()
                .includes(
                  query,
                ) ||
              item.card.set.name
                .toLowerCase()
                .includes(
                  query,
                ) ||
              item.sku
                .toLowerCase()
                .includes(
                  query,
                ),
          )
      }

      if (
        filterCondition !==
        "all"
      ) {
        result =
          result.filter(
            (item) =>
              item.condition ===
              filterCondition,
          )
      }

      if (
        filterRarity !==
        "all"
      ) {
        result =
          result.filter(
            (item) =>
              getCardRarityLabel(
                item.card,
              ) ===
              filterRarity,
          )
      }

      if (
        filterSet !== "all"
      ) {
        result =
          result.filter(
            (item) =>
              (
                item.card.set
                  .id ||
                item.card.set
                  .name
              ) ===
              filterSet,
          )
      }

      switch (sortBy) {
        case "price-low":
          result.sort(
            (a, b) =>
              a.price -
              b.price,
          )
          break

        case "price-high":
          result.sort(
            (a, b) =>
              b.price -
              a.price,
          )
          break

        case "name":
          result.sort(
            (a, b) =>
              a.card.name.localeCompare(
                b.card.name,
              ),
          )
          break

        case "set":
          result.sort(
            (a, b) =>
              a.card.set.name.localeCompare(
                b.card.set
                  .name,
              ),
          )
          break

        case "rarity-asc":
          result.sort(
            (a, b) =>
              compareRarity(
                getCardRarityLabel(
                  a.card,
                ),
                getCardRarityLabel(
                  b.card,
                ),
              ) ||
              a.card.name.localeCompare(
                b.card.name,
              ),
          )
          break

        case "rarity-desc":
          result.sort(
            (a, b) =>
              compareRarity(
                getCardRarityLabel(
                  b.card,
                ),
                getCardRarityLabel(
                  a.card,
                ),
              ) ||
              a.card.name.localeCompare(
                b.card.name,
              ),
          )
          break
      }

      return result
    }, [
      binderItems,
      searchQuery,
      sortBy,
      filterCondition,
      filterRarity,
      filterSet,
    ])

  /*
   * =========================================================
   * PAGINATION
   * =========================================================
   */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredItems.length /
          CARDS_PER_SPREAD,
      ),
    )

  const safePage =
    Math.min(
      page,
      totalPages,
    )

  const spreadItems =
    useMemo(() => {
      const start =
        (safePage - 1) *
        CARDS_PER_SPREAD

      return filteredItems.slice(
        start,
        start +
          CARDS_PER_SPREAD,
      )
    }, [
      filteredItems,
      safePage,
    ])

  useEffect(() => {
    setPage(1)
  }, [
    activeTier,
    language,
    searchQuery,
    sortBy,
    filterCondition,
    filterRarity,
    filterSet,
  ])

  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages,
      )
    }
  }, [
    page,
    totalPages,
  ])

  /*
   * =========================================================
   * WEEKLY SUMMARY
   * =========================================================
   */

  const weeklySummary =
    useMemo(() => {
      let up = 0
      let down = 0
      let flat = 0

      let netValueChange =
        0

      for (
        const item of
        filteredItems
      ) {
        const move =
          priceMoves?.moves[
            moveKey(item)
          ]

        if (
          !move ||
          move.direction ===
            "flat"
        ) {
          flat += 1
          continue
        }

        if (
          move.direction ===
          "up"
        ) {
          up += 1
        } else {
          down += 1
        }

        netValueChange +=
          move.change *
          Number(
            item.quantity ||
              1,
          )
      }

      return {
        up,
        down,
        flat,
        netValueChange,
        tracked:
          up + down,
      }
    }, [
      filteredItems,
      priceMoves,
    ])

  const allRarities =
    useMemo(
      () =>
        getAvailableRarities(
          binderItems.map(
            (item) =>
              item.card,
          ),
        ),
      [binderItems],
    )

  const availableSets =
    useMemo(
      () =>
        getAvailableSets(
          binderItems.map(
            (item) =>
              item.card,
          ),
        ),
      [binderItems],
    )

  const activeTierInfo =
    PRICE_TIERS.find(
      (tier) =>
        tier.id ===
        activeTier,
    )!

  /*
   * =========================================================
   * OPEN SELL DIALOG
   * =========================================================
   */

  function openSellDialog(
    item: InventoryItem,
  ) {
    setSelectedSellItem(
      item,
    )

    const suggested =
      getMarketValue(item)

    setSellPrice(
      suggested > 0
        ? suggested.toFixed(
            2,
          )
        : "",
    )

    setSellQuantity("1")

    /*
     * Cards at a low value default to envelope.
     * Sellers can still change it.
     */
    setShippingMethod(
      suggested <= 20
        ? "envelope"
        : "ground_advantage",
    )

    setSellDialogOpen(
      true,
    )
  }

  /*
   * =========================================================
   * CREATE MARKETPLACE LISTING
   * =========================================================
   */

  async function listForSale() {
    if (
      !selectedSellItem
    ) {
      return
    }

    if (
      !selectedSellBinderId
    ) {
      toast.error(
        "Choose a Sell Binder first.",
      )

      return
    }

    const price =
      Number(sellPrice)

    const quantity =
      Number(
        sellQuantity,
      )

    if (
      !Number.isFinite(
        price,
      ) ||
      price <= 0
    ) {
      toast.error(
        "Enter a valid sell price.",
      )

      return
    }

    if (
      !Number.isInteger(
        quantity,
      ) ||
      quantity < 1
    ) {
      toast.error(
        "Quantity must be at least 1.",
      )

      return
    }

    if (
      quantity >
      Number(
        selectedSellItem.quantity ||
          0,
      )
    ) {
      toast.error(
        `You only own ${selectedSellItem.quantity} of this card.`,
      )

      return
    }

    setListing(true)

    try {
      const response =
        await fetch(
          `/api/sell-binders/${selectedSellBinderId}`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                inventoryItemId:
                  selectedSellItem.id,

                quantity,

                askingPrice:
                  price,

                shippingMethod,
              }),
          },
        )

      const result =
        await response
          .json()
          .catch(
            () => null,
          )

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to list card for sale",
        )
      }

      toast.success(
        `${selectedSellItem.card.name} listed for ${money(
          price,
        )}`,
      )

      setSellDialogOpen(
        false,
      )

      setSelectedSellItem(
        null,
      )

      setSellPrice("")

      setSellQuantity("1")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to list card for sale",
      )
    } finally {
      setListing(false)
    }
  }

  const sellPriceNumber =
    Number(
      sellPrice || 0,
    )

  const platformFee = 0

  const proceeds = Math.max(0, sellPriceNumber)

  const totalCollectionValue =
    binderStats.budget
      .totalValue +
    binderStats.mid
      .totalValue +
    binderStats.premium
      .totalValue

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070708] text-white">

      <div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">

        <div className="mb-6">
          <TrialBanner />
        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative mb-7 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(225,29,72,.18),transparent_34%),rgba(255,255,255,.03)] p-5 shadow-2xl shadow-black/20 sm:p-7">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h1 className="flex items-center gap-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/10 shadow-lg shadow-rose-950/20">
                  <BookOpen className="h-6 w-6 text-rose-400" />
                </span>
                Collection Binders
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                Organize your collection by value, flip through physical binder spreads, track weekly movement, and move cards into the marketplace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <Button
                variant="outline"
                asChild
                className="rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/sell">
                  <ShoppingBag className="mr-2 h-4 w-4" />

                  Sell Center
                </Link>
              </Button>

            </div>

          </div>

        </div>

        {/* =================================================
            LANGUAGE
        ================================================= */}

        <div className="mb-5 flex flex-wrap items-center gap-3">

          <Select
            value={language}
            onValueChange={(
              value,
            ) =>
              setLanguage(
                value as
                  | "en"
                  | "ja",
              )
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent className="border-white/10 bg-[#111114] text-white">
              <SelectItem value="en">
                English Collection
              </SelectItem>

              <SelectItem value="ja">
                Japanese Collection
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-white/40">
            Collection cards and Sell Binder listings remain separate.
          </div>

        </div>

        {/* =================================================
            COLLECTION BINDER SELECTORS
        ================================================= */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">

          {PRICE_TIERS.map(
            (
              tier,
              tierIndex,
            ) => {
              const stats =
                binderStats[
                  tier.id
                ]

              const isActive =
                activeTier ===
                tier.id

              const locked =
                entitlements.maxBinders !=
                  null &&
                tierIndex >=
                  entitlements.maxBinders

              return (
                <Card
                  key={
                    tier.id
                  }
                  className={`cursor-pointer rounded-[24px] border border-white/10 bg-white/[0.035] text-white shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-rose-400/25 hover:bg-white/[0.05] ${
                    isActive
                      ? "border-rose-400/40 bg-rose-500/[0.07] ring-1 ring-inset ring-rose-400/20"
                      : ""
                  } ${
                    locked
                      ? "opacity-70"
                      : ""
                  }`}
                  onClick={() => {
                    if (
                      locked
                    ) {
                      window.location.href =
                        "/settings?tab=billing"

                      return
                    }

                    setActiveTier(
                      tier.id,
                    )
                  }}
                >

                  <CardHeader className="pb-2">

                    <div className="flex items-center justify-between">

                      <CardTitle className="flex items-center gap-2 text-lg">

                        {tier.label}

                        {locked && (
                          <Lock className="h-4 w-4 text-white/40" />
                        )}

                      </CardTitle>

                      <div
                        className={`h-3 w-3 rounded-full ${tier.color}`}
                      />

                    </div>

                    <CardDescription>
                      {locked
                        ? "Upgrade to unlock this collection binder"
                        : tier.id ===
                            "budget"
                          ? "Cards up to the budget tier"
                          : tier.id ===
                              "mid"
                            ? "Mid-value collection cards"
                            : "Premium collection cards"}
                    </CardDescription>

                  </CardHeader>

                  <CardContent>

                    <div className="flex items-center justify-between text-sm">

                      <span className="text-white/40">
                        {stats.count} unique items
                      </span>

                      <span className="font-semibold">
                        {money(
                          stats.totalValue,
                        )}
                      </span>

                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      {stats.totalQty} total cards
                    </div>

                  </CardContent>

                </Card>
              )
            },
          )}

        </div>

        {/* =================================================
            ACTIVE BINDER
        ================================================= */}

        <Card className="overflow-hidden rounded-[28px] border-white/10 bg-white/[0.025] text-white shadow-2xl shadow-black/20">

          <CardHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,.13),transparent_38%),rgba(255,255,255,.025)]">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <CardTitle className="flex items-center gap-2">

                  <div
                    className={`h-4 w-4 rounded-full ${activeTierInfo.color}`}
                  />

                  {activeTierInfo.label} Collection Binder

                </CardTitle>

                <CardDescription>
                  {filteredItems.length} matching cards
                </CardDescription>

              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
              >
                <Printer className="mr-2 h-4 w-4" />

                Print Binder List
              </Button>

            </div>

            {/* MARKET MOVEMENT */}

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm">

              <span className="flex items-center gap-1.5 font-semibold text-white/70">
                <TrendingUp className="h-4 w-4 text-rose-400" />

                This week
              </span>

              <Badge className="gap-1 border-0 bg-emerald-600 text-white">
                <TrendingUp className="h-3 w-3" />

                {weeklySummary.up} up
              </Badge>

              <Badge className="gap-1 border-0 bg-red-600 text-white">
                <TrendingDown className="h-3 w-3" />

                {weeklySummary.down} down
              </Badge>

              <Badge
                variant="secondary"
                className="gap-1 border border-white/10 bg-white/[0.05] text-white/55"
              >
                <Minus className="h-3 w-3" />

                {weeklySummary.flat} flat
              </Badge>

              {weeklySummary.tracked >
                0 && (
                <span
                  className={`ml-auto font-semibold ${
                    weeklySummary.netValueChange >=
                    0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {weeklySummary.netValueChange >=
                  0
                    ? "+"
                    : "−"}
                  $
                  {Math.abs(
                    weeklySummary.netValueChange,
                  ).toFixed(
                    2,
                  )}{" "}
                  market value this week
                </span>
              )}

            </div>

          </CardHeader>

          <CardContent className="pt-6">

            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(280px,1fr)_170px_190px_210px_190px_auto] xl:items-center">

              <div className="relative flex-1">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />

                <Input
                  placeholder="Search Pokémon, set or SKU..."
                  value={
                    searchQuery
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearchQuery(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 rounded-xl border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery(
                        "",
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

              </div>

              <Select
                value={
                  filterCondition
                }
                onValueChange={(
                  value,
                ) =>
                  setFilterCondition(
                    value as
                      | CardCondition
                      | "all",
                  )
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white xl:w-[170px]">
                  <Filter className="mr-2 h-4 w-4" />

                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#111114] text-white">

                  <SelectItem value="all">
                    All Conditions
                  </SelectItem>

                  {CARD_CONDITIONS.map(
                    (
                      condition,
                    ) => (
                      <SelectItem
                        key={
                          condition
                        }
                        value={
                          condition
                        }
                      >
                        {
                          condition
                        }
                      </SelectItem>
                    ),
                  )}

                </SelectContent>
              </Select>

              <Select
                value={
                  filterRarity
                }
                onValueChange={
                  setFilterRarity
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white xl:w-[190px]">
                  <SelectValue placeholder="Rarity" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#111114] text-white">

                  <SelectItem value="all">
                    All Rarities
                  </SelectItem>

                  {allRarities.map(
                    (
                      rarity,
                    ) => (
                      <SelectItem
                        key={
                          rarity
                        }
                        value={
                          rarity
                        }
                      >
                        {
                          rarity
                        }
                      </SelectItem>
                    ),
                  )}

                </SelectContent>
              </Select>

              <SetFilter
                sets={
                  availableSets
                }
                value={
                  filterSet
                }
                onChange={
                  setFilterSet
                }
                className="h-11 w-full !border-white/10 !bg-white/[0.045] !text-white xl:w-[210px]"
              />

              <Select
                value={
                  sortBy
                }
                onValueChange={(
                  value,
                ) =>
                  setSortBy(
                    value as SortOption,
                  )
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white xl:w-[190px]">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#111114] text-white">

                  <SelectItem value="price-low">
                    Price: Low to High
                  </SelectItem>

                  <SelectItem value="price-high">
                    Price: High to Low
                  </SelectItem>

                  <SelectItem value="rarity-asc">
                    Rarity: Common to Secret
                  </SelectItem>

                  <SelectItem value="rarity-desc">
                    Rarity: Secret to Common
                  </SelectItem>

                  <SelectItem value="name">
                    Name A-Z
                  </SelectItem>

                  <SelectItem value="set">
                    Set A-Z
                  </SelectItem>

                </SelectContent>
              </Select>

              <Tabs
                value={
                  viewMode
                }
                onValueChange={(
                  value,
                ) =>
                  setViewMode(
                    value as ViewMode,
                  )
                }
              >
                <TabsList className="h-11 rounded-xl border border-white/10 bg-white/[0.045] p-1">

                  <TabsTrigger value="grid" className="rounded-lg text-white/45 data-[state=active]:bg-white data-[state=active]:text-zinc-950">
                    <Grid3X3 className="h-4 w-4" />
                  </TabsTrigger>

                  <TabsTrigger value="list" className="rounded-lg text-white/45 data-[state=active]:bg-white data-[state=active]:text-zinc-950">
                    <List className="h-4 w-4" />
                  </TabsTrigger>

                </TabsList>
              </Tabs>

            </div>

            {/* =================================================
                CONTENT
            ================================================= */}

            {loading ? (
              <div className="flex min-h-[500px] items-center justify-center">

                <Loader2 className="mr-2 h-5 w-5 animate-spin" />

                Opening binder...

              </div>
            ) : error ? (
              <div className="py-16 text-center text-red-500">
                {error}
              </div>
            ) : filteredItems.length ===
              0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">

                <Package className="mb-4 h-12 w-12 text-white/40/50" />

                <h3 className="text-lg font-medium">
                  No cards found
                </h3>

                <p className="mt-2 text-sm text-white/40">
                  No cards match this binder and filter combination.
                </p>

              </div>
            ) : viewMode ===
              "grid" ? (
              <>

                {/* =============================================
                    PHYSICAL TWO-PAGE BINDER SPREAD
                ============================================= */}

                <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(225,29,72,.08),transparent_35%),#0b0b0e] p-3 shadow-2xl shadow-black/30 sm:p-5">

                  <div className="grid gap-5 xl:grid-cols-2">

                    <BinderPage
                      items={
                        spreadItems.slice(
                          0,
                          9,
                        )
                      }
                      tier={
                        activeTier
                      }
                      tierColor={
                        activeTierInfo.color
                      }
                      moveFor={
                        moveFor
                      }
                      removingId={
                        removingId
                      }
                      onRemove={
                        handleRemoveCard
                      }
                      onSell={
                        openSellDialog
                      }
                    />

                    <BinderPage
                      items={
                        spreadItems.slice(
                          9,
                          18,
                        )
                      }
                      tier={
                        activeTier
                      }
                      tierColor={
                        activeTierInfo.color
                      }
                      moveFor={
                        moveFor
                      }
                      removingId={
                        removingId
                      }
                      onRemove={
                        handleRemoveCard
                      }
                      onSell={
                        openSellDialog
                      }
                    />

                  </div>

                </div>

                {/* =============================================
                    PAGINATION
                ============================================= */}

                <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row">

                  <Button
                    variant="outline"
                    className="rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
                    disabled={
                      safePage <= 1
                    }
                    onClick={() =>
                      setPage(
                        (
                          current,
                        ) =>
                          Math.max(
                            1,
                            current -
                              1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />

                    Previous
                  </Button>

                  <div className="text-center">

                    <p className="font-semibold">
                      Binder Spread{" "}
                      {safePage} of{" "}
                      {totalPages}
                    </p>

                    <p className="text-xs text-white/40">
                      {
                        filteredItems.length
                      }{" "}
                      matching cards • 18 per spread
                    </p>

                  </div>

                  <Button
                    variant="outline"
                    className="rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
                    disabled={
                      safePage >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (
                          current,
                        ) =>
                          Math.min(
                            totalPages,
                            current +
                              1,
                          ),
                      )
                    }
                  >
                    Next

                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>

                </div>

              </>
            ) : (
              <div className="space-y-3">

                {spreadItems.map(
                  (item) => (
                    <BinderListRow
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      tier={
                        activeTier
                      }
                      move={
                        moveFor(
                          item,
                        )
                      }
                      removing={
                        removingId ===
                        item.id
                      }
                      onRemove={() =>
                        void handleRemoveCard(
                          item.id,
                        )
                      }
                      onSell={() =>
                        openSellDialog(
                          item,
                        )
                      }
                    />
                  ),
                )}

                <div className="flex items-center justify-between pt-4">

                  <Button
                    variant="outline"
                    disabled={
                      safePage <= 1
                    }
                    onClick={() =>
                      setPage(
                        (
                          current,
                        ) =>
                          Math.max(
                            1,
                            current -
                              1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <span className="text-sm font-medium">
                    Page{" "}
                    {safePage} of{" "}
                    {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    disabled={
                      safePage >=
                      totalPages
                    }
                    onClick={() =>
                      setPage(
                        (
                          current,
                        ) =>
                          Math.min(
                            totalPages,
                            current +
                              1,
                          ),
                      )
                    }
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>

                </div>

              </div>
            )}

          </CardContent>

        </Card>

        {/* =================================================
            ADD CARD TO COLLECTION BINDER
        ================================================= */}

        <Card className="mt-8 rounded-[28px] border-white/10 bg-white/[0.035] text-white shadow-none">

          <CardHeader>

            <CardTitle>
              Add Card to{" "}
              {activeTierInfo.label} Binder
            </CardTitle>

            <CardDescription>
              Add an inventory item to this collection binder.
            </CardDescription>

          </CardHeader>

          <CardContent>

            <div className="flex flex-col gap-2 md:flex-row">

              <select
                value={
                  addCardId
                }
                onChange={(
                  event,
                ) =>
                  setAddCardId(
                    event.target
                      .value,
                  )
                }
                className="min-h-11 flex-1 rounded-xl border border-white/10 bg-[#111114] px-3 text-white"
                disabled={
                  adding
                }
              >

                <option value="">
                  Select card from inventory...
                </option>

                {inventoryItems.map(
                  (
                    card,
                  ) => (
                    <option
                      key={
                        card.id
                      }
                      value={
                        card.id
                      }
                    >
                      {
                        card.card
                          .name
                      }{" "}
                      (
                      {
                        card.card
                          .set
                          .name
                      }
                      ) -{" "}
                      {money(
                        card.price,
                      )}
                    </option>
                  ),
                )}

              </select>

              <Button
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                onClick={() =>
                  void handleAddCard()
                }
                disabled={
                  adding ||
                  !addCardId
                }
              >
                {adding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}

                Add to Binder
              </Button>

            </div>

          </CardContent>

        </Card>

        {/* =================================================
            COLLECTION STATS
        ================================================= */}

        <div className="mt-8 grid gap-4 md:grid-cols-4">

          <StatCard
            title="Budget Binder"
            value={
              binderStats.budget
                .totalQty
            }
          />

          <StatCard
            title="Mid Binder"
            value={
              binderStats.mid
                .totalQty
            }
          />

          <StatCard
            title="Premium Binder"
            value={
              binderStats.premium
                .totalQty
            }
          />

          <StatCard
            title="Total Value"
            value={money(
              totalCollectionValue,
            )}
          />

        </div>

      </div>

      {/* =====================================================
          SELL DIALOG
      ===================================================== */}

      <Dialog
        open={
          sellDialogOpen
        }
        onOpenChange={(
          open,
        ) => {
          setSellDialogOpen(
            open,
          )

          if (!open) {
            setSelectedSellItem(
              null,
            )
          }
        }}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overscroll-contain border-white/10 bg-[#111114] p-4 text-white sm:w-full sm:p-6">

          <DialogHeader>

            <DialogTitle>
              List Card For Sale
            </DialogTitle>

            <DialogDescription>
              Market value is only a reference. Your Sell Price is the actual marketplace asking price.
            </DialogDescription>

          </DialogHeader>

          {selectedSellItem && (
            <div className="space-y-5">

              <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:gap-4 sm:p-4">

                <div className="mx-auto h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] sm:mx-0">

                  {getCardImage(
                    selectedSellItem,
                  ) ? (
                    <img
                      src={
                        getCardImage(
                          selectedSellItem,
                        )!
                      }
                      alt={
                        selectedSellItem
                          .card
                          .name
                      }
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="h-6 w-6 text-white/40" />
                    </div>
                  )}

                </div>

                <div className="min-w-0">

                  <h3 className="font-semibold">
                    {
                      selectedSellItem
                        .card
                        .name
                    }
                  </h3>

                  <p className="text-sm text-white/40">
                    {
                      selectedSellItem
                        .card
                        .set
                        .name
                    }{" "}
                    #
                    {
                      selectedSellItem
                        .card
                        .number
                    }
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">

                    <Badge variant="secondary">
                      {
                        selectedSellItem.condition
                      }
                    </Badge>

                    <Badge variant="outline">
                      {
                        selectedSellItem.finish ||
                        "Normal"
                      }
                    </Badge>

                    <Badge>
                      Owned{" "}
                      {
                        selectedSellItem.quantity
                      }
                    </Badge>

                  </div>

                </div>

              </div>

              {/* PRICES */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">

                  <p className="text-xs uppercase tracking-wide text-white/40">
                    Market Value
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {money(
                      getMarketValue(
                        selectedSellItem,
                      ),
                    )}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    Reference only
                  </p>

                </div>

                <div className="space-y-2">

                  <Label>
                    Your Sell Price
                  </Label>

                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      sellPrice
                    }
                    onChange={(
                      event,
                    ) =>
                      setSellPrice(
                        event.target
                          .value,
                      )
                    }
                    className="h-11 rounded-xl border-white/10 bg-white/[0.045] text-lg font-semibold text-white"
                  />

                  <p className="text-xs text-white/40">
                    This does not change the card's collection value.
                  </p>

                </div>

              </div>

              {/* SELL BINDER */}

              <div className="space-y-2">

                <Label>
                  Sell Binder
                </Label>

                {sellBindersLoading ? (
                  <div className="flex h-10 items-center rounded-md border px-3 text-sm text-white/40">

                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                    Loading Sell Binders...

                  </div>
                ) : sellBinders.length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed p-4">

                    <p className="text-sm font-medium">
                      You don't have a Sell Binder yet.
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      Create one in the Sell Center before listing cards.
                    </p>

                    <Button
                      className="mt-3"
                      size="sm"
                      asChild
                    >
                      <Link href="/sell">
                        <Plus className="mr-2 h-4 w-4" />

                        Create Sell Binder
                      </Link>
                    </Button>

                  </div>
                ) : (
                  <Select
                    value={
                      selectedSellBinderId
                    }
                    onValueChange={
                      setSelectedSellBinderId
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.045] text-white">
                      <SelectValue placeholder="Choose a Sell Binder" />
                    </SelectTrigger>

                    <SelectContent className="border-white/10 bg-[#111114] text-white">

                      {sellBinders.map(
                        (
                          binder,
                        ) => (
                          <SelectItem
                            key={
                              binder.id
                            }
                            value={
                              binder.id
                            }
                          >
                            {
                              binder.name
                            }
                          </SelectItem>
                        ),
                      )}

                    </SelectContent>
                  </Select>
                )}

              </div>

              {/* QUANTITY */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="space-y-2">

                  <Label>
                    Quantity
                  </Label>

                  <Input
                    type="number"
                    min="1"
                    max={
                      selectedSellItem.quantity
                    }
                    value={
                      sellQuantity
                    }
                    onChange={(
                      event,
                    ) =>
                      setSellQuantity(
                        event.target
                          .value,
                      )
                    }
                  />

                  <p className="text-xs text-white/40">
                    {
                      selectedSellItem.quantity
                    }{" "}
                    currently owned
                  </p>

                </div>

                <div className="space-y-2">

                  <Label>
                    USPS Shipping
                  </Label>

                  <Select
                    value={
                      shippingMethod
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setShippingMethod(
                        value as ShippingMethod,
                      )
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.045] text-white">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent className="border-white/10 bg-[#111114] text-white">

                      <SelectItem value="envelope">
                        USPS Envelope
                      </SelectItem>

                      <SelectItem value="ground_advantage">
                        USPS Ground Advantage
                      </SelectItem>

                    </SelectContent>
                  </Select>

                </div>

              </div>

              {/* FEE BREAKDOWN */}

              <div className="rounded-xl border bg-white/[0.04]/30 p-4">

                <div className="flex items-center justify-between text-sm">

                  <span>
                    Selling price
                  </span>

                  <strong>
                    {money(
                      sellPriceNumber,
                    )}
                  </strong>

                </div>

                <div className="mt-2 flex items-center justify-between text-sm">

                  <span>
                    Platform fee (0%)
                  </span>

                  <strong>
                    -
                    {money(
                      platformFee,
                    )}
                  </strong>

                </div>

                <div className="mt-3 border-t pt-3">

                  <div className="flex items-center justify-between">

                    <span className="font-medium">
                      You receive
                    </span>

                    <strong className="text-xl">
                      {money(
                        proceeds,
                      )}
                    </strong>

                  </div>

                  <p className="mt-2 text-xs text-white/40">
                    Buyer pays USPS shipping separately.
                  </p>

                </div>

              </div>

            </div>
          )}

          <DialogFooter className="sticky bottom-0 -mx-4 mt-2 border-t border-white/10 bg-[#111114]/95 px-4 pb-1 pt-4 backdrop-blur sm:-mx-6 sm:px-6">

            <Button
              variant="outline"
              disabled={
                listing
              }
              onClick={() =>
                setSellDialogOpen(
                  false,
                )
              }
            >
              Cancel
            </Button>

            <Button
              disabled={
                listing ||
                !selectedSellItem ||
                !selectedSellBinderId ||
                sellBinders.length ===
                  0 ||
                !sellPrice
              }
              onClick={() =>
                void listForSale()
              }
            >
              {listing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="mr-2 h-4 w-4" />
              )}

              List For Sale
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>

    </div>
  )
}

/*
 * ===========================================================
 * ONE PHYSICAL 3x3 BINDER PAGE
 * ===========================================================
 */

function BinderPage({
  items,
  tier,
  tierColor,
  moveFor,
  removingId,
  onRemove,
  onSell,
}: {
  items: InventoryItem[]

  tier: PriceTier

  tierColor: string

  moveFor: (
    item: InventoryItem,
  ) =>
    | PriceMove
    | undefined

  removingId:
    string | null

  onRemove: (
    id: string,
  ) => Promise<void>

  onSell: (
    item: InventoryItem,
  ) => void
}) {
  return (
    <div className="relative rounded-[24px] border border-white/10 bg-[linear-gradient(90deg,#17171b_0%,#101013_7%,#0c0c0f_100%)] p-3 pl-9 shadow-inner shadow-black/40 sm:p-5 sm:pl-12">

      {/* RINGS */}

      <div className="absolute left-3 top-0 flex h-full flex-col justify-around py-6">

        {Array.from({
          length: 9,
        }).map(
          (
            _,
            index,
          ) => (
            <span
              key={
                index
              }
              className="h-3.5 w-3.5 rounded-full border border-white/20 bg-[#050506] shadow-inner shadow-black sm:h-4 sm:w-4"
            />
          ),
        )}

      </div>

      {/* 3x3 */}

      <div className="grid grid-cols-3 gap-3">

        {Array.from({
          length: 9,
        }).map(
          (
            _,
            index,
          ) => {
            const item =
              items[index]

            if (!item) {
              return (
                <div
                  key={
                    index
                  }
                  className="aspect-[2.5/4.5] rounded-xl border border-dashed border-white/10 bg-white/[0.018]"
                />
              )
            }

            return (
              <BinderPocket
                key={
                  item.id
                }
                item={
                  item
                }
                tier={
                  tier
                }
                tierColor={
                  tierColor
                }
                move={
                  moveFor(
                    item,
                  )
                }
                removing={
                  removingId ===
                  item.id
                }
                onRemove={() =>
                  void onRemove(
                    item.id,
                  )
                }
                onSell={() =>
                  onSell(
                    item,
                  )
                }
              />
            )
          },
        )}

      </div>

    </div>
  )
}

/*
 * ===========================================================
 * COLLECTION BINDER CARD
 * ===========================================================
 */

function BinderPocket({
  item,
  tier,
  tierColor,
  move,
  removing,
  onRemove,
  onSell,
}: {
  item: InventoryItem

  tier: PriceTier

  tierColor: string

  move?: PriceMove

  removing: boolean

  onRemove: () => void

  onSell: () => void
}) {
  const image =
    getCardImage(item)

  const market =
    getMarketValue(
      item,
    )

  return (
    <div className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] text-white shadow-sm shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-rose-400/25 hover:bg-white/[0.05] hover:shadow-xl">

      {/* CARD IMAGE */}

      <div className="relative aspect-[2.5/3.5] overflow-hidden bg-black/20">

        <Link
          href={`/inventory/${item.id}`}
          className="block h-full"
        >

          {image ? (
            <img
              src={image}
              alt={
                item.card.name
              }
              loading="lazy"
              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageOff className="h-7 w-7 text-white/40" />
            </div>
          )}

        </Link>

        {/* MARKET BADGE */}

        <Badge
          className={`absolute left-1.5 top-1.5 border-0 text-[9px] text-white shadow sm:text-[10px] ${tierColor}`}
        >
          {money(
            market,
          )}
        </Badge>

        <div className="absolute right-1.5 top-1.5">
          <WeeklyMoveBadge
            move={
              move
            }
            size="xs"
          />
        </div>

      </div>

      {/* DETAILS */}

      <div className="p-2">

        <p className="truncate text-xs font-semibold">
          {item.card.name}
        </p>

        <p className="truncate text-[10px] text-white/40">
          {
            item.card.set
              .name
          }
        </p>

        <div className="mt-1 hidden flex-wrap gap-1 sm:flex">

          <Badge
            variant="secondary"
            className="border border-white/10 bg-white/90 text-[9px] font-semibold text-zinc-900"
          >
            {
              item.condition
            }
          </Badge>

          {(item.finish ||
            "Normal") !==
            "Normal" && (
            <Badge
              variant="outline"
              className="border-white/15 bg-white/[0.04] text-[9px] text-white/70"
            >
              <Sparkles className="mr-1 h-2.5 w-2.5" />

              {
                item.finish
              }
            </Badge>
          )}

        </div>

        {/* MARKET / QTY */}

        <div className="mt-2 grid grid-cols-2 gap-1">

          <div className="rounded-lg border border-white/8 bg-black/20 p-1.5">

            <p className="text-[8px] uppercase text-white/40">
              Market
            </p>

            <p className="truncate text-[11px] font-bold">
              {money(
                market,
              )}
            </p>

          </div>

          <div className="rounded-lg border border-white/8 bg-black/20 p-1.5">

            <p className="text-[8px] uppercase text-white/40">
              Owned
            </p>

            <p className="text-[11px] font-bold">
              {
                item.quantity
              }
            </p>

          </div>

        </div>

        {/* SELL */}

        <Button
          size="sm"
          className="mt-2 h-8 w-full rounded-lg bg-rose-600 px-1 text-[10px] text-white hover:bg-rose-500 sm:text-xs"
          onClick={
            onSell
          }
        >
          <DollarSign className="mr-1 h-3 w-3" />

          Sell
        </Button>

        {/* REMOVE */}

        <Button
          size="sm"
          variant="ghost"
          className="mt-1 h-7 w-full rounded-lg text-[9px] text-white/35 hover:bg-red-500/10 hover:text-red-300"
          disabled={
            removing
          }
          onClick={
            onRemove
          }
        >
          {removing
            ? "Removing..."
            : "Remove from binder"}
        </Button>

      </div>

    </div>
  )
}

/*
 * ===========================================================
 * LIST VIEW
 * ===========================================================
 */

function BinderListRow({
  item,
  tier,
  move,
  removing,
  onRemove,
  onSell,
}: {
  item: InventoryItem

  tier: PriceTier

  move?: PriceMove

  removing: boolean

  onRemove: () => void

  onSell: () => void
}) {
  const image =
    getCardImage(item)

  const market =
    getMarketValue(
      item,
    )

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-white shadow-none transition hover:border-rose-400/20 hover:bg-white/[0.05] sm:flex-row sm:items-center">

      <Link
        href={`/inventory/${item.id}`}
        className="shrink-0"
      >

        {image ? (
          <img
            src={image}
            alt={
              item.card.name
            }
            className="h-24 w-16 rounded-md object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-24 w-16 items-center justify-center rounded-md bg-white/[0.04]">
            <ImageOff className="h-5 w-5" />
          </div>
        )}

      </Link>

      <div className="min-w-0 flex-1">

        <Link
          href={`/inventory/${item.id}`}
        >
          <h3 className="font-semibold hover:text-rose-300">
            {
              item.card
                .name
            }
          </h3>
        </Link>

        <p className="text-sm text-white/40">
          {
            item.card.set
              .name
          }{" "}
          #
          {
            item.card
              .number
          }
        </p>

        <div className="mt-2 flex flex-wrap gap-2">

          <Badge variant="secondary">
            {
              item.condition
            }
          </Badge>

          <Badge variant="outline">
            {
              item.finish ||
              "Normal"
            }
          </Badge>

          {item.card.rarity && (
            <Badge
              className={
                rarityColors[
                  getCardRarityLabel(
                    item.card,
                  )
                ] || ""
              }
            >
              {getCardRarityLabel(
                item.card,
              )}
            </Badge>
          )}

          <WeeklyMoveBadge
            move={
              move
            }
          />

        </div>

      </div>

      <div className="min-w-[130px]">

        <p className="text-xs text-white/40">
          Market Value
        </p>

        <p className="text-xl font-bold">
          {money(
            market,
          )}
        </p>

        <p className="mt-1 text-xs text-white/40">
          Owned:{" "}
          {
            item.quantity
          }
        </p>

      </div>

      <div className="flex gap-2 sm:flex-col">

        <Button
          size="sm"
          onClick={
            onSell
          }
        >
          <ShoppingBag className="mr-2 h-4 w-4" />

          Sell
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="border-white/10 bg-white/[0.04] text-white hover:bg-red-500/10 hover:text-red-300"
          disabled={
            removing
          }
          onClick={
            onRemove
          }
        >
          {removing
            ? "Removing..."
            : "Remove"}
        </Button>

      </div>

    </div>
  )
}

/*
 * ===========================================================
 * STATS
 * ===========================================================
 */

function StatCard({
  title,
  value,
}: {
  title: string

  value:
    | number
    | string
}) {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.035] text-white shadow-none">

      <CardContent className="flex items-center gap-4 py-4">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10">
          <DollarSign className="h-5 w-5 text-rose-400" />
        </div>

        <div>

          <p className="text-sm text-white/40">
            {title}
          </p>

          <p className="text-xl font-semibold">
            {value}
          </p>

        </div>

      </CardContent>

    </Card>
  )
}