import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
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

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const gate =
    await requireAdmin()

  if (
    gate instanceof NextResponse
  ) {
    return gate
  }

  try {
    const { id } =
      await params

    const admin =
      createAdminClient()

    /**
     * --------------------------------------------------------
     * AUTH USER
     * --------------------------------------------------------
     */
    const {
      data: authData,
      error: authError,
    } =
      await admin.auth.admin.getUserById(
        id,
      )

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Seller not found",
        },
        {
          status: 404,
        },
      )
    }

    const user =
      authData.user

    const metadata =
      user.user_metadata ?? {}

    /**
     * --------------------------------------------------------
     * COLLECTION BINDERS
     * --------------------------------------------------------
     *
     * These are the user's REAL card binders.
     *
     * binder_entries:
     * - budget
     * - mid
     * - premium
     */
    const {
      data: collectionRows,
      error: collectionError,
    } =
      await admin
        .from("binder_entries")
        .select(
          "tier,language,item_id",
        )
        .eq(
          "user_id",
          id,
        )
        .in(
          "tier",
          [
            "budget",
            "mid",
            "premium",
          ],
        )

    if (collectionError) {
      console.error(
        "Admin collection binder lookup failed:",
        collectionError,
      )
    }

    const collectionEntries =
      collectionRows ?? []

    const collectionCounts: Record<
      BinderTier,
      number
    > = {
      budget: 0,
      mid: 0,
      premium: 0,
    }

    /**
     * Count unique inventory items,
     * not duplicate language rows.
     */
    for (
      const tier of [
        "budget",
        "mid",
        "premium",
      ] as BinderTier[]
    ) {
      const unique =
        new Set(
          collectionEntries
            .filter(
              (row) =>
                row.tier === tier,
            )
            .map(
              (row) =>
                String(
                  row.item_id,
                ),
            ),
        )

      collectionCounts[tier] =
        unique.size
    }

    const collectionBinders = [
      {
        id: "budget",
        name:
          "Up to $4.99",
        count:
          collectionCounts.budget,
      },

      {
        id: "mid",
        name:
          "$5.00 – $24.99",
        count:
          collectionCounts.mid,
      },

      {
        id: "premium",
        name:
          "$25.00+",
        count:
          collectionCounts.premium,
      },
    ]

    const totalCollectionCards =
      collectionCounts.budget +
      collectionCounts.mid +
      collectionCounts.premium

    /**
     * --------------------------------------------------------
     * SELL BINDERS
     * --------------------------------------------------------
     *
     * These are marketplace containers,
     * NOT the collection binders above.
     */
    const {
      data: sellBinderRows,
      error: sellBinderError,
    } =
      await admin
        .from(
          "sell_binders",
        )
        .select("*")
        .eq(
          "user_id",
          id,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )

    if (sellBinderError) {
      return NextResponse.json(
        {
          error:
            sellBinderError.message,
        },
        {
          status: 500,
        },
      )
    }

    /**
     * --------------------------------------------------------
     * SELL LISTINGS
     * --------------------------------------------------------
     */
    const {
      data: listingRows,
      error: listingError,
    } =
      await admin
        .from(
          "sell_listings",
        )
        .select("*")
        .eq(
          "seller_id",
          id,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )

    if (listingError) {
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

    const sellBinders =
      sellBinderRows ?? []

    const listings =
      listingRows ?? []

    const activeListings =
      listings.filter(
        (listing) =>
          listing.status ===
          "active",
      )

    const soldListings =
      listings.filter(
        (listing) =>
          listing.status ===
          "sold",
      )

    const listedValue =
      activeListings.reduce(
        (
          total,
          listing,
        ) =>
          total +
          Number(
            listing.asking_price ||
              0,
          ) *
            Number(
              listing.quantity ||
                0,
            ),
        0,
      )

    const estimatedPlatformRevenue =
      soldListings.reduce(
        (
          total,
          listing,
        ) =>
          total +
          Number(
            listing.asking_price ||
              0,
          ) *
            Number(
              listing.quantity ||
                0,
            ) *
            0.1,
        0,
      )

    return NextResponse.json({
      user: {
        id:
          user.id,

        email:
          user.email ??
          null,

        storeName:
          typeof metadata.store_name ===
          "string"
            ? metadata.store_name
            : null,

        isAdmin:
          metadata.is_admin ===
          true,
      },

      collection: {
        totalCards:
          totalCollectionCards,

        binders:
          collectionBinders,
      },

      summary: {
        sellBinderCount:
          sellBinders.length,

        listingCount:
          listings.length,

        activeCount:
          activeListings.length,

        soldCount:
          soldListings.length,

        listedValue:
          Number(
            listedValue.toFixed(
              2,
            ),
          ),

        estimatedPlatformRevenue:
          Number(
            estimatedPlatformRevenue.toFixed(
              2,
            ),
          ),
      },

      sellBinders,

      listings,
    })
  } catch (error) {
    console.error(
      "Admin seller GET failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load seller",
      },
      {
        status: 500,
      },
    )
  }
}