import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

type UpdateCategoryBody = {
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

type RouteContext = {
  params: Promise<{
    id: string
  }>
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

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  const auth =
    await requireAdmin()

  if (auth instanceof NextResponse) {
    return auth
  }

  try {
    const {
      id,
    } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Category ID is required.",
        },
        {
          status: 400,
        },
      )
    }

    const body =
      (await request.json()) as
        UpdateCategoryBody

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

    if (
      parentId === id
    ) {
      return NextResponse.json(
        {
          error:
            "A category cannot be its own parent.",
        },
        {
          status: 400,
        },
      )
    }

    const supabase =
      createAdminClient()

    /*
     * Make sure the category exists.
     */
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from(
        "store_categories",
      )
      .select(
        "id",
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle()

    if (
      existingError ||
      !existing
    ) {
      return NextResponse.json(
        {
          error:
            "Category not found.",
        },
        {
          status: 404,
        },
      )
    }

    if (parentId) {
      const {
        data: parent,
        error: parentError,
      } = await supabase
        .from(
          "store_categories",
        )
        .select(
          "id, parent_id",
        )
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

      /*
       * Basic protection against making the
       * selected category a child of one of
       * its immediate children.
       */
      if (
        parent.parent_id ===
        id
      ) {
        return NextResponse.json(
          {
            error:
              "That parent selection would create a category loop.",
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
      .update({
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
      .eq(
        "id",
        id,
      )
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
        "Unable to update category:",
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
            "Unable to update category.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
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

        createdAt:
          data.created_at,

        updatedAt:
          data.updated_at,
      },
    })
  } catch (error) {
    console.error(
      "Admin category PUT exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update category.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const auth =
    await requireAdmin()

  if (auth instanceof NextResponse) {
    return auth
  }

  try {
    const {
      id,
    } =
      await context.params

    const supabase =
      createAdminClient()

    /*
     * DO NOT delete a category containing products.
     *
     * This is especially important while your
     * existing 29 products are being migrated.
     */
    const {
      count: productCount,
      error: countError,
    } = await supabase
      .from(
        "store_product_categories",
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .eq(
        "category_id",
        id,
      )

    if (countError) {
      throw countError
    }

    if (
      (productCount ?? 0) >
      0
    ) {
      return NextResponse.json(
        {
          error:
            `This category contains ${productCount} product${productCount === 1 ? "" : "s"}. Move those products before deleting it.`,
        },
        {
          status: 409,
        },
      )
    }

    /*
     * Also protect categories that still have
     * child categories.
     */
    const {
      count: childCount,
      error: childError,
    } = await supabase
      .from(
        "store_categories",
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .eq(
        "parent_id",
        id,
      )

    if (childError) {
      throw childError
    }

    if (
      (childCount ?? 0) >
      0
    ) {
      return NextResponse.json(
        {
          error:
            `This category contains ${childCount} subcategor${childCount === 1 ? "y" : "ies"}. Move or delete those first.`,
        },
        {
          status: 409,
        },
      )
    }

    /*
     * Extra protection:
     *
     * category_id still exists on store_products
     * for backwards compatibility.
     */
    const {
      count: primaryCount,
      error: primaryError,
    } = await supabase
      .from(
        "store_products",
      )
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true,
        },
      )
      .eq(
        "category_id",
        id,
      )

    if (primaryError) {
      throw primaryError
    }

    if (
      (primaryCount ?? 0) >
      0
    ) {
      return NextResponse.json(
        {
          error:
            `This category is still the primary category for ${primaryCount} product${primaryCount === 1 ? "" : "s"}. Reassign those products before deleting it.`,
        },
        {
          status: 409,
        },
      )
    }

    const {
      error,
    } = await supabase
      .from(
        "store_categories",
      )
      .delete()
      .eq(
        "id",
        id,
      )

    if (error) {
      throw error
    }

    return NextResponse.json({
      success:
        true,
    })
  } catch (error) {
    console.error(
      "Admin category DELETE exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete category.",
      },
      {
        status: 500,
      },
    )
  }
}