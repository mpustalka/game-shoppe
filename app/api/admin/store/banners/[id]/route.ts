import {
  NextRequest,
  NextResponse,
} from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function cleanString(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null
  }

  const cleaned =
    value.trim()

  return cleaned || null
}

function cleanInteger(
  value: unknown,
  fallback = 0,
) {
  const number =
    Number(value)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.floor(number)
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const gate =
    await requireAdmin()

  if (
    gate instanceof
    NextResponse
  ) {
    return gate
  }

  try {
    const { id } =
      await context.params

    const body =
      await request.json()

    const title =
      cleanString(
        body.title,
      )

    const imageUrl =
      cleanString(
        body.image_url,
      )

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Banner title is required.",
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

    const payload = {
      title,

      subtitle:
        cleanString(
          body.subtitle,
        ),

      image_url:
        imageUrl,

      mobile_image_url:
        cleanString(
          body.mobile_image_url,
        ),

      button_text:
        cleanString(
          body.button_text,
        ),

      button_url:
        cleanString(
          body.button_url,
        ),

      active:
        body.active === true,

      sort_order:
        cleanInteger(
          body.sort_order,
        ),

      starts_at:
        cleanString(
          body.starts_at,
        ),

      ends_at:
        cleanString(
          body.ends_at,
        ),
    }

    if (
      payload.starts_at &&
      payload.ends_at &&
      new Date(
        payload.ends_at,
      ).getTime() <=
        new Date(
          payload.starts_at,
        ).getTime()
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

    const supabase =
      createAdminClient()

    const {
      data,
      error,
    } = await supabase
      .from("store_banners")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error(
        "Store banner PUT error:",
        error,
      )

      if (
        error.code ===
        "PGRST116"
      ) {
        return NextResponse.json(
          {
            error:
              "Banner not found.",
          },
          {
            status: 404,
          },
        )
      }

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

    return NextResponse.json({
      banner: data,
    })
  } catch (error) {
    console.error(
      "Store banner PUT exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to update banner.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  const gate =
    await requireAdmin()

  if (
    gate instanceof
    NextResponse
  ) {
    return gate
  }

  try {
    const { id } =
      await context.params

    const supabase =
      createAdminClient()

    const {
      error,
    } = await supabase
      .from("store_banners")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(
        "Store banner DELETE error:",
        error,
      )

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

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "Store banner DELETE exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to delete banner.",
      },
      {
        status: 500,
      },
    )
  }
}