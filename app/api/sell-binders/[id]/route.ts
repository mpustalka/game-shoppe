import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type BinderTier =
  | "budget"
  | "mid"
  | "premium"


type ListingType =
  | "sale"
  | "trade"
  | "both"

const VALID_LISTING_TYPES: ListingType[] = [
  "sale",
  "trade",
  "both",
]

const VALID_BINDER_TIERS: BinderTier[] = [
  "budget",
  "mid",
  "premium",
]

function cleanMoney(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}

async function getSignedInUser() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}


/**
 * ============================================================
 * GET
 * ============================================================
 *
 * Loads:
 * - Sell Binder
 * - Current marketplace listings
 * - User inventory
 * - Binder memberships from binder_entries
 * - Binder counts
 * - Already-listed quantities
 */
export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getSignedInUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not signed in" },
        { status: 401 },
      )
    }

    const { id } = await params
    const admin = createAdminClient()

    /**
     * --------------------------------------------------------
     * SELL BINDER
     * --------------------------------------------------------
     */
    const {
      data: binder,
      error: binderError,
    } = await admin
      .from("sell_binders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (binderError) {
      return NextResponse.json(
        { error: binderError.message },
        { status: 500 },
      )
    }

    if (!binder) {
      return NextResponse.json(
        { error: "Sell Binder not found" },
        { status: 404 },
      )
    }

    /**
     * --------------------------------------------------------
     * EXISTING SELL LISTINGS
     * --------------------------------------------------------
     */
    const {
      data: listingRows,
      error: listingError,
    } = await admin
      .from("sell_listings")
      .select("*")
      .eq("sell_binder_id", id)
      .eq("seller_id", user.id)
      .order("created_at", {
        ascending: false,
      })

    if (listingError) {
      return NextResponse.json(
        { error: listingError.message },
        { status: 500 },
      )
    }

    const listings = listingRows ?? []

    /**
     * --------------------------------------------------------
     * BINDER COUNTS
     * --------------------------------------------------------
     *
     * We intentionally DO NOT load inventory_items here.
     *
     * Sell Center now works only from cards the user has
     * already organized into collection binders.
     */
    const binderCounts: Record<BinderTier, number> = {
      budget: 0,
      mid: 0,
      premium: 0,
    }

    await Promise.all(
      VALID_BINDER_TIERS.map(async (tier) => {
        const {
          count,
          error,
        } = await admin
          .from("binder_entries")
          .select("item_id", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id)
          .eq("tier", tier)

        if (error) {
          console.error(
            `Unable to count ${tier} binder:`,
            error,
          )

          return
        }

        binderCounts[tier] = count ?? 0
      }),
    )

    /**
     * --------------------------------------------------------
     * LISTED QUANTITIES
     * --------------------------------------------------------
     */
    const listedByInventoryItem: Record<string, number> = {}

    for (const listing of listings) {
      if (
        listing.status !== "active" &&
        listing.status !== "reserved"
      ) {
        continue
      }

      const inventoryId = String(
        listing.inventory_item_id,
      )

      listedByInventoryItem[inventoryId] =
        (listedByInventoryItem[inventoryId] ?? 0) +
        Number(listing.quantity || 0)
    }

    /**
     * --------------------------------------------------------
     * SUMMARY
     * --------------------------------------------------------
     */
    const activeListings = listings.filter(
      (listing) => listing.status === "active",
    )

    const reservedListings = listings.filter(
      (listing) => listing.status === "reserved",
    )

    const soldListings = listings.filter(
      (listing) => listing.status === "sold",
    )

    const pausedListings = listings.filter(
      (listing) => listing.status === "paused",
    )

    const listedValue = activeListings.reduce(
      (total, listing) =>
        total +
        cleanMoney(listing.asking_price) *
          Number(listing.quantity || 0),
      0,
    )

    return NextResponse.json({
      binder,

      listings,

      /**
       * IMPORTANT:
       *
       * The old endpoint returned thousands of inventory
       * records here.
       *
       * We intentionally return [] for compatibility while
       * we move the UI to paginated binder cards.
       */
      inventory: [],

      binderMembership: {},

      collectionBinders: [
        {
          id: "budget",
          name: "Budget Binder",
          count: binderCounts.budget,
        },
        {
          id: "mid",
          name: "Mid Binder",
          count: binderCounts.mid,
        },
        {
          id: "premium",
          name: "Premium Binder",
          count: binderCounts.premium,
        },
      ],

      listedByInventoryItem,

      summary: {
        listingCount: listings.length,
        activeCount: activeListings.length,
        reservedCount: reservedListings.length,
        soldCount: soldListings.length,
        pausedCount: pausedListings.length,
        listedValue: Number(
          listedValue.toFixed(2),
        ),
      },

      fees: {
        listingFee: 0,
        platformPercent: 0,
        sellerPercent: 100,
      },
    })
  } catch (error) {
    console.error(
      "Sell Binder GET failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Sell Binder",
      },
      {
        status: 500,
      },
    )
  }
}


