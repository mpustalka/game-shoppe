import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase =
      await createClient()

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser()

    if (
      authError ||
      !user
    ) {
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

    const now =
      new Date().toISOString()

    const {
      data,
      error,
    } = await supabase
      .from(
        "store_banners",
      )
      .select(`
        id,
        title,
        subtitle,
        image_url,
        mobile_image_url,
        button_text,
        button_url,
        active,
        sort_order,
        starts_at,
        ends_at
      `)
      .eq(
        "active",
        true,
      )
      .or(
        `starts_at.is.null,starts_at.lte.${now}`,
      )
      .or(
        `ends_at.is.null,ends_at.gte.${now}`,
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )

    if (error) {
      console.error(
        "Store banners GET error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load store banners",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
      banners: data ?? [],
    })
  } catch (error) {
    console.error(
      "Store banners GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load store banners",
      },
      {
        status: 500,
      },
    )
  }
}