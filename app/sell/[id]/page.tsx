"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import Link from "next/link"
import { useParams } from "next/navigation"

import {
  ArrowLeft,
  BadgeDollarSign,
  CircleDollarSign,
  Handshake,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Edit,
  ImageOff,
  Loader2,
  Mail,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
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

type BinderTier = "budget" | "mid" | "premium"

type ShippingMethod =
  | "envelope"
  | "ground_advantage"

type ListingType =
  | "sale"
  | "trade"
  | "both"

type ListingStatus =
  | "draft"
  | "active"
  | "reserved"
  | "sold"
  | "paused"
  | "cancelled"

type SellBinder = {
  id: string
  name: string
  description: string | null
  slug: string | null
  is_public: boolean
  is_active: boolean
}

type SellListing = {
  id: string
  seller_id: string
  sell_binder_id: string
  inventory_item_id: string
  quantity: number
  asking_price: number
  listing_type?: ListingType
  trade_notes?: string | null
  payment_notes?: string | null
  shipping_notes?: string | null
  status: ListingStatus
  shipping_method: ShippingMethod
  envelope_eligible: boolean
  created_at: string
  updated_at: string
}

type CollectionBinder = {
  id: BinderTier
  name: string
  count: number
}

type SellBinderResponse = {
  binder: SellBinder

  listings: SellListing[]

  collectionBinders: CollectionBinder[]

  summary: {
    listingCount: number
    activeCount: number
    reservedCount: number
    soldCount: number
    pausedCount: number
    listedValue: number
  }

}

type BinderCardItem = {
  id: string

  item: Record<string, unknown>

  tier: BinderTier

  language: string

  addedAt: string | null

  owned: number

  listed: number

  available: number

  price: number

  marketValue: number

  purchasePrice: number
}

type BinderCardsResponse = {
  tier: BinderTier

  language: string

  search: string

  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasPrevious: boolean
    hasNext: boolean
  }

  items: BinderCardItem[]
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

function getNestedCard(row: BinderCardItem) {
  return row.item.card as
    | Record<string, unknown>
    | undefined
}

function cardName(row: BinderCardItem) {
  if (typeof row.item.name === "string") {
    return row.item.name
  }

  const card = getNestedCard(row)
  

  if (typeof card?.name === "string") {
    return card.name
  }

  return "Unknown Card"
}

function cardSet(row: BinderCardItem) {
  if (typeof row.item.setName === "string") {
    return row.item.setName
  }

  const card = getNestedCard(row)

  const set = card?.set as
    | Record<string, unknown>
    | undefined

  if (typeof set?.name === "string") {
    return set.name
  }

  return "Unknown Set"
}

function cardNumber(row: BinderCardItem) {
  if (typeof row.item.number === "string") {
    return row.item.number
  }

  const card = getNestedCard(row)

  if (typeof card?.number === "string") {
    return card.number
  }

  return null
}

function cardImage(row: BinderCardItem) {
  if (
    typeof row.item.customImage === "string" &&
    row.item.customImage
  ) {
    return row.item.customImage
  }

  const card = getNestedCard(row)

  const images = card?.images as
    | Record<string, unknown>
    | undefined

  if (typeof images?.small === "string") {
    return images.small
  }

  if (typeof images?.large === "string") {
    return images.large
  }

  return null
}

function cardCondition(row: BinderCardItem) {
  return typeof row.item.condition === "string"
    ? row.item.condition
    : null
}

function cardFinish(row: BinderCardItem) {
  return typeof row.item.finish === "string"
    ? row.item.finish
    : null
}

function suggestedPrice(row: BinderCardItem) {
  if (Number(row.price) > 0) {
    return Number(row.price)
  }

  if (Number(row.marketValue) > 0) {
    return Number(row.marketValue)
  }

  return 0
}

export default function SellBinderManagerPage() {
  const params = useParams<{ id: string }>()

  const binderId = params.id

  const [data, setData] =
    useState<SellBinderResponse | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [cardsLoading, setCardsLoading] =
    useState(true)

  const [working, setWorking] =
    useState(false)

  const [selectedTier, setSelectedTier] =
    useState<BinderTier>("budget")

  const [language, setLanguage] =
    useState("all")

  const [searchInput, setSearchInput] =
    useState("")

  const [search, setSearch] =
    useState("")

  const [page, setPage] =
    useState(1)

  const [binderCards, setBinderCards] =
    useState<BinderCardsResponse | null>(null)


  /*
   * Prevent older binder requests from overwriting a newer
   * Budget / Mid / Premium selection.
   */
  const cardRequestId =
    useRef(0)
    

  /*
   * Inline sell prices.
   *
   * This lets the user enter a custom price directly
   * underneath a card before clicking {listingType === "trade"
                ? "List For Trade"
                : listingType === "both"
                  ? "List Sale / Trade"
                  : "List For Sale"}.
   */
  const [sellPrices, setSellPrices] =
    useState<Record<string, string>>({})

  const [selectedItem, setSelectedItem] =
    useState<BinderCardItem | null>(null)

  const [addOpen, setAddOpen] =
    useState(false)

  const [quantity, setQuantity] =
    useState("1")

  const [askingPrice, setAskingPrice] =
    useState("")

  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>(
      "ground_advantage",
    )

  const [listingType, setListingType] =
    useState<ListingType>("sale")

  const [tradeNotes, setTradeNotes] =
    useState("")

  const [paymentNotes, setPaymentNotes] =
    useState("")

  const [shippingNotes, setShippingNotes] =
    useState("")

  const [editing, setEditing] =
    useState<SellListing | null>(null)

  const [editQuantity, setEditQuantity] =
    useState("1")

  const [editPrice, setEditPrice] =
    useState("")

  const [editShipping, setEditShipping] =
    useState<ShippingMethod>(
      "ground_advantage",
    )

  const [editListingType, setEditListingType] =
    useState<ListingType>("sale")

  const [editTradeNotes, setEditTradeNotes] =
    useState("")

  const [editPaymentNotes, setEditPaymentNotes] =
    useState("")

  const [editShippingNotes, setEditShippingNotes] =
    useState("")

  /*
   * =========================================================
   * LOAD SELL BINDER
   * =========================================================
   */

  const loadBinder = useCallback(
    async () => {
      if (!binderId) return

      setLoading(true)

      try {
        const response = await fetch(
          `/api/sell-binders/${binderId}`,
          {
            cache: "no-store",
          },
        )

        const result = await response
          .json()
          .catch(() => null)

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Unable to load Sell Binder",
          )
        }

        setData(
          result as SellBinderResponse,
        )
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load Sell Binder",
        )

        setData(null)
      } finally {
        setLoading(false)
      }
    },
    [binderId],
  )

  /*
   * =========================================================
   * LOAD COLLECTION BINDER CARDS
   * =========================================================
   */

  const loadCards = useCallback(
    async () => {
      if (!binderId) {
        return
      }

      const requestId =
        ++cardRequestId.current

      setCardsLoading(true)

      try {
        const query =
          new URLSearchParams({
            tier:
              selectedTier,

            language,

            page:
              String(page),

            pageSize:
              "18",
          })

        if (search) {
          query.set(
            "search",
            search,
          )
        }

        console.log(
          "LOADING COLLECTION BINDER",
          {
            requestId,
            binderId,
            selectedTier,
            language,
            page,
            search,
            url:
              `/api/sell-binders/${binderId}/cards?${query.toString()}`,
          },
        )

        const response =
          await fetch(
            `/api/sell-binders/${binderId}/cards?${query.toString()}`,
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

        /*
         * A newer binder request has already started.
         * Ignore this old response completely.
         */
        if (
          requestId !==
          cardRequestId.current
        ) {
          console.log(
            "IGNORING STALE BINDER RESPONSE",
            {
              requestId,
              currentRequestId:
                cardRequestId.current,
            },
          )

          return
        }

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Unable to load binder cards",
          )
        }

        const next =
          result as BinderCardsResponse

        /*
         * Extra protection against the wrong tier being
         * rendered if an unexpected response is returned.
         */
        if (
          next.tier !==
          selectedTier
        ) {
          console.warn(
            "WRONG BINDER TIER RETURNED",
            {
              requested:
                selectedTier,

              returned:
                next.tier,
            },
          )

          return
        }

        console.log(
          "COLLECTION BINDER LOADED",
          {
            requestId,
            tier:
              next.tier,

            items:
              next.items.length,

            page:
              next.pagination.page,

            totalItems:
              next.pagination.totalItems,
          },
        )

        setBinderCards(
          next,
        )

        /*
         * Initialize inline sell prices with the suggested
         * market/current value for newly loaded cards.
         *
         * Existing user-entered prices are preserved.
         */
        setSellPrices(
          (current) => {
            const updated = {
              ...current,
            }

            for (
              const row of
              next.items
            ) {
              if (
                updated[
                  row.id
                ] ===
                undefined
              ) {
                const price =
                  suggestedPrice(
                    row,
                  )

                updated[
                  row.id
                ] =
                  price > 0
                    ? price.toFixed(
                        2,
                      )
                    : ""
              }
            }

            return updated
          },
        )

        if (
          next.pagination.page !==
          page
        ) {
          setPage(
            next.pagination.page,
          )
        }
      } catch (error) {
        /*
         * Ignore errors from an old request after the user
         * has already switched binders.
         */
        if (
          requestId !==
          cardRequestId.current
        ) {
          return
        }

        console.error(
          "Unable to load binder cards:",
          error,
        )

        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load binder cards",
        )

        setBinderCards(
          null,
        )
      } finally {
        if (
          requestId ===
          cardRequestId.current
        ) {
          setCardsLoading(
            false,
          )
        }
      }
    },
    [
      binderId,
      selectedTier,
      language,
      page,
      search,
    ],
  )

  useEffect(() => {
    void loadBinder()
  }, [loadBinder])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  /*
   * Debounced search.
   */

  useEffect(() => {
    const timeout =
      window.setTimeout(() => {
        setPage(1)

        setSearch(
          searchInput.trim(),
        )
      }, 350)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchInput])

  /*
   * Marketplace payments are peer-to-peer.
   * The platform does not deduct a listing or selling fee.
   */

  function changeTier(
    tier: BinderTier,
  ) {
    if (
      tier ===
      selectedTier
    ) {
      return
    }

    console.log(
      "SWITCHING COLLECTION BINDER",
      {
        from:
          selectedTier,

        to:
          tier,
      },
    )

    /*
     * Invalidate any request already in flight so Budget
     * cannot overwrite Mid/Premium after the click.
     */
    cardRequestId.current += 1

    /*
     * Remove the old binder immediately while the newly
     * selected binder loads.
     */
    setBinderCards(
      null,
    )

    setCardsLoading(
      true,
    )

    setSelectedTier(
      tier,
    )

    setPage(1)
  }

  /*
   * =========================================================
   * OPEN ADVANCED LISTING DIALOG
   * =========================================================
   */

  function chooseCard(
    row: BinderCardItem,
  ) {
    setSelectedItem(row)

    setQuantity("1")

    const inline =
      sellPrices[row.id]

    const price =
      Number(inline)

    if (
      Number.isFinite(price) &&
      price > 0
    ) {
      setAskingPrice(
        price.toFixed(2),
      )
    } else {
      const suggested =
        suggestedPrice(row)

      setAskingPrice(
        suggested > 0
          ? suggested.toFixed(2)
          : "",
      )
    }

    setShippingMethod(
      "ground_advantage",
    )

    setListingType("sale")
    setTradeNotes("")
    setPaymentNotes("")
    setShippingNotes("")

    setAddOpen(true)
  }

  /*
   * =========================================================
   * QUICK LIST
   * =========================================================
   */

  async function quickList(
    row: BinderCardItem,
  ) {
    if (row.available <= 0) {
      toast.error(
        "No copies available to list.",
      )

      return
    }

    const price =
      Number(
        sellPrices[row.id],
      )

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      toast.error(
        "Enter a valid sell price first.",
      )

      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/sell-binders/${binderId}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            inventoryItemId:
              row.id,

            quantity: 1,

            askingPrice:
              price,

            shippingMethod:
              "ground_advantage",

            listingType:
              "sale",
          }),
        },
      )

      const result = await response
        .json()
        .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to create listing",
        )
      }

      toast.success(
        `${cardName(row)} listed for ${money(
          price,
        )}`,
      )

      await Promise.all([
        loadBinder(),
        loadCards(),
      ])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create listing",
      )
    } finally {
      setWorking(false)
    }
  }

  /*
   * =========================================================
   * CREATE ADVANCED LISTING
   * =========================================================
   */

  async function createListing() {
    if (!selectedItem) return

    const qty =
      Number(quantity)

    const price =
      Number(askingPrice)

    if (
      !Number.isInteger(qty) ||
      qty < 1
    ) {
      toast.error(
        "Quantity must be at least 1.",
      )

      return
    }

    if (
      qty >
      selectedItem.available
    ) {
      toast.error(
        `Only ${selectedItem.available} available to list.`,
      )

      return
    }

    if (
      listingType !== "trade" &&
      (
        !Number.isFinite(price) ||
        price <= 0
      )
    ) {
      toast.error(
        "Enter a valid asking price.",
      )

      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/sell-binders/${binderId}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            inventoryItemId:
              selectedItem.id,

            quantity:
              qty,

            askingPrice:
              listingType === "trade"
                ? 0
                : price,

            shippingMethod,

            listingType,

            tradeNotes,

            paymentNotes,

            shippingNotes,
          }),
        },
      )

      const result = await response
        .json()
        .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to create listing",
        )
      }

      toast.success(
        `${cardName(
          selectedItem,
        )} listed ${
          listingType === "trade"
            ? "for trade"
            : listingType === "both"
              ? "for sale or trade"
              : "for sale"
        }`,
      )

      setAddOpen(false)
      setSelectedItem(null)

      await Promise.all([
        loadBinder(),
        loadCards(),
      ])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create listing",
      )
    } finally {
      setWorking(false)
    }
  }

  /*
   * =========================================================
   * EDIT LISTING
   * =========================================================
   */

  function openEdit(
    listing: SellListing,
  ) {
    setEditing(listing)

    setEditQuantity(
      String(listing.quantity),
    )

    setEditPrice(
      Number(
        listing.asking_price,
      ).toFixed(2),
    )

    setEditShipping(
      listing.shipping_method,
    )

    setEditListingType(
      listing.listing_type ?? "sale",
    )

    setEditTradeNotes(
      listing.trade_notes ?? "",
    )

    setEditPaymentNotes(
      listing.payment_notes ?? "",
    )

    setEditShippingNotes(
      listing.shipping_notes ?? "",
    )
  }

  async function saveListing() {
    if (!editing) return

    const qty =
      Number(editQuantity)

    const price =
      Number(editPrice)

    if (
      !Number.isInteger(qty) ||
      qty < 1
    ) {
      toast.error(
        "Quantity must be at least 1.",
      )

      return
    }

    if (
      editListingType !== "trade" &&
      (
        !Number.isFinite(price) ||
        price <= 0
      )
    ) {
      toast.error(
        "Enter a valid asking price.",
      )

      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/sell-binders/${binderId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            listingId:
              editing.id,

            quantity:
              qty,

            askingPrice:
              editListingType === "trade"
                ? 0
                : price,

            shippingMethod:
              editShipping,

            listingType:
              editListingType,

            tradeNotes:
              editTradeNotes,

            paymentNotes:
              editPaymentNotes,

            shippingNotes:
              editShippingNotes,
          }),
        },
      )

      const result = await response
        .json()
        .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to update listing",
        )
      }

      toast.success(
        "Listing updated",
      )

      setEditing(null)

      await Promise.all([
        loadBinder(),
        loadCards(),
      ])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update listing",
      )
    } finally {
      setWorking(false)
    }
  }

  /*
   * =========================================================
   * PAUSE / RESUME
   * =========================================================
   */

  async function toggleListing(
    listing: SellListing,
  ) {
    const nextStatus =
      listing.status === "active"
        ? "paused"
        : "active"

    setWorking(true)

    try {
      const response = await fetch(
        `/api/sell-binders/${binderId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            listingId:
              listing.id,

            status:
              nextStatus,
          }),
        },
      )

      const result = await response
        .json()
        .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to update listing",
        )
      }

      toast.success(
        nextStatus === "active"
          ? "Listing resumed"
          : "Listing paused",
      )

      await Promise.all([
        loadBinder(),
        loadCards(),
      ])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update listing",
      )
    } finally {
      setWorking(false)
    }
  }

  /*
   * =========================================================
   * DELETE LISTING
   * =========================================================
   */

  async function deleteListing(
    listing: SellListing,
  ) {
    if (
      !window.confirm(
        "Remove this marketplace listing?",
      )
    ) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/sell-binders/${binderId}?listingId=${encodeURIComponent(
          listing.id,
        )}`,
        {
          method: "DELETE",
        },
      )

      const result = await response
        .json()
        .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to remove listing",
        )
      }

      toast.success(
        "Listing removed",
      )

      await Promise.all([
        loadBinder(),
        loadCards(),
      ])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove listing",
      )
    } finally {
      setWorking(false)
    }
  }

  /*
   * =========================================================
   * LOADING / ERROR
   * =========================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#09090b] text-zinc-200">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />

        Loading Sell Binder…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#09090b] px-4 py-10 text-zinc-100">
        <Card>
          <CardContent className="p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-zinc-400" />

            <h2 className="mt-4 text-xl font-semibold">
              Sell Binder unavailable
            </h2>

            <Button
              className="mt-5"
              asChild
            >
              <Link href="/sell">
                Back to Sell Center
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="relative mb-7 flex flex-col gap-5 overflow-hidden rounded-[28px] border border-rose-500/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-rose-950/30 p-5 shadow-2xl shadow-black/30 sm:p-7 lg:flex-row lg:items-end lg:justify-between lg:p-8">

        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-3"
            asChild
          >
            <Link href="/sell">
              <ArrowLeft className="mr-2 h-4 w-4" />

              Sell Center
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-3">

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {data.binder.name}
            </h1>

            <Badge className="border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/15">
              Sell Binder
            </Badge>

            {data.binder.is_public && (
              <Badge variant="outline">
                Public
              </Badge>
            )}

          </div>

          <p className="mt-2 text-zinc-400">
            {data.binder.description ||
              "Choose cards from your collection binders and make them available to other collectors. Payments and shipping are arranged peer-to-peer."}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            void Promise.all([
              loadBinder(),
              loadCards(),
            ])
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />

          Refresh
        </Button>

      </div>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <SummaryCard
          title="Active Listings"
          value={
            data.summary.activeCount
          }
        />

        <SummaryCard
          title="Reserved"
          value={
            data.summary.reservedCount
          }
        />

        <SummaryCard
          title="Sold"
          value={
            data.summary.soldCount
          }
        />

        <SummaryCard
          title="Listed Value"
          value={money(
            data.summary.listedValue,
          )}
        />

      </div>

      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-zinc-300">
        <strong>0% selling fees.</strong>{" "}
        Buyers and sellers arrange payment and shipping directly with each other.
        This marketplace does not collect, hold, or release transaction funds.
      </div>

      {/* ===================================================
          ACTIVE LISTINGS
      =================================================== */}

      <Card className="mt-6 border-white/10 bg-zinc-950/70 shadow-xl shadow-black/20">

        <CardHeader>
          <CardTitle className="text-zinc-100">
            Marketplace Listings
          </CardTitle>

          <CardDescription className="text-zinc-400">
            These cards are available for sale, trade, or both. Collectors arrange payment, shipping, and trades directly.
          </CardDescription>
        </CardHeader>

        <CardContent>

          {data.listings.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">

              <ShoppingBag className="mx-auto h-10 w-10 text-zinc-400" />

              <p className="mt-3 font-medium">
                Nothing listed yet
              </p>

              <p className="mt-1 text-sm text-zinc-400">
                Choose a card from one of your collection binders below.
              </p>

            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {data.listings.map(
                (listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    working={working}
                    onEdit={() =>
                      openEdit(listing)
                    }
                    onToggle={() =>
                      void toggleListing(
                        listing,
                      )
                    }
                    onDelete={() =>
                      void deleteListing(
                        listing,
                      )
                    }
                  />
                ),
              )}

            </div>
          )}

        </CardContent>
      </Card>

      {/* ===================================================
          COLLECTION BINDER
      =================================================== */}

      <Card className="mt-6 border-white/10 bg-zinc-950/70 shadow-xl shadow-black/20">

        <CardHeader>

          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />

            Choose From My Collection
          </CardTitle>

          <CardDescription className="text-zinc-400">
            Browse your collection binders and list cards for sale, trade, or both with 0% marketplace selling fees.
          </CardDescription>

        </CardHeader>

        <CardContent>

          {/* BINDER TABS */}

          <div className="flex flex-wrap gap-2">

            {data.collectionBinders.map(
              (binder) => (
                <Button
                  key={binder.id}
                  type="button"
                  variant="outline"
                  className={selectedTier === binder.id
                    ? "border-rose-500/50 bg-rose-600 text-white hover:bg-rose-500 hover:text-white"
                    : "border-white/10 bg-zinc-900/70 text-zinc-300 hover:border-rose-500/30 hover:bg-zinc-800 hover:text-white"}
                  onClick={() =>
                    changeTier(
                      binder.id,
                    )
                  }
                >
                  {binder.name}

                  <Badge
                    variant="secondary"
                    className="ml-2"
                  >
                    {binder.count}
                  </Badge>
                </Button>
              ),
            )}

          </div>

          {/* SEARCH */}

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">

            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <Input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                className="border-white/10 bg-zinc-900 pl-9 text-white placeholder:text-zinc-600"
                placeholder="Search Pokémon, set, number, condition, finish..."
              />

            </div>

            <Select
              value={language}
              onValueChange={(value) => {
                setLanguage(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="border-white/10 bg-zinc-900 text-zinc-100">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">
                <SelectItem value="all">
                  All Languages
                </SelectItem>

                <SelectItem value="en">
                  English
                </SelectItem>

                <SelectItem value="ja">
                  Japanese
                </SelectItem>
              </SelectContent>
            </Select>

          </div>

          {/* PHYSICAL BINDER */}

          <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-zinc-900/70 to-black/50 p-3 shadow-inner sm:p-6">

            {cardsLoading ? (
              <div className="flex min-h-[500px] items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />

                Opening binder…
              </div>
            ) : !binderCards ? (
              <div className="py-16 text-center">
                Unable to load binder cards.
              </div>
            ) : binderCards.items.length === 0 ? (
              <div className="py-16 text-center">

                <BookOpen className="mx-auto h-12 w-12 text-zinc-400" />

                <p className="mt-4 font-semibold">
                  No cards found
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  This binder page has no matching cards.
                </p>

              </div>
            ) : (
              <>

                <div className="grid gap-6 xl:grid-cols-2">

                  <BinderPage
                    cards={
                      binderCards.items.slice(
                        0,
                        9,
                      )
                    }
                    sellPrices={
                      sellPrices
                    }
                    working={
                      working
                    }
                    onPriceChange={(
                      id,
                      value,
                    ) =>
                      setSellPrices(
                        (current) => ({
                          ...current,
                          [id]: value,
                        }),
                      )
                    }
                    onQuickSell={(row) =>
                      void quickList(row)
                    }
                    onAdvanced={
                      chooseCard
                    }
                  />

                  <BinderPage
                    cards={
                      binderCards.items.slice(
                        9,
                        18,
                      )
                    }
                    sellPrices={
                      sellPrices
                    }
                    working={
                      working
                    }
                    onPriceChange={(
                      id,
                      value,
                    ) =>
                      setSellPrices(
                        (current) => ({
                          ...current,
                          [id]: value,
                        }),
                      )
                    }
                    onQuickSell={(row) =>
                      void quickList(row)
                    }
                    onAdvanced={
                      chooseCard
                    }
                  />

                </div>

                {/* PAGINATION */}

                <div className="mt-7 flex flex-col items-center justify-between gap-4 border-t pt-5 sm:flex-row">

                  <Button
                    variant="outline"
                    disabled={
                      !binderCards.pagination
                        .hasPrevious ||
                      cardsLoading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />

                    Previous
                  </Button>

                  <div className="text-center">

                    <p className="font-semibold">
                      Binder Page{" "}
                      {
                        binderCards.pagination
                          .page
                      }{" "}
                      of{" "}
                      {
                        binderCards.pagination
                          .totalPages
                      }
                    </p>

                    <p className="text-xs text-zinc-400">
                      {
                        binderCards.pagination
                          .totalItems
                      }{" "}
                      cards • 18 cards per spread
                    </p>

                  </div>

                  <Button
                    variant="outline"
                    disabled={
                      !binderCards.pagination
                        .hasNext ||
                      cardsLoading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current + 1,
                      )
                    }
                  >
                    Next

                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>

                </div>

              </>
            )}

          </div>

        </CardContent>
      </Card>

      {/* ===================================================
          ADVANCED LISTING DIALOG
      =================================================== */}

      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overscroll-contain border-white/10 bg-zinc-950 p-4 text-zinc-100 shadow-2xl sm:w-full sm:p-6">

          <DialogHeader>
            <DialogTitle>
              Create Marketplace Listing
            </DialogTitle>

            <DialogDescription>
              Choose whether this card is for sale, trade, or both, then add your peer-to-peer transaction preferences.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-5">

              <SelectedBinderCard
                row={selectedItem}
              />

              <div className="space-y-2">
                <Label className="text-zinc-200">Listing Type</Label>

                <Select
                  value={listingType}
                  onValueChange={(value) =>
                    setListingType(
                      value as ListingType,
                    )
                  }
                >
                  <SelectTrigger className="border-white/10 bg-zinc-900 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">
                    <SelectItem value="sale">
                      For Sale
                    </SelectItem>
                    <SelectItem value="trade">
                      For Trade
                    </SelectItem>
                    <SelectItem value="both">
                      Sale or Trade
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <Label className="text-zinc-200">
                    Quantity
                  </Label>

                  <Input
                    type="number"
                    min="1"
                    max={
                      selectedItem.available
                    }
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        event.target.value,
                      )
                    }
                  />

                  <p className="text-xs text-zinc-400">
                    {
                      selectedItem.available
                    }{" "}
                    available
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-200">
                    {listingType === "trade"
                      ? "Asking Price (not required)"
                      : "Your Sell Price"}
                  </Label>

                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      listingType === "trade"
                        ? ""
                        : askingPrice
                    }
                    disabled={
                      listingType === "trade"
                    }
                    onChange={(event) =>
                      setAskingPrice(
                        event.target.value,
                      )
                    }
                  />
                </div>

              </div>

              <div className="space-y-2">

                <Label className="text-zinc-200">
                  USPS Shipping
                </Label>

                <Select
                  value={shippingMethod}
                  onValueChange={(value) =>
                    setShippingMethod(
                      value as ShippingMethod,
                    )
                  }
                >
                  <SelectTrigger className="border-white/10 bg-zinc-900 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">

                    <SelectItem value="envelope">
                      USPS Envelope
                    </SelectItem>

                    <SelectItem value="ground_advantage">
                      USPS Ground Advantage
                    </SelectItem>

                  </SelectContent>
                </Select>

              </div>

              {(listingType === "trade" ||
                listingType === "both") && (
                <div className="space-y-2">
                  <Label className="text-zinc-200">Trade Preferences</Label>
                  <textarea
                    value={tradeNotes}
                    onChange={(event) =>
                      setTradeNotes(
                        event.target.value,
                      )
                    }
                    className="min-h-20 w-full max-w-full resize-y rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                    placeholder="What cards, sets, Pokémon, rarities, or values are you looking for?"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-zinc-200">Accepted Payment Methods</Label>
                <textarea
                  value={paymentNotes}
                  onChange={(event) =>
                    setPaymentNotes(
                      event.target.value,
                    )
                  }
                  className="min-h-20 w-full max-w-full resize-y rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                  placeholder="Example: PayPal, Venmo, Cash App. Buyer and seller arrange payment directly."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-200">Shipping Details</Label>
                <textarea
                  value={shippingNotes}
                  onChange={(event) =>
                    setShippingNotes(
                      event.target.value,
                    )
                  }
                  className="min-h-20 w-full max-w-full resize-y rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                  placeholder="Example: PWE available for 1–3 cards; tracked shipping available on request."
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex justify-between text-sm">
                  <span>
                    {listingType === "trade"
                      ? "Listing"
                      : "Your asking price"}
                  </span>
                  <strong>
                    {listingType === "trade"
                      ? "Trade"
                      : money(askingPrice)}
                  </strong>
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span>Marketplace selling fee</span>
                  <strong>0%</strong>
                </div>

                <div className="mt-3 border-t pt-3">
                  <p className="font-medium">Peer-to-peer transaction</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Payment and shipping are arranged directly between buyer and seller.
                    The platform does not collect or hold transaction funds.
                  </p>
                </div>
              </div>

            </div>
          )}

          <DialogFooter className="sticky bottom-0 -mx-4 mt-2 border-t bg-zinc-950/95 px-4 pb-1 pt-4 backdrop-blur sm:-mx-6 sm:px-6">

            <Button
              variant="outline"
              disabled={working}
              onClick={() =>
                setAddOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              disabled={
                working ||
                !selectedItem ||
                (
                  listingType !== "trade" &&
                  !askingPrice
                )
              }
              onClick={() =>
                void createListing()
              }
            >
              {working ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}

              {listingType === "trade"
                ? "List For Trade"
                : listingType === "both"
                  ? "List Sale / Trade"
                  : "List For Sale"}
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* ===================================================
          EDIT LISTING
      =================================================== */}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
          }
        }}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overscroll-contain border-white/10 bg-zinc-950 p-4 text-zinc-100 shadow-2xl sm:w-full sm:p-6">

          <DialogHeader>
            <DialogTitle>
              Edit Listing
            </DialogTitle>

            <DialogDescription>
              Update the selling price, quantity or USPS shipping method.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            <div className="space-y-2">
              <Label className="text-zinc-200">Listing Type</Label>
              <Select
                value={editListingType}
                onValueChange={(value) =>
                  setEditListingType(
                    value as ListingType,
                  )
                }
              >
                <SelectTrigger className="border-white/10 bg-zinc-900 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="trade">For Trade</SelectItem>
                  <SelectItem value="both">Sale or Trade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2">
                <Label className="text-zinc-200">
                  Quantity
                </Label>

                <Input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(event) =>
                    setEditQuantity(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-200">
                  Asking Price
                </Label>

                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    editListingType === "trade"
                      ? ""
                      : editPrice
                  }
                  disabled={
                    editListingType === "trade"
                  }
                  onChange={(event) =>
                    setEditPrice(
                      event.target.value,
                    )
                  }
                />
              </div>

            </div>

            <div className="space-y-2">

              <Label className="text-zinc-200">
                USPS Shipping
              </Label>

              <Select
                value={editShipping}
                onValueChange={(value) =>
                  setEditShipping(
                    value as ShippingMethod,
                  )
                }
              >
                <SelectTrigger className="border-white/10 bg-zinc-900 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-zinc-950 text-zinc-100">

                  <SelectItem value="envelope">
                    USPS Envelope
                  </SelectItem>

                  <SelectItem value="ground_advantage">
                    USPS Ground Advantage
                  </SelectItem>

                </SelectContent>
              </Select>

            </div>

            {(editListingType === "trade" ||
              editListingType === "both") && (
              <div className="space-y-2">
                <Label className="text-zinc-200">Trade Preferences</Label>
                <textarea
                  value={editTradeNotes}
                  onChange={(event) =>
                    setEditTradeNotes(
                      event.target.value,
                    )
                  }
                  className="min-h-20 w-full max-w-full resize-y rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-zinc-200">Accepted Payment Methods</Label>
              <textarea
                value={editPaymentNotes}
                onChange={(event) =>
                  setEditPaymentNotes(
                    event.target.value,
                  )
                }
                className="min-h-20 w-full max-w-full resize-y rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-200">Shipping Details</Label>
              <textarea
                value={editShippingNotes}
                onChange={(event) =>
                  setEditShippingNotes(
                    event.target.value,
                  )
                }
                className="min-h-20 w-full max-w-full resize-y rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">0% marketplace selling fee</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Payment is handled directly between collectors.
                  </p>
                </div>
                <strong>{money(editPrice)}</strong>
              </div>
            </div>

          </div>

          <DialogFooter className="sticky bottom-0 -mx-4 mt-2 border-t bg-zinc-950/95 px-4 pb-1 pt-4 backdrop-blur sm:-mx-6 sm:px-6">

            <Button
              variant="outline"
              disabled={working}
              onClick={() =>
                setEditing(null)
              }
            >
              Cancel
            </Button>

            <Button
              disabled={working}
              onClick={() =>
                void saveListing()
              }
            >
              {working && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              Save Listing
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>

      </div>
    </div>
  )
}

/*
 * =========================================================
 * PHYSICAL BINDER PAGE
 * =========================================================
 */

function BinderPage({
  cards,
  sellPrices,
  working,
  onPriceChange,
  onQuickSell,
  onAdvanced,
}: {
  cards: BinderCardItem[]

  sellPrices:
    Record<string, string>

  working:
    boolean

  onPriceChange: (
    id: string,
    value: string,
  ) => void

  onQuickSell: (
    row: BinderCardItem,
  ) => void

  onAdvanced: (
    row: BinderCardItem,
  ) => void
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-zinc-950/90 p-2 shadow-2xl shadow-black/30 sm:p-4">

      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">

        {Array.from({
          length: 9,
        }).map((_, index) => {
          const row =
            cards[index]

          if (!row) {
            return (
              <div
                key={index}
                className="aspect-[2.5/4.8] rounded-xl border border-dashed border-white/10 bg-white/[0.02]"
              />
            )
          }

          return (
            <BinderSlot
              key={row.id}
              row={row}
              sellPrice={
                sellPrices[row.id] ??
                ""
              }
              working={working}
              onPriceChange={(value) =>
                onPriceChange(
                  row.id,
                  value,
                )
              }
              onQuickSell={() =>
                onQuickSell(row)
              }
              onAdvanced={() =>
                onAdvanced(row)
              }
            />
          )
        })}

      </div>

    </div>
  )
}

/*
 * =========================================================
 * CARD SLOT
 * =========================================================
 */

function BinderSlot({
  row,
  sellPrice,
  working,
  onPriceChange,
  onQuickSell,
  onAdvanced,
}: {
  row: BinderCardItem

  sellPrice: string

  working: boolean

  onPriceChange: (
    value: string,
  ) => void

  onQuickSell: () => void

  onAdvanced: () => void
}) {
  const image =
    cardImage(row)

  const market =
    suggestedPrice(row)

  const validPrice =
    Number.isFinite(
      Number(sellPrice),
    ) &&
    Number(sellPrice) > 0

  return (
    <div className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-rose-500/30 hover:shadow-rose-950/20">

      <div className="relative aspect-[2.5/3.5] overflow-hidden bg-zinc-950">

        {image ? (
          <img
            src={image}
            alt={cardName(row)}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-zinc-400" />
          </div>
        )}

        {row.available <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75">
            <Badge variant="secondary">
              Fully Listed
            </Badge>
          </div>
        )}

      </div>

      <div className="p-2 sm:p-3">

        <p className="truncate text-xs font-semibold sm:text-sm">
          {cardName(row)}
        </p>

        <p className="truncate text-[10px] text-zinc-400 sm:text-xs">
          {cardSet(row)}
        </p>

        {cardNumber(row) && (
          <p className="mt-0.5 text-[10px] text-zinc-400">
            #{cardNumber(row)}
          </p>
        )}

        <div className="mt-2 hidden gap-1 sm:flex sm:flex-wrap">

          {cardCondition(row) && (
            <Badge
              variant="secondary"
              className="text-[10px]"
            >
              {cardCondition(row)}
            </Badge>
          )}

          {cardFinish(row) && (
            <Badge
              variant="outline"
              className="text-[10px]"
            >
              {cardFinish(row)}
            </Badge>
          )}

        </div>

        {/* MARKET VALUE */}

        <div className="mt-3 rounded-lg border border-white/5 bg-black/30 p-2">

          <p className="text-[10px] uppercase tracking-wide text-zinc-400">
            Market Value
          </p>

          <p className="text-sm font-bold">
            {money(market)}
          </p>

        </div>

        {/* OWNED / LISTED / AVAILABLE */}

        <div className="mt-2 grid grid-cols-3 gap-1 text-center">

          <div className="rounded-md border border-white/5 bg-black/25 p-1">
            <p className="text-[9px] text-zinc-400">
              Owned
            </p>

            <p className="text-xs font-bold">
              {row.owned}
            </p>
          </div>

          <div className="rounded-md border border-white/5 bg-black/25 p-1">
            <p className="text-[9px] text-zinc-400">
              Listed
            </p>

            <p className="text-xs font-bold">
              {row.listed}
            </p>
          </div>

          <div className="rounded-md border border-white/5 bg-black/25 p-1">
            <p className="text-[9px] text-zinc-400">
              Available
            </p>

            <p className="text-xs font-bold">
              {row.available}
            </p>
          </div>

        </div>

        {/* SELL PRICE */}

        <div className="mt-3">

          <Label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Your Sell Price
          </Label>

          <div className="relative mt-1">

            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
              $
            </span>

            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={sellPrice}
              disabled={
                row.available <= 0
              }
              onChange={(event) =>
                onPriceChange(
                  event.target.value,
                )
              }
              className="h-8 border-white/10 bg-zinc-950 pl-5 text-xs font-semibold text-white placeholder:text-zinc-600"
              placeholder="0.00"
            />

          </div>

        </div>

        {/* QUICK LIST */}

        <Button
          size="sm"
          className="mt-2 w-full bg-rose-600 font-bold text-white hover:bg-rose-500"
          disabled={
            working ||
            row.available <= 0 ||
            !validPrice
          }
          onClick={onQuickSell}
        >
          <ShoppingBag className="mr-1 h-3.5 w-3.5" />

          List For Sale
        </Button>

        {/* ADVANCED */}

        <Button
          size="sm"
          variant="ghost"
          className="mt-1 w-full text-xs"
          disabled={
            working ||
            row.available <= 0
          }
          onClick={onAdvanced}
        >
          Advanced Listing
        </Button>

      </div>

    </div>
  )
}

