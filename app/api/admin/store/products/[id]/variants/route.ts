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

type VariantInput = {
  id?: string | null
  name?: string
  sku?: string | null
  upc?: string | null

  option1_name?: string | null
  option1_value?: string | null

  option2_name?: string | null
  option2_value?: string | null

  option3_name?: string | null
  option3_value?: string | null

  price?: number | string | null
  compare_at_price?: number | string | null
  cost?: number | string | null

  inventory_quantity?: number | string

  image_url?: string | null

  active?: boolean
  sort_order?: number
}

function cleanString(
  value: unknown,
) {
  if (typeof value !== "string") {
    return null
  }

  const cleaned = value.trim()

  return cleaned || null
}

function cleanNumber(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

function cleanInteger(
  value: unknown,
  fallback = 0,
) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.max(
    0,
    Math.floor(number),
  )
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const { id: productId } =
      await context.params

    const supabase =
      createAdminClient()

    const {
      data: product,
      error: productError,
    } = await supabase
      .from("store_products")
      .select(
        `
          id,
          name,
          sku,
          price,
          compare_at_price,
          cost,
          has_variants
        `,
      )
      .eq("id", productId)
      .maybeSingle()

    if (
      productError ||
      !product
    ) {
      return NextResponse.json(
        {
          error:
            "Product not found.",
        },
        {
          status: 404,
        },
      )
    }

    const {
      data: variants,
      error,
    } = await supabase
      .from(
        "store_product_variants",
      )
      .select("*")
      .eq(
        "product_id",
        productId,
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )
      .order(
        "created_at",
        {
          ascending: true,
        },
      )

    if (error) {
      console.error(
        "Variant GET error:",
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
      product,
      variants:
        variants ?? [],
    })
  } catch (error) {
    console.error(
      "Variant GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load variants.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const { id: productId } =
      await context.params

    const body =
      await request.json()

    const incoming =
      Array.isArray(
        body.variants,
      )
        ? (body.variants as VariantInput[])
        : []

    const supabase =
      createAdminClient()

    /*
     * Verify product exists.
     */
    const {
      data: product,
      error: productError,
    } = await supabase
      .from("store_products")
      .select(
        `
          id,
          price,
          compare_at_price,
          cost
        `,
      )
      .eq("id", productId)
      .maybeSingle()

    if (
      productError ||
      !product
    ) {
      return NextResponse.json(
        {
          error:
            "Product not found.",
        },
        {
          status: 404,
        },
      )
    }

    /*
     * Load existing IDs so a
     * client cannot update a
     * variant belonging to a
     * different product.
     */
    const {
      data: existingVariants,
      error: existingError,
    } = await supabase
      .from(
        "store_product_variants",
      )
      .select("id")
      .eq(
        "product_id",
        productId,
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

    const existingIds =
      new Set(
        (
          existingVariants ??
          []
        ).map(
          (variant) =>
            variant.id,
        ),
      )

    const submittedExistingIds =
      new Set<string>()

    /*
     * Validate IDs and construct
     * rows.
     */
    const rows = incoming.map(
      (variant, index) => {
        const existingId =
          cleanString(
            variant.id,
          )

        if (
          existingId &&
          !existingIds.has(
            existingId,
          )
        ) {
          throw new Error(
            "One of the submitted variants does not belong to this product.",
          )
        }

        if (existingId) {
          submittedExistingIds.add(
            existingId,
          )
        }

        const option1Name =
          cleanString(
            variant.option1_name,
          )

        const option1Value =
          cleanString(
            variant.option1_value,
          )

        const option2Name =
          cleanString(
            variant.option2_name,
          )

        const option2Value =
          cleanString(
            variant.option2_value,
          )

        const option3Name =
          cleanString(
            variant.option3_name,
          )

        const option3Value =
          cleanString(
            variant.option3_value,
          )

        const generatedName = [
          option1Value,
          option2Value,
          option3Value,
        ]
          .filter(Boolean)
          .join(" / ")

        const name =
          cleanString(
            variant.name,
          ) ??
          generatedName ??
          `Variant ${index + 1}`

        const price =
          cleanNumber(
            variant.price,
          ) ??
          cleanNumber(
            product.price,
          ) ??
          0

        return {
          ...(existingId
            ? {
                id:
                  existingId,
              }
            : {}),

          product_id:
            productId,

          name,

          sku:
            cleanString(
              variant.sku,
            ),

          upc:
            cleanString(
              variant.upc,
            ),

          option1_name:
            option1Name,

          option1_value:
            option1Value,

          option2_name:
            option2Name,

          option2_value:
            option2Value,

          option3_name:
            option3Name,

          option3_value:
            option3Value,

          price,

          compare_at_price:
            cleanNumber(
              variant.compare_at_price,
            ),

          cost:
            cleanNumber(
              variant.cost,
            ),

          inventory_quantity:
            cleanInteger(
              variant.inventory_quantity,
            ),

          image_url:
            cleanString(
              variant.image_url,
            ),

          active:
            variant.active !==
            false,

          sort_order:
            Number.isFinite(
              Number(
                variant.sort_order,
              ),
            )
              ? Number(
                  variant.sort_order,
                )
              : index,
        }
      },
    )

    /*
     * Catch duplicate SKUs before
     * sending them to Postgres.
     */
    const skuSet =
      new Set<string>()

    for (const row of rows) {
      if (!row.sku) {
        continue
      }

      const normalized =
        row.sku.toLowerCase()

      if (
        skuSet.has(
          normalized,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Duplicate variant SKU: ${row.sku}`,
          },
          {
            status: 400,
          },
        )
      }

      skuSet.add(
        normalized,
      )
    }

    /*
     * Delete variants removed
     * from the editor.
     */
    const idsToDelete = [
      ...existingIds,
    ].filter(
      (id) =>
        !submittedExistingIds.has(
          id,
        ),
    )

    if (
      idsToDelete.length >
      0
    ) {
      const {
        error: deleteError,
      } = await supabase
        .from(
          "store_product_variants",
        )
        .delete()
        .eq(
          "product_id",
          productId,
        )
        .in(
          "id",
          idsToDelete,
        )

      if (deleteError) {
        console.error(
          "Variant delete error:",
          deleteError,
        )

        return NextResponse.json(
          {
            error:
              deleteError.message,
          },
          {
            status: 500,
          },
        )
      }
    }

    /*
     * Upsert all submitted rows.
     */
    if (rows.length > 0) {
      const {
        error: upsertError,
      } = await supabase
        .from(
          "store_product_variants",
        )
        .upsert(
          rows,
          {
            onConflict: "id",
          },
        )

      if (upsertError) {
        console.error(
          "Variant upsert error:",
          upsertError,
        )

        if (
          upsertError.code ===
          "23505"
        ) {
          return NextResponse.json(
            {
              error:
                "A variant SKU or UPC is already in use.",
            },
            {
              status: 409,
            },
          )
        }

        return NextResponse.json(
          {
            error:
              upsertError.message,
          },
          {
            status: 500,
          },
        )
      }
    }

    /*
     * Reload canonical rows.
     */
    const {
      data: savedVariants,
      error: reloadError,
    } = await supabase
      .from(
        "store_product_variants",
      )
      .select("*")
      .eq(
        "product_id",
        productId,
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )

    if (reloadError) {
      return NextResponse.json(
        {
          error:
            reloadError.message,
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
      variants:
        savedVariants ?? [],
    })
  } catch (error) {
    console.error(
      "Variant PUT exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save variants.",
      },
      {
        status: 500,
      },
    )
  }
}