/**
 * ============================================================
 * POST
 * ============================================================
 *
 * Create marketplace listing.
 */
export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const user =
      await getSignedInUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not signed in",
        },
        {
          status: 401,
        },
      )
    }

    const { id } =
      await params

    const body =
      await request
        .json()
        .catch(
          () => null,
        )

    const inventoryItemId =
      typeof body
        ?.inventoryItemId ===
      "string"
        ? body.inventoryItemId.trim()
        : ""

    const quantity =
      Math.floor(
        Number(
          body?.quantity ??
            1,
        ),
      )

    const askingPrice =
      Number(
        body?.askingPrice,
      )

    const shippingMethod =
      body?.shippingMethod ===
      "envelope"
        ? "envelope"
        : "ground_advantage"


    const listingType: ListingType =
      VALID_LISTING_TYPES.includes(
        body?.listingType as ListingType,
      )
        ? (body.listingType as ListingType)
        : "sale"

    const tradeNotes =
      typeof body?.tradeNotes === "string"
        ? body.tradeNotes.trim()
        : ""

    const paymentNotes =
      typeof body?.paymentNotes === "string"
        ? body.paymentNotes.trim()
        : ""

    const shippingNotes =
      typeof body?.shippingNotes === "string"
        ? body.shippingNotes.trim()
        : ""


    if (!inventoryItemId) {
      return NextResponse.json(
        {
          error:
            "Inventory item is required",
        },
        {
          status: 400,
        },
      )
    }


    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity < 1
    ) {
      return NextResponse.json(
        {
          error:
            "Quantity must be at least 1",
        },
        {
          status: 400,
        },
      )
    }


    if (
      listingType !== "trade" &&
      (
        !Number.isFinite(
          askingPrice,
        ) ||
        askingPrice <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Asking price must be greater than $0 for sale listings",
        },
        {
          status: 400,
        },
      )
    }


    const admin =
      createAdminClient()


    /**
     * Verify Sell Binder ownership.
     */
    const {
      data: binder,
    } =
      await admin
        .from(
          "sell_binders",
        )
        .select("id")
        .eq(
          "id",
          id,
        )
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle()


    if (!binder) {
      return NextResponse.json(
        {
          error:
            "Sell Binder not found",
        },
        {
          status: 404,
        },
      )
    }


    /**
     * Verify inventory ownership.
     */
    const {
      data:
        inventoryItem,
      error:
        inventoryError,
    } =
      await admin
        .from(
          "inventory_items",
        )
        .select(
          "id,user_id,quantity,item",
        )
        .eq(
          "id",
          inventoryItemId,
        )
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle()


    if (
      inventoryError ||
      !inventoryItem
    ) {
      return NextResponse.json(
        {
          error:
            "Inventory item not found",
        },
        {
          status: 404,
        },
      )
    }


    const itemJson =
      inventoryItem.item as
        | Record<string, unknown>
        | null

    const columnQuantity =
      Math.max(
        0,
        Number(
          inventoryItem.quantity ??
            0,
        ),
      )

    const jsonQuantity =
      Math.max(
        0,
        Number(
          itemJson?.quantity ??
            0,
        ),
      )

    /**
     * Legacy inventory rows can have quantity stored inside the
     * item JSON while the dedicated quantity column is still 0.
     *
     * Use the larger quantity so owning exactly one copy remains
     * sellable when the JSON is the populated source.
     */
    const ownedQuantity =
      Math.max(
        columnQuantity,
        jsonQuantity,
      )


    /**
     * Count already-listed quantities from ALL Sell Binders.
     */
    const {
      data:
        existingListings,
      error:
        existingError,
    } =
      await admin
        .from(
          "sell_listings",
        )
        .select(
          "quantity",
        )
        .eq(
          "seller_id",
          user.id,
        )
        .eq(
          "inventory_item_id",
          inventoryItemId,
        )
        .in(
          "status",
          [
            "active",
            "reserved",
          ],
        )


    if (existingError) {
      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        {
          status: 500,
        },
      )
    }


    const alreadyListed =
  (
    existingListings ??
    []
  ).reduce(
    (
      total,
      listing,
    ) =>
      total +
      Number(
        listing.quantity || 0,
      ),
    0,
  )