/*
 * =========================================================
 * SELECTED CARD
 * =========================================================
 */

function SelectedBinderCard({
  row,
}: {
  row: BinderCardItem
}) {
  const image =
    cardImage(row)

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-3 sm:flex-row sm:gap-4 sm:p-4">

      <div className="mx-auto h-32 w-24 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-950 sm:mx-0">

        {image ? (
          <img
            src={image}
            alt={cardName(row)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="h-5 w-5" />
          </div>
        )}

      </div>

      <div>

        <p className="font-semibold">
          {cardName(row)}
        </p>

        <p className="text-sm text-zinc-400">
          {cardSet(row)}
        </p>

        {cardNumber(row) && (
          <p className="text-sm text-zinc-400">
            #{cardNumber(row)}
          </p>
        )}

        <p className="mt-2 text-sm">
          Market:{" "}
          <strong>
            {money(
              suggestedPrice(row),
            )}
          </strong>
        </p>

        <div className="mt-3 flex flex-wrap gap-2">

          <Badge variant="outline">
            Owned {row.owned}
          </Badge>

          <Badge variant="outline">
            Listed {row.listed}
          </Badge>

          <Badge>
            Available {row.available}
          </Badge>

        </div>

      </div>

    </div>
  )
}

/*
 * =========================================================
 * EXISTING LISTING
 * =========================================================
 */

