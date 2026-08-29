import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function displayName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const storeSnake = user.user_metadata?.store_name
  const storeCamel = user.user_metadata?.storeName
  const fullName = user.user_metadata?.full_name
  const name = user.user_metadata?.name

  for (const value of [
    storeSnake,
    storeCamel,
    fullName,
    name,
  ]) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  const email = user.email ?? ""
  return email.includes("@")
    ? email.split("@")[0]
    : "Collector"
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not signed in" },
        { status: 401 },
      )
    }

    const admin = createAdminClient()

    const { data: listingRows, error: listingError } =
      await admin
        .from("sell_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500)

    if (listingError) {
      return NextResponse.json(
        { error: listingError.message },
        { status: 500 },
      )
    }

    const listings = listingRows ?? []

    if (listings.length === 0) {
      return NextResponse.json({
        currentUserId: user.id,
        listings: [],
      })
    }

    const binderIds = Array.from(
      new Set(
        listings
          .map((row) => row.sell_binder_id)
          .filter(
            (value): value is string =>
              typeof value === "string" && Boolean(value),
          ),
      ),
    )

    const itemIds = Array.from(
      new Set(
        listings
          .map((row) => row.inventory_item_id)
          .filter(
            (value): value is string =>
              typeof value === "string" && Boolean(value),
          ),
      ),
    )

    const sellerIds = Array.from(
      new Set(
        listings
          .map((row) => row.seller_id)
          .filter(
            (value): value is string =>
              typeof value === "string" && Boolean(value),
          ),
      ),
    )

    const [
      { data: binderRows, error: binderError },
      { data: itemRows, error: itemError },
      usersResult,
    ] = await Promise.all([
      binderIds.length
        ? admin
            .from("sell_binders")
            .select(
              "id,user_id,name,description,is_public,is_active",
            )
            .in("id", binderIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
      itemIds.length
        ? admin
            .from("inventory_items")
            .select("*")
            .in("id", itemIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
      admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      }),
    ])

    if (binderError) {
      return NextResponse.json(
        { error: binderError.message },
        { status: 500 },
      )
    }

    if (itemError) {
      return NextResponse.json(
        { error: itemError.message },
        { status: 500 },
      )
    }

    const publicBinders = new Map(
      (binderRows ?? [])
        .filter(
          (binder) =>
            binder.is_public === true &&
            binder.is_active === true,
        )
        .map((binder) => [binder.id, binder]),
    )

    const items = new Map(
      (itemRows ?? []).map((item) => [item.id, item]),
    )

    const users = usersResult.data?.users ?? []
    const sellers = new Map(
      users
        .filter((candidate) =>
          sellerIds.includes(candidate.id),
        )
        .map((candidate) => [
          candidate.id,
          {
            id: candidate.id,
            displayName: displayName(candidate),
          },
        ]),
    )

    const result = listings
      .map((listing) => {
        const binder = publicBinders.get(
          listing.sell_binder_id,
        )

        if (
          !binder ||
          binder.user_id !== listing.seller_id
        ) {
          return null
        }

        return {
          ...listing,
          binder,
          item:
            items.get(listing.inventory_item_id) ??
            null,
          seller:
            sellers.get(listing.seller_id) ?? {
              id: listing.seller_id,
              displayName: "Collector",
            },
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      currentUserId: user.id,
      listings: result,
    })
  } catch (error) {
    console.error("Marketplace GET failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load marketplace",
      },
      { status: 500 },
    )
  }
}