const available =
  Math.max(
    0,
    ownedQuantity -
      alreadyListed,
  )

console.log(
  "SELL LISTING AVAILABILITY",
  {
    inventoryItemId,
    columnQuantity,
    jsonQuantity,
    ownedQuantity,
    alreadyListed,
    available,
    requestedQuantity:
      quantity,
  },
)

/*
 * IMPORTANT:
 *
 * Selling the LAST copy is allowed.
 *
 * Own 1
 * Already listed 0
 * Request 1
 *
 * available = 1
 * 1 > 1 = false
 *
 * Therefore listing is ALLOWED.
 */
if (
  quantity >
  available
) {
  return NextResponse.json(
    {
      error:
        available === 0 &&
        alreadyListed > 0
          ? "This card is already listed for sale. Edit or remove the existing listing instead."
          : `You only have ${available} unlisted ${
              available === 1
                ? "copy"
                : "copies"
            } available.`,

      code:
        "INSUFFICIENT_INVENTORY",

      ownedQuantity,
      alreadyListed,
      available,
      requestedQuantity:
        quantity,
    },
    {
      status: 400,
    },
  )
}


    const {
      data,
      error,
    } =
      await admin
        .from(
          "sell_listings",
        )
        .insert({
          seller_id:
            user.id,

          sell_binder_id:
            id,

          inventory_item_id:
            inventoryItemId,

          quantity,

          asking_price:
            listingType === "trade"
              ? 0
              : askingPrice,

          listing_type:
            listingType,

          trade_notes:
            tradeNotes || null,

          payment_notes:
            paymentNotes || null,

          shipping_notes:
            shippingNotes || null,

          status:
            "active",

          shipping_method:
            shippingMethod,

          envelope_eligible:
            shippingMethod ===
            "envelope",
        })
        .select("*")
        .single()


    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 400,
        },
      )
    }


    return NextResponse.json(
      {
        listing:
          data,

        pricing: {
          askingPrice:
            listingType === "trade"
              ? 0
              : Number(
                  askingPrice.toFixed(
                    2,
                  ),
                ),

          platformFee:
            0,

          estimatedProceeds:
            listingType === "trade"
              ? 0
              : Number(
                  askingPrice.toFixed(
                    2,
                  ),
                ),
        },
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "Sell listing POST failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create listing",
      },
      {
        status: 500,
      },
    )
  }
}


/**
 * ============================================================
 * PATCH
 * ============================================================
 */
