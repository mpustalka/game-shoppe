import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    /*
     * PUBLIC STOREFRONT ENDPOINT
     *
     * Store navigation/categories must be available
     * before a customer signs in.
     */
    const supabase =
      await createClient()

    const {
      data,
      error,
    } = await supabase
      .from("store_categories")
      .select(`
        id,
        name,
        slug,
        parent_id,
        description,
        image_url,
        navigation_image_url,
        banner_image_url,
        mobile_banner_image_url,
        featured,
        active,
        sort_order
      `)
      .eq(
        "active",
        true,
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )
      .order(
        "name",
        {
          ascending: true,
        },
      )

    if (error) {
      console.error(
        "Store categories GET error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load store categories",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        categories:
          data ?? [],
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    )
  } catch (error) {
    console.error(
      "Store categories GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load store categories",
      },
      {
        status: 500,
      },
    )
  }
}