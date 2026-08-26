import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type BinderTier = "budget" | "mid" | "premium"

type BinderItemJson = Record<string, unknown>

type InventoryLookup = {
  quantity: number
  price: number
  marketValue: number
  purchasePrice: number
}

const VALID_TIERS = new Set<BinderTier>([
  "budget",
  "mid",
  "premium",
])

const DEFAULT_PAGE_SIZE = 18
const MAX_PAGE_SIZE = 36

async function getSignedInUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

function normalizePage(value: string | null) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return Math.floor(parsed)
}

function normalizePageSize(value: string | null) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_SIZE
  }

  return Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(parsed)),
  )
}

/**
 * Return the first positive numeric value.
 *
 * This lets us prefer the authoritative inventory column
 * but fall back to the serialized binder item when older
 * inventory rows have null/zero price columns.
 */
function firstPositiveNumber(
  ...values: unknown[]
): number {
  for (const value of values) {
    const numeric = Number(value)

    if (
      Number.isFinite(numeric) &&
      numeric > 0
    ) {
      return numeric
    }
  }

  return 0
}

/**
 * Return the first finite number, including zero.
 *
 * Useful for purchase price where zero is legitimate.
 */
function firstNumber(
  ...values: unknown[]
): number {
  for (const value of values) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue
    }

    const numeric = Number(value)

    if (Number.isFinite(numeric)) {
      return numeric
    }
  }

  return 0
}

function getNestedCard(
  item: BinderItemJson,
): BinderItemJson | undefined {
  if (
    item.card &&
    typeof item.card === "object"
  ) {
    return item.card as BinderItemJson
  }

  return undefined
}

function getNestedSet(
  item: BinderItemJson,
): BinderItemJson | undefined {
  const card = getNestedCard(item)

  if (
    card?.set &&
    typeof card.set === "object"
  ) {
    return card.set as BinderItemJson
  }

  return undefined
}