function ListingCard({
  listing,
  working,
  onEdit,
  onToggle,
  onDelete,
}: {
  listing: SellListing

  working: boolean

  onEdit: () => void

  onToggle: () => void

  onDelete: () => void
}) {
  return (
    <Card className="border-white/10 bg-zinc-900/70 transition hover:border-rose-500/25">

      <CardContent className="p-4">

        <div className="flex items-start justify-between gap-3">

          <div>
            <p className="text-xs text-zinc-400">
              Inventory Item
            </p>

            <p className="mt-1 max-w-[220px] truncate font-mono text-xs">
              {
                listing.inventory_item_id
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {listing.listing_type === "trade"
                ? "For Trade"
                : listing.listing_type === "both"
                  ? "Sale / Trade"
                  : "For Sale"}
            </Badge>

          <Badge
            variant={
              listing.status === "active"
                ? "default"
                : "secondary"
            }
          >
            {listing.status}
          </Badge>
          </div>

        </div>

        <div className="mt-4 rounded-xl border border-white/5 bg-black/25 p-3">

          <div className="flex justify-between">

            <span className="text-sm">
              {listing.listing_type === "trade"
                ? "Listing Type"
                : "Asking Price"}
            </span>

            <strong>
              {listing.listing_type === "trade"
                ? "Trade"
                : money(
                    listing.asking_price,
                  )}
            </strong>

          </div>

          <div className="mt-2 flex justify-between text-sm">

            <span>
              Quantity
            </span>

            <strong>
              {listing.quantity}
            </strong>

          </div>

        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">

          {listing.shipping_method ===
          "envelope" ? (
            <Mail className="h-4 w-4" />
          ) : (
            <Truck className="h-4 w-4" />
          )}

          {listing.shipping_method ===
          "envelope"
            ? "USPS Envelope"
            : "USPS Ground Advantage"}

        </div>

        {(listing.trade_notes ||
          listing.payment_notes ||
          listing.shipping_notes) && (
          <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">
            {listing.trade_notes && (
              <div>
                <strong>Trade:</strong>{" "}
                {listing.trade_notes}
              </div>
            )}
            {listing.payment_notes && (
              <div>
                <strong>Payment:</strong>{" "}
                {listing.payment_notes}
              </div>
            )}
            {listing.shipping_notes && (
              <div>
                <strong>Shipping:</strong>{" "}
                {listing.shipping_notes}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">

          <Button
            size="sm"
            variant="outline"
            disabled={working}
            onClick={onEdit}
          >
            <Edit className="mr-1 h-3.5 w-3.5" />

            Edit
          </Button>

          {(listing.status === "active" ||
            listing.status === "paused") && (
            <Button
              size="sm"
              variant="outline"
              disabled={working}
              onClick={onToggle}
            >
              {listing.status === "active" ? (
                <>
                  <Pause className="mr-1 h-3.5 w-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Resume
                </>
              )}
            </Button>
          )}

          {listing.status !== "sold" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={working}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

        </div>

      </CardContent>

    </Card>
  )
}

/*
 * =========================================================
 * SUMMARY
 * =========================================================
 */

function SummaryCard({
  title,
  value,
}: {
  title: string

  value: string | number
}) {
  return (
    <Card className="border-white/10 bg-zinc-950/80 shadow-lg shadow-black/20">

      <CardContent className="p-5">

        <p className="text-xs text-zinc-400">
          {title}
        </p>

        <p className="mt-1 text-2xl font-bold">
          {value}
        </p>

      </CardContent>

    </Card>
  )
}