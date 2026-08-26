import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type SellBinderRow = {
  id: string
  user_id: string
  name: string
  created_at: string
}

type SellListingRow = {
  id: string
  seller_id: string
  sell_binder_id: string
  inventory_item_id: string
  quantity: number
  asking_price: number
  status: string
  created_at: string
}

type SellerSummary = {
  userId: string
  email: string | null
  storeName: string | null
  binderCount: number
  activeListings: number
  soldListings: number
  listedValue: number
}

export async function GET() {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const admin = createAdminClient()

    /**
     * --------------------------------------------------------
     * SELL BINDERS
     * --------------------------------------------------------
     */
    const {
      data: binderRows,
      error: binderError,
    } = await admin
      .from("sell_binders")
      .select(
        "id,user_id,name,created_at",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )

    if (binderError) {
      return NextResponse.json(
        {
          error:
            binderError.message,
        },
        {
          status: 500,
        },
      )
    }

    const binders =
      (binderRows ??
        []) as SellBinderRow[]

    /**
     * --------------------------------------------------------
     * SELL LISTINGS
     * --------------------------------------------------------
     */
    const {
      data: listingRows,
      error: listingError,
    } = await admin
      .from("sell_listings")
      .select(
        `
        id,
        seller_id,
        sell_binder_id,
        inventory_item_id,
        quantity,
        asking_price,
        status,
        created_at
        `,
      )
      .order(
        "created_at",
        {
          ascending: false,
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

    const listings =
      (listingRows ??
        []) as SellListingRow[]

    /**
     * --------------------------------------------------------
     * FIND UNIQUE SELLERS
     * --------------------------------------------------------
     */
    const sellerIds =
      Array.from(
        new Set([
          ...binders.map(
            (row) =>
              row.user_id,
          ),

          ...listings.map(
            (row) =>
              row.seller_id,
          ),
        ]),
      ).filter(Boolean)

    /**
     * --------------------------------------------------------
     * AUTH USERS
     * --------------------------------------------------------
     *
     * Supabase Auth admin API does not support querying
     * arbitrary user IDs in one call, so for now we load
     * users and map the sellers we actually need.
     */
    const authUsers =
      new Map<
        string,
        {
          email:
            | string
            | null

          storeName:
            | string
            | null
        }
      >()

    let page = 1

    while (true) {
      const {
        data,
        error,
      } =
        await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        })

      if (error) {
        console.error(
          "Admin sell user lookup failed:",
          error,
        )

        break
      }

      for (
        const user of
        data.users
      ) {
        if (
          !sellerIds.includes(
            user.id,
          )
        ) {
          continue
        }

        const metadata =
          user.user_metadata ??
          {}

        authUsers.set(
          user.id,
          {
            email:
              user.email ??
              null,

            storeName:
              typeof metadata.store_name ===
              "string"
                ? metadata.store_name
                : null,
          },
        )
      }

      /**
       * Stop once we've found every seller.
       */
      if (
        authUsers.size >=
        sellerIds.length
      ) {
        break
      }

      /**
       * No more auth pages.
       */
      if (
        data.users.length <
        200
      ) {
        break
      }

      page += 1

      /**
       * Safety guard.
       */
      if (page > 50) {
        break
      }
    }

    /**
     * --------------------------------------------------------
     * SELLER SUMMARY MAP
     * --------------------------------------------------------
     */
    const sellerMap =
      new Map<
        string,
        SellerSummary
      >()

    for (
      const sellerId of
      sellerIds
    ) {
      const auth =
        authUsers.get(
          sellerId,
        )

      sellerMap.set(
        sellerId,
        {
          userId:
            sellerId,

          email:
            auth?.email ??
            null,

          storeName:
            auth?.storeName ??
            null,

          binderCount: 0,

          activeListings: 0,

          soldListings: 0,

          listedValue: 0,
        },
      )
    }

    /**
     * --------------------------------------------------------
     * COUNT BINDERS
     * --------------------------------------------------------
     */
    for (
      const binder of
      binders
    ) {
      const seller =
        sellerMap.get(
          binder.user_id,
        )

      if (!seller) {
        continue
      }

      seller.binderCount += 1
    }

    /**
     * --------------------------------------------------------
     * COUNT LISTINGS / VALUES
     * --------------------------------------------------------
     */
    for (
      const listing of
      listings
    ) {
      const seller =
        sellerMap.get(
          listing.seller_id,
        )

      if (!seller) {
        continue
      }

      if (
        listing.status ===
        "active"
      ) {
        seller.activeListings +=
          1

        seller.listedValue +=
          Number(
            listing.asking_price ||
              0,
          ) *
          Number(
            listing.quantity ||
              0,
          )
      }

      if (
        listing.status ===
        "sold"
      ) {
        seller.soldListings +=
          1
      }
    }

    /**
     * --------------------------------------------------------
     * GLOBAL SUMMARY
     * --------------------------------------------------------
     */
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

    /**
     * For now, this estimates marketplace revenue from
     * rows marked sold at the 10% fee.
     *
     * Later, when we build actual orders and payouts,
     * platform revenue should come from payment/order
     * transaction records instead.
     */
    const platformRevenue =
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

    const sellers =
      Array.from(
        sellerMap.values(),
      )
        .map(
          (seller) => ({
            ...seller,

            listedValue:
              Number(
                seller.listedValue.toFixed(
                  2,
                ),
              ),
          }),
        )
        .sort(
          (a, b) =>
            b.activeListings -
              a.activeListings ||
            b.listedValue -
              a.listedValue,
        )

    return NextResponse.json({
      summary: {
        sellers:
          sellers.length,

        binders:
          binders.length,

        activeListings:
          activeListings.length,

        soldListings:
          soldListings.length,

        listedValue:
          Number(
            listedValue.toFixed(
              2,
            ),
          ),

        platformRevenue:
          Number(
            platformRevenue.toFixed(
              2,
            ),
          ),
      },

      sellers,
    })
  } catch (error) {
    console.error(
      "Admin sell GET failed:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load marketplace administration",
      },
      {
        status: 500,
      },
    )
  }
}