function searchText(
  item: BinderItemJson,
) {
  const card = getNestedCard(item)
  const set = getNestedSet(item)

  return [
    item.name,
    card?.name,

    item.cardId,
    item.card_id,
    card?.id,

    item.sku,
    item.barcode,

    item.condition,
    item.finish,
    item.variant,
    item.language,

    item.number,
    card?.number,

    item.setName,
    item.set_name,
    set?.name,

    item.rarity,
    card?.rarity,
  ]
    .filter(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .join(" ")
    .toLowerCase()
}

/**
 * Extract pricing from the JSON snapshot stored in
 * binder_entries.item.
 *
 * Your inventory objects have existed in both camelCase
 * and snake_case forms over the life of the app, so we
 * deliberately support both.
 */
function getStoredPricing(
  item: BinderItemJson,
) {
  return {
    price: firstPositiveNumber(
      item.price,
      item.currentPrice,
      item.current_price,
    ),

    marketValue: firstPositiveNumber(
      item.marketValue,
      item.market_value,
      item.price,
      item.currentPrice,
      item.current_price,
    ),

    purchasePrice: firstNumber(
      item.purchasePrice,
      item.purchase_price,
      item.cost,
      item.unitCost,
      item.unit_cost,
    ),
  }
}

/**
 * GET /api/sell-binders/[id]/cards
 *
 * Example:
 *
 * /api/sell-binders/abc/cards
 *   ?tier=budget
 *   &language=en
 *   &page=1
 *   &pageSize=18
 *   &search=pikachu
 *
 * This endpoint:
 *
 * 1. Reads cards from binder_entries.
 * 2. Filters by collection binder.
 * 3. Paginates to 18 cards.
 * 4. Checks inventory_items only for the visible cards.
 * 5. Checks existing marketplace listings only for visible cards.
 */
export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getSignedInUser()

    if (!user) {
      return NextResponse.json(
        {
          error: "Not signed in",
        },
        {
          status: 401,
        },
      )
    }

    const { id } = await params

    const admin = createAdminClient()

    /**
     * --------------------------------------------------------
     * VERIFY SELL BINDER
     * --------------------------------------------------------
     */
    const {
      data: sellBinder,
      error: sellBinderError,
    } = await admin
      .from("sell_binders")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (sellBinderError) {
      console.error(
        "Sell binder ownership lookup failed:",
        sellBinderError,
      )

      return NextResponse.json(
        {
          error: sellBinderError.message,
        },
        {
          status: 500,
        },
      )
    }

    if (!sellBinder) {
      return NextResponse.json(
        {
          error: "Sell Binder not found",
        },
        {
          status: 404,
        },
      )
    }

    /**
     * --------------------------------------------------------
     * QUERY PARAMETERS
     * --------------------------------------------------------
     */
    const url = new URL(request.url)

    const tierParam =
      url.searchParams.get("tier")?.trim() ||
      "budget"

    if (
      !VALID_TIERS.has(
        tierParam as BinderTier,
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid binder tier",
        },
        {
          status: 400,
        },
      )
    }

    const tier =
      tierParam as BinderTier

    const languageParam =
      url.searchParams
        .get("language")
        ?.trim() || "all"

    const language =
      languageParam === "ja"
        ? "ja"
        : languageParam === "en"
          ? "en"
          : "all"

    const search =
      url.searchParams
        .get("search")
        ?.trim()
        .toLowerCase() || ""

    const page =
      normalizePage(
        url.searchParams.get("page"),
      )

    const pageSize =
      normalizePageSize(
        url.searchParams.get(
          "pageSize",
        ),
      )

    /**
     * --------------------------------------------------------
     * BINDER ENTRIES
     * --------------------------------------------------------
     */
    let binderQuery = admin
      .from("binder_entries")
      .select(
        "item_id,item,tier,language,added_at",
      )
      .eq("user_id", user.id)
      .eq("tier", tier)
      .order("added_at", {
        ascending: false,
      })

    if (language !== "all") {
      binderQuery = binderQuery.eq(
        "language",
        language,
      )
    }

    const {
      data: binderRows,
      error: binderError,
    } = await binderQuery

    if (binderError) {
      console.error(
        "Sell binder card lookup failed:",
        binderError,
      )

      return NextResponse.json(
        {
          error: binderError.message,
        },
        {
          status: 500,
        },
      )
    }

    /**
     * --------------------------------------------------------
     * NORMALIZE + SEARCH
     * --------------------------------------------------------
     */
    const normalized = (
      binderRows ?? []
    )
      .map((row) => {
        const item: BinderItemJson =
          row.item &&
          typeof row.item === "object"
            ? (row.item as BinderItemJson)
            : {}

        return {
          itemId: String(row.item_id),

          tier: row.tier as BinderTier,

          language:
            typeof row.language === "string"
              ? row.language
              : "en",

          addedAt:
            typeof row.added_at === "string"
              ? row.added_at
              : null,

          item,
        }
      })
      .filter((row) => {
        if (!search) {
          return true
        }

        return searchText(
          row.item,
        ).includes(search)
      })

    /**
     * --------------------------------------------------------
     * PAGINATION
     * --------------------------------------------------------
     */
    const totalItems =
      normalized.length

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          totalItems / pageSize,
        ),
      )

    const safePage =
      Math.min(
        page,
        totalPages,
      )

    const start =
      (safePage - 1) *
      pageSize

    const pageRows =
      normalized.slice(
        start,
        start + pageSize,
      )

    const visibleIds =
      pageRows.map(
        (row) => row.itemId,
      )

    /**
     * --------------------------------------------------------
     * INVENTORY LOOKUP
     * --------------------------------------------------------
     *
     * Only query inventory_items for cards visible on this
     * 18-card binder spread.
     *
     * IMPORTANT:
     * Older inventory records can have quantity = 0 in the
     * dedicated SQL column while the serialized `item` JSON
     * still contains the actual quantity. Read both.
     */
    const inventoryById: Record<string, InventoryLookup> = {}

    if (visibleIds.length > 0) {
      const {
        data: inventoryRows,
        error: inventoryError,
      } = await admin
        .from("inventory_items")
        .select(
          "id,quantity,price,market_value,purchase_price,item",
        )
        .eq("user_id", user.id)
        .in("id", visibleIds)

      if (inventoryError) {
        console.error(
          "Visible inventory lookup failed:",
          inventoryError,
        )

        return NextResponse.json(
          {
            error: inventoryError.message,
          },
          {
            status: 500,
          },
        )
      }

      for (const row of inventoryRows ?? []) {
        const itemJson: BinderItemJson =
          row.item &&
          typeof row.item === "object"
            ? (row.item as BinderItemJson)
            : {}

        const quantity = Math.max(
          0,
          firstNumber(row.quantity),
          firstNumber(itemJson.quantity),
          firstNumber(itemJson.qty),
        )

        inventoryById[String(row.id)] = {
          quantity,

          price: firstPositiveNumber(
            row.price,
            itemJson.price,
            itemJson.currentPrice,
            itemJson.current_price,
          ),

          marketValue: firstPositiveNumber(
            row.market_value,
            itemJson.marketValue,
            itemJson.market_value,
            itemJson.price,
            itemJson.currentPrice,
            itemJson.current_price,
          ),

          purchasePrice: firstNumber(
            row.purchase_price,
            itemJson.purchasePrice,
            itemJson.purchase_price,
            itemJson.cost,
            itemJson.unitCost,
            itemJson.unit_cost,
          ),
        }
      }

      console.log(
        "SELL BINDER VISIBLE INVENTORY",
        visibleIds.slice(0, 5).map((inventoryItemId) => ({
          inventoryItemId,
          inventory: inventoryById[inventoryItemId] ?? null,
        })),
      )
    }

    /**
     * --------------------------------------------------------
     * ACTIVE / RESERVED LISTING QUANTITIES
     * --------------------------------------------------------
     */
    const listedById: Record<
      string,
      number
    > = {}

    if (visibleIds.length > 0) {
      const {
        data: listingRows,
        error: listingError,
      } = await admin
        .from("sell_listings")
        .select(
          "inventory_item_id,quantity",
        )
        .eq("seller_id", user.id)
        .in(
          "inventory_item_id",
          visibleIds,
        )
        .in("status", [
          "active",
          "reserved",
        ])

      if (listingError) {
        console.error(
          "Visible listing lookup failed:",
          listingError,
        )

        return NextResponse.json(
          {
            error:
              listingError.message,
          },
          {
            status: 500,
          },
        )
      }

      for (
        const listing of
        listingRows ?? []
      ) {
        const inventoryItemId =
          String(
            listing.inventory_item_id,
          )

        listedById[
          inventoryItemId
        ] =
          (
            listedById[
              inventoryItemId
            ] ?? 0
          ) +
          firstNumber(
            listing.quantity,
          )
      }
    }

    /**
     * --------------------------------------------------------
     * BUILD RESPONSE
     * --------------------------------------------------------
     */
    const items = pageRows
      .map((row) => {
        const inventory =
          inventoryById[
            row.itemId
          ]

        /**
         * The actual inventory record is still required.
         *
         * binder_entries is the browsing source, but
         * inventory_items remains the ownership authority.
         */
        if (!inventory) {
          return null
        }

        const storedPricing =
          getStoredPricing(
            row.item,
          )

        const owned =
          Math.max(
            0,
            inventory.quantity,
            firstNumber(row.item.quantity),
            firstNumber(row.item.qty),
          )

        const listed =
          listedById[
            row.itemId
          ] ?? 0

        const available =
          Math.max(
            0,
            owned - listed,
          )

        /**
         * Pricing priority:
         *
         * 1. inventory_items price
         * 2. binder_entries.item price
         * 3. market value
         *
         * This handles older cards whose DB price columns
         * are null/zero but whose serialized binder item
         * still contains the displayed price.
         */
        const price =
          firstPositiveNumber(
            inventory.price,
            storedPricing.price,
            inventory.marketValue,
            storedPricing.marketValue,
          )

        const marketValue =
          firstPositiveNumber(
            inventory.marketValue,
            storedPricing.marketValue,
            inventory.price,
            storedPricing.price,
          )

        const purchasePrice =
          firstNumber(
            inventory.purchasePrice,
            storedPricing.purchasePrice,
          )

        return {
          id:
            row.itemId,

          item:
            row.item,

          tier:
            row.tier,

          language:
            row.language,

          addedAt:
            row.addedAt,

          owned,

          listed,

          available,

          price,

          marketValue,

          purchasePrice,
        }
      })
      .filter(
        (
          row,
        ): row is NonNullable<
          typeof row
        > => row !== null,
      )

    console.log(
      "SELL BINDER PAGE RESULT",
      {
        tier,
        page: safePage,
        visibleIds: visibleIds.length,
        returnedItems: items.length,
        sellableItems: items.filter(
          (item) => item.available > 0,
        ).length,
        firstItems: items.slice(0, 5).map((item) => ({
          id: item.id,
          owned: item.owned,
          listed: item.listed,
          available: item.available,
        })),
      },
    )

    return NextResponse.json({
      tier,

      language,

      search,

      pagination: {
        page:
          safePage,

        pageSize,

        totalItems,

        totalPages,

        hasPrevious:
          safePage > 1,

        hasNext:
          safePage <
          totalPages,
      },

      items,
    })
  } catch (error) {
    console.error(
      "Sell Binder cards GET failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load binder cards",
      },
      {
        status: 500,
      },
    )
  }
}