export async function PATCH(
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

    const body = await request
      .json()
      .catch(() => null)

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : ""

    if (!listingId) {
      return NextResponse.json(
        {
          error: "Listing id is required",
        },
        {
          status: 400,
        },
      )
    }

    const admin = createAdminClient()

    /*
     * ========================================================
     * LOAD LISTING
     * ========================================================
     */

    const {
      data: listing,
      error: listingError,
    } = await admin
      .from("sell_listings")
      .select("*")
      .eq("id", listingId)
      .eq("sell_binder_id", id)
      .eq("seller_id", user.id)
      .maybeSingle()

    if (
      listingError ||
      !listing
    ) {
      return NextResponse.json(
        {
          error:
            listingError?.message ||
            "Listing not found",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * ========================================================
     * COMPLETE SALE
     * ========================================================
     *
     * IMPORTANT:
     *
     * Owning exactly ONE card is valid.
     *
     * Example:
     *
     * quantity = 1
     * listing.quantity = 1
     *
     * After sale:
     *
     * quantity = 0
     * quantity_sold += 1
     *
     * The inventory row remains for history, but the card is
     * removed from collection binders.
     */

    if (
      body?.status === "sold"
    ) {
      /*
       * Idempotency:
       *
       * If this listing was already completed, DO NOT subtract
       * inventory again.
       */
      if (
        listing.status === "sold"
      ) {
        return NextResponse.json({
          listing,

          alreadySold: true,
        })
      }

      if (
        listing.status !== "active" &&
        listing.status !== "reserved"
      ) {
        return NextResponse.json(
          {
            error:
              `A ${listing.status} listing cannot be marked sold.`,
          },
          {
            status: 400,
          },
        )
      }

      const soldQuantity =
        Math.max(
          1,
          Math.floor(
            Number(
              listing.quantity ||
                1,
            ),
          ),
        )

      /*
       * ------------------------------------------------------
       * GET CURRENT INVENTORY QUANTITY
       * ------------------------------------------------------
       */

      const {
        data: inventoryItem,
        error: inventoryError,
      } = await admin
        .from("inventory_items")
        .select(
          "id,user_id,quantity,quantity_sold,item",
        )
        .eq(
          "id",
          listing.inventory_item_id,
        )
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle()

      if (
        inventoryError ||
        !inventoryItem
      ) {
        return NextResponse.json(
          {
            error:
              inventoryError?.message ||
              "Inventory item not found",
          },
          {
            status: 404,
          },
        )
      }

      const itemJson =
        inventoryItem.item as
          | Record<string, unknown>
          | null

      const currentQuantity =
        Math.max(
          0,
          Number(
            inventoryItem.quantity ??
              0,
          ),
          Number(
            itemJson?.quantity ??
              0,
          ),
        )

      const currentQuantitySold =
        Math.max(
          0,
          Number(
            inventoryItem.quantity_sold ??
              0,
          ),
          Number(
            itemJson?.quantitySold ??
              0,
          ),
        )

      /*
       * This should normally never happen because listing
       * creation already validates availability.
       *
       * But protect the database from going negative.
       */
      if (
        soldQuantity >
        currentQuantity
      ) {
        return NextResponse.json(
          {
            error:
              `Cannot complete sale. Listing contains ${soldQuantity} card(s), but inventory only has ${currentQuantity}.`,

            code:
              "INSUFFICIENT_INVENTORY",

            soldQuantity,

            currentQuantity,
          },
          {
            status: 409,
          },
        )
      }

      const nextQuantity =
        Math.max(
          0,
          currentQuantity -
            soldQuantity,
        )

      const nextQuantitySold =
        currentQuantitySold +
        soldQuantity

      /*
       * ------------------------------------------------------
       * UPDATE INVENTORY
       * ------------------------------------------------------
       */

      const nextItemJson = {
        ...(itemJson ?? {}),
        quantity:
          nextQuantity,
        quantitySold:
          nextQuantitySold,
      }

      const {
        error:
          inventoryUpdateError,
      } = await admin
        .from("inventory_items")
        .update({
          quantity:
            nextQuantity,

          quantity_sold:
            nextQuantitySold,

          item:
            nextItemJson,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          inventoryItem.id,
        )
        .eq(
          "user_id",
          user.id,
        )

      if (
        inventoryUpdateError
      ) {
        return NextResponse.json(
          {
            error:
              inventoryUpdateError.message,
          },
          {
            status: 500,
          },
        )
      }

      /*
       * ------------------------------------------------------
       * REMOVE FROM COLLECTION BINDERS IF SOLD OUT
       * ------------------------------------------------------
       *
       * Own 1 -> Sell 1 -> quantity becomes 0
       *
       * Remove the card from:
       *
       * Budget
       * Mid
       * Premium
       *
       * We are NOT deleting inventory history.
       */

      if (
        nextQuantity === 0
      ) {
        const {
          error:
            binderDeleteError,
        } = await admin
          .from(
            "binder_entries",
          )
          .delete()
          .eq(
            "user_id",
            user.id,
          )
          .eq(
            "item_id",
            String(
              inventoryItem.id,
            ),
          )

        if (
          binderDeleteError
        ) {
          console.error(
            "Unable to remove sold-out card from collection binders:",
            binderDeleteError,
          )
        }
      }

      /*
       * ------------------------------------------------------
       * MARK LISTING SOLD
       * ------------------------------------------------------
       */

      const {
        data: soldListing,
        error:
          soldListingError,
      } = await admin
        .from("sell_listings")
        .update({
          status: "sold",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          listing.id,
        )
        .eq(
          "seller_id",
          user.id,
        )
        .eq(
          "sell_binder_id",
          id,
        )
        .select("*")
        .single()

      if (
        soldListingError
      ) {
        return NextResponse.json(
          {
            error:
              soldListingError.message,
          },
          {
            status: 500,
          },
        )
      }

      return NextResponse.json({
        listing:
          soldListing,

        sale: {
          inventoryItemId:
            inventoryItem.id,

          soldQuantity,

          previousQuantity:
            currentQuantity,

          remainingQuantity:
            nextQuantity,

          quantitySold:
            nextQuantitySold,

          soldOut:
            nextQuantity === 0,

          removedFromCollectionBinders:
            nextQuantity === 0,
        },
      })
    }

    /*
     * ========================================================
     * NORMAL LISTING EDITS
     * ========================================================
     */

    const updates: Record<
      string,
      unknown
    > = {}

    /*
     * Pause / resume.
     */

    if (
      body?.status === "active" ||
      body?.status === "paused"
    ) {
      updates.status =
        body.status
    }

    /*
     * Listing type / P2P notes.
     */

    if (
      body?.listingType !==
      undefined
    ) {
      if (
        !VALID_LISTING_TYPES.includes(
          body.listingType as ListingType,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Listing type must be sale, trade, or both",
          },
          {
            status: 400,
          },
        )
      }

      updates.listing_type =
        body.listingType
    }

    if (
      body?.tradeNotes !==
      undefined
    ) {
      updates.trade_notes =
        typeof body.tradeNotes === "string" &&
        body.tradeNotes.trim()
          ? body.tradeNotes.trim()
          : null
    }

    if (
      body?.paymentNotes !==
      undefined
    ) {
      updates.payment_notes =
        typeof body.paymentNotes === "string" &&
        body.paymentNotes.trim()
          ? body.paymentNotes.trim()
          : null
    }

    if (
      body?.shippingNotes !==
      undefined
    ) {
      updates.shipping_notes =
        typeof body.shippingNotes === "string" &&
        body.shippingNotes.trim()
          ? body.shippingNotes.trim()
          : null
    }

    /*
     * Asking price.
     */

    if (
      body?.askingPrice !==
      undefined
    ) {
      const askingPrice =
        Number(
          body.askingPrice,
        )

      const effectiveListingType =
        (updates.listing_type ??
          listing.listing_type ??
          "sale") as ListingType

      if (
        effectiveListingType !== "trade" &&
        (
          !Number.isFinite(
            askingPrice,
          ) ||
          askingPrice <= 0
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Asking price must be greater than $0 for sale listings",
          },
          {
            status: 400,
          },
        )
      }

      updates.asking_price =
        effectiveListingType === "trade"
          ? 0
          : askingPrice
    }

    if (
      updates.listing_type === "trade" &&
      body?.askingPrice === undefined
    ) {
      updates.asking_price = 0
    }

    /*
     * Shipping method.
     */

    if (
      body?.shippingMethod !==
      undefined
    ) {
      const shippingMethod =
        body.shippingMethod ===
        "envelope"
          ? "envelope"
          : "ground_advantage"

      updates.shipping_method =
        shippingMethod

      updates.envelope_eligible =
        shippingMethod ===
        "envelope"
    }

    /*
     * ========================================================
     * LISTING QUANTITY EDIT
     * ========================================================
     *
     * Quantity 1 IS VALID.
     */

    if (
      body?.quantity !==
      undefined
    ) {
      const quantity =
        Math.floor(
          Number(
            body.quantity,
          ),
        )

      if (
        !Number.isFinite(
          quantity,
        ) ||
        quantity < 1
      ) {
        return NextResponse.json(
          {
            error:
              "Quantity must be at least 1",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Get authoritative inventory quantity.
       */

      const {
        data: inventoryItem,
        error:
          inventoryError,
      } = await admin
        .from(
          "inventory_items",
        )
        .select(
          "quantity,item",
        )
        .eq(
          "id",
          listing.inventory_item_id,
        )
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle()

      if (
        inventoryError ||
        !inventoryItem
      ) {
        return NextResponse.json(
          {
            error:
              inventoryError?.message ||
              "Inventory item no longer exists",
          },
          {
            status: 400,
          },
        )
      }

      const inventoryItemJson =
        inventoryItem.item as
          | Record<string, unknown>
          | null

      const ownedQuantity =
        Math.max(
          0,
          Number(
            inventoryItem.quantity ??
              0,
          ),
          Number(
            inventoryItemJson?.quantity ??
              0,
          ),
        )

      /*
       * Count quantities committed in OTHER listings.
       *
       * Do not count this listing itself.
       */

      const {
        data:
          otherListings,

        error:
          otherListingsError,
      } = await admin
        .from(
          "sell_listings",
        )
        .select(
          "id,quantity",
        )
        .eq(
          "seller_id",
          user.id,
        )
        .eq(
          "inventory_item_id",
          listing.inventory_item_id,
        )
        .in(
          "status",
          [
            "active",
            "reserved",
          ],
        )
        .neq(
          "id",
          listingId,
        )

      if (
        otherListingsError
      ) {
        return NextResponse.json(
          {
            error:
              otherListingsError.message,
          },
          {
            status: 500,
          },
        )
      }

      const committedElsewhere =
        (
          otherListings ??
          []
        ).reduce(
          (
            total,
            row,
          ) =>
            total +
            Number(
              row.quantity ||
                0,
            ),
          0,
        )

      /*
       * THIS is the important availability calculation.
       *
       * Examples:
       *
       * Own 1
       * Other listings 0
       * Available 1
       * Requested 1
       * -> VALID
       *
       * Own 1
       * Other listings 1
       * Available 0
       * Requested 1
       * -> BLOCKED
       */

      const available =
        Math.max(
          0,
          ownedQuantity -
            committedElsewhere,
        )

      if (
        quantity >
        available
      ) {
        return NextResponse.json(
          {
            error:
              `Only ${available} copies are available for this listing.`,

            code:
              "INSUFFICIENT_INVENTORY",

            ownedQuantity,

            committedElsewhere,

            available,
          },
          {
            status: 400,
          },
        )
      }

      updates.quantity =
        quantity
    }

    /*
     * ========================================================
     * SAVE NORMAL EDIT
     * ========================================================
     */

    if (
      Object.keys(
        updates,
      ).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Nothing to update",
        },
        {
          status: 400,
        },
      )
    }

    updates.updated_at =
      new Date().toISOString()

    const {
      data,
      error,
    } = await admin
      .from(
        "sell_listings",
      )
      .update(
        updates,
      )
      .eq(
        "id",
        listingId,
      )
      .eq(
        "seller_id",
        user.id,
      )
      .eq(
        "sell_binder_id",
        id,
      )
      .select("*")
      .single()

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 400,
        },
      )
    }

    return NextResponse.json({
      listing: data,
    })
  } catch (error) {
    console.error(
      "Sell listing PATCH failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update listing",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * ============================================================
 * DELETE
 * ============================================================
 */
export async function DELETE(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const user =
      await getSignedInUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not signed in",
        },
        {
          status: 401,
        },
      )
    }

    const { id } =
      await params

    const url =
      new URL(
        request.url,
      )

    const listingId =
      url.searchParams
        .get(
          "listingId",
        )
        ?.trim() ?? ""


    if (!listingId) {
      return NextResponse.json(
        {
          error:
            "Listing id is required",
        },
        {
          status: 400,
        },
      )
    }


    const admin =
      createAdminClient()


    const {
      data,
      error,
    } =
      await admin
        .from(
          "sell_listings",
        )
        .delete()
        .eq(
          "id",
          listingId,
        )
        .eq(
          "seller_id",
          user.id,
        )
        .eq(
          "sell_binder_id",
          id,
        )
        .select("id")
        .maybeSingle()


    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        },
      )
    }


    if (!data) {
      return NextResponse.json(
        {
          error:
            "Listing not found",
        },
        {
          status: 404,
        },
      )
    }


    return NextResponse.json({
      ok: true,

      deletedId:
        data.id,
    })
  } catch (error) {
    console.error(
      "Sell listing DELETE failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete listing",
      },
      {
        status: 500,
      },
    )
  }
}