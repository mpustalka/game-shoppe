import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

type CreateCategoryBody = {
  name?: string
  slug?: string
  description?: string | null

  parentId?: string | null

  imageUrl?: string | null
  navigationImageUrl?: string | null
  bannerImageUrl?: string | null
  mobileBannerImageUrl?: string | null

  featured?: boolean
  active?: boolean
  sortOrder?: number
}

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : ""
}

function nullableString(value: unknown) {
  const valueString =
    cleanString(value)

  return valueString || null
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET() {
  const auth =
    await requireAdmin()

  if (auth instanceof NextResponse) {
    return auth
  }

  try {
    const supabase =
      createAdminClient()

    const {
      data: categories,
      error,
    } = await supabase
      .from("store_categories")
      .select(`
        id,
        name,
        slug,
        description,
        parent_id,
        image_url,
        navigation_image_url,
        banner_image_url,
        mobile_banner_image_url,
        featured,
        active,
        sort_order,
        created_at,
        updated_at
      `)
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
        "Unable to load store categories:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load categories.",
        },
        {
          status: 500,
        },
      )
    }

    /*
     * Count product relationships separately.
     *
     * This lets the admin UI show:
     *
     * Booster Boxes
     * 14 products
     */
    const {
      data: links,
      error: linkError,
    } = await supabase
      .from(
        "store_product_categories",
      )
      .select(
        "category_id",
      )

    if (linkError) {
      console.error(
        "Unable to load category product counts:",
        linkError,
      )
    }

    const counts =
      new Map<string, number>()

    for (
      const link of
        links ?? []
    ) {
      const categoryId =
        String(
          link.category_id,
        )

      counts.set(
        categoryId,
        (counts.get(
          categoryId,
        ) ?? 0) + 1,
      )
    }

    const normalized =
      (categories ?? []).map(
        (category) => ({
          id:
            category.id,

          name:
            category.name,

          slug:
            category.slug,

          description:
            category.description,

          parentId:
            category.parent_id,

          imageUrl:
            category.image_url,

          navigationImageUrl:
            category.navigation_image_url,

          bannerImageUrl:
            category.banner_image_url,

          mobileBannerImageUrl:
            category.mobile_banner_image_url,

          featured:
            Boolean(
              category.featured,
            ),

          active:
            category.active !==
            false,

          sortOrder:
            Number(
              category.sort_order ??
                0,
            ),

          productCount:
            counts.get(
              category.id,
            ) ?? 0,

          createdAt:
            category.created_at,

          updatedAt:
            category.updated_at,
        }),
      )

    return NextResponse.json({
      categories:
        normalized,
    })
  } catch (error) {
    console.error(
      "Admin category GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load categories.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(
  request: Request,
) {
  const auth =
    await requireAdmin()

  if (auth instanceof NextResponse) {
    return auth
  }

  try {
    const body =
      (await request.json()) as
        CreateCategoryBody

    const name =
      cleanString(body.name)

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Category name is required.",
        },
        {
          status: 400,
        },
      )
    }

    const slug =
      makeSlug(
        cleanString(
          body.slug,
        ) || name,
      )

    if (!slug) {
      return NextResponse.json(
        {
          error:
            "A valid category slug is required.",
        },
        {
          status: 400,
        },
      )
    }

    const parentId =
      nullableString(
        body.parentId,
      )

    const supabase =
      createAdminClient()

    /*
     * Make sure the selected parent
     * actually exists.
     */
    if (parentId) {
      const {
        data: parent,
        error: parentError,
      } = await supabase
        .from(
          "store_categories",
        )
        .select("id")
        .eq(
          "id",
          parentId,
        )
        .maybeSingle()

      if (
        parentError ||
        !parent
      ) {
        return NextResponse.json(
          {
            error:
              "The selected parent category does not exist.",
          },
          {
            status: 400,
          },
        )
      }
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        "store_categories",
      )
      .insert({
        name,
        slug,

        description:
          nullableString(
            body.description,
          ),

        parent_id:
          parentId,

        image_url:
          nullableString(
            body.imageUrl,
          ),

        navigation_image_url:
          nullableString(
            body.navigationImageUrl,
          ),

        banner_image_url:
          nullableString(
            body.bannerImageUrl,
          ),

        mobile_banner_image_url:
          nullableString(
            body.mobileBannerImageUrl,
          ),

        featured:
          Boolean(
            body.featured,
          ),

        active:
          body.active !==
          false,

        sort_order:
          Number.isFinite(
            Number(
              body.sortOrder,
            ),
          )
            ? Number(
                body.sortOrder,
              )
            : 0,
      })
      .select(`
        id,
        name,
        slug,
        description,
        parent_id,
        image_url,
        navigation_image_url,
        banner_image_url,
        mobile_banner_image_url,
        featured,
        active,
        sort_order,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error(
        "Unable to create category:",
        error,
      )

      if (
        error.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "A category with that slug already exists.",
          },
          {
            status: 409,
          },
        )
      }

      return NextResponse.json(
        {
          error:
            error.message ||
            "Unable to create category.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        category: {
          id:
            data.id,

          name:
            data.name,

          slug:
            data.slug,

          description:
            data.description,

          parentId:
            data.parent_id,

          imageUrl:
            data.image_url,

          navigationImageUrl:
            data.navigation_image_url,

          bannerImageUrl:
            data.banner_image_url,

          mobileBannerImageUrl:
            data.mobile_banner_image_url,

          featured:
            Boolean(
              data.featured,
            ),

          active:
            data.active !==
            false,

          sortOrder:
            Number(
              data.sort_order ??
                0,
            ),

          productCount:
            0,

          createdAt:
            data.created_at,

          updatedAt:
            data.updated_at,
        },
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "Admin category POST exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create category.",
      },
      {
        status: 500,
      },
    )
  }
}