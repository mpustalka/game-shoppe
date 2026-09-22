import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const cleaned = value.trim()

  return cleaned || null
}

function cleanInteger(value: unknown, fallback = 0): number {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.floor(number)
}

function validDate(value: string | null): boolean {
  if (!value) {
    return true
  }

  return !Number.isNaN(new Date(value).getTime())
}

export async function GET() {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("store_banners")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      })

    if (error) {
      console.error(
        "Store banners GET error:",
        error,
      )

      return NextResponse.json(
        {
          error: error.message,
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
          error instanceof Error
            ? error.message
            : "Unable to load store banners.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const body = await request.json()

    const title = cleanString(body.title)
    const subtitle = cleanString(body.subtitle)

    const imageUrl = cleanString(body.image_url)
    const mobileImageUrl = cleanString(
      body.mobile_image_url,
    )

    const buttonText = cleanString(body.button_text)
    const buttonUrl = cleanString(body.button_url)

    const startsAt = cleanString(body.starts_at)
    const endsAt = cleanString(body.ends_at)

    if (!title) {
      return NextResponse.json(
        {
          error: "Banner title is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          error:
            "A desktop banner image is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!validDate(startsAt)) {
      return NextResponse.json(
        {
          error: "Invalid banner start date.",
        },
        {
          status: 400,
        },
      )
    }

    if (!validDate(endsAt)) {
      return NextResponse.json(
        {
          error: "Invalid banner end date.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <=
        new Date(startsAt).getTime()
    ) {
      return NextResponse.json(
        {
          error:
            "Banner end date must be after the start date.",
        },
        {
          status: 400,
        },
      )
    }

    const payload = {
      title,
      subtitle,

      image_url: imageUrl,
      mobile_image_url: mobileImageUrl,

      button_text: buttonText,
      button_url: buttonUrl,

      active: body.active !== false,

      sort_order: cleanInteger(
        body.sort_order,
        0,
      ),

      starts_at: startsAt,
      ends_at: endsAt,
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("store_banners")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      console.error(
        "Store banner POST error:",
        error,
      )

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        banner: data,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "Store banner POST exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create banner.",
      },
      {
        status: 500,
      },
    )
  }
}