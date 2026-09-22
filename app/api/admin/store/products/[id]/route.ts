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
    typeof value !==
    "string"
  ) {
    return null
  }

  const cleaned =
    value.trim()

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

  const number =
    Number(value)

  return Number.isFinite(
    number,
  )
    ? number
    : null
}

function cleanInteger(
  value: unknown,
  fallback = 0,
) {
  const number =
    Number(value)

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return fallback
  }

  return Math.max(
    0,
    Math.floor(number),
  )
}

function cleanStringArray(
  value: unknown,
) {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map((item) =>
            typeof item ===
            "string"
              ? item.trim()
              : "",
          )
          .filter(Boolean),
      ),
    ]
  }

  if (
    typeof value ===
    "string"
  ) {
    return [
      ...new Set(
        value
          .split(",")
          .map((item) =>
            item.trim(),
          )
          .filter(Boolean),
      ),
    ]
  }

  return []
}

function cleanImageUrls(
  value: unknown,
) {
  if (
    !Array.isArray(value)
  ) {
    return []
  }

  return [
    ...new Set(
      value
        .map((item) =>
          typeof item ===
          "string"
            ? item.trim()
            : "",
        )
        .filter(Boolean),
    ),
  ]
}

export async function GET(
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

    const [
      productResult,
      categoryResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "store_products",
          )
          .select(
            `
              *,
              category:store_categories (
                id,
                name,
                slug,
                parent_id
              )
            `,
          )
          .eq("id", id)
          .single(),

        supabase
          .from(
            "store_product_categories",
          )
          .select(
            "category_id",
          )
          .eq(
            "product_id",
            id,
          ),
      ])

    const {
      data: product,
      error,
    } = productResult

    if (
      error ||
      !product
    ) {
      if (
        error?.code ===
        "PGRST116"
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

      console.error(
        "Admin store product GET error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            error?.message ??
            "Unable to load product.",
        },
        {
          status: 500,
        },
      )
    }

    if (
      categoryResult.error
    ) {
      console.error(
        "Admin product category GET error:",
        categoryResult.error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load product categories.",
        },
        {
          status: 500,
        },
      )
    }

    const assignedIds =
      (
        categoryResult.data ??
        []
      ).map(
        (row) =>
          row.category_id,
      )

    const additionalCategoryIds =
      assignedIds.filter(
        (categoryId) =>
          categoryId !==
          product.category_id,
      )

    return NextResponse.json({
      product: {
        ...product,

        additional_category_ids:
          additionalCategoryIds,
      },
    })
  } catch (error) {
    console.error(
      "Admin store product GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load product.",
      },
      {
        status: 500,
      },
    )
  }
}

export async function PATCH(
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

    const name =
      cleanString(
        body.name,
      )

    const categoryId =
      cleanString(
        body.category_id,
      )

    const productType =
      cleanString(
        body.product_type,
      )

    const price =
      cleanNumber(
        body.price,
      )

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Product name is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          error:
            "Product category is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!productType) {
      return NextResponse.json(
        {
          error:
            "Product type is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      price === null ||
      price < 0
    ) {
      return NextResponse.json(
        {
          error:
            "A valid selling price is required.",
        },
        {
          status: 400,
        },
      )
    }

    const allowSingle =
      body.allow_single_purchase !==
      false

    const allowCase =
      body.allow_case_purchase ===
      true

    if (
      !allowSingle &&
      !allowCase
    ) {
      return NextResponse.json(
        {
          error:
            "Enable single-item or case purchasing.",
        },
        {
          status: 400,
        },
      )
    }

    const unitsPerCase =
      cleanInteger(
        body.units_per_case,
      )

    const casePrice =
      cleanNumber(
        body.case_price,
      )

    if (
      allowCase &&
      unitsPerCase < 1
    ) {
      return NextResponse.json(
        {
          error:
            "Units per case must be at least 1.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      allowCase &&
      (casePrice === null ||
        casePrice < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Case selling price is required.",
        },
        {
          status: 400,
        },
      )
    }

    const additionalCategoryIds =
      cleanStringArray(
        body.additional_category_ids,
      ).filter(
        (category) =>
          category !==
          categoryId,
      )

    const allCategoryIds = [
      categoryId,
      ...additionalCategoryIds,
    ]

    const supabase =
      createAdminClient()

    /*
     * Validate all selected
     * categories before updating.
     */
    const {
      data:
        validCategories,
      error:
        categoryError,
    } = await supabase
      .from(
        "store_categories",
      )
      .select("id")
      .in(
        "id",
        allCategoryIds,
      )
      .eq(
        "active",
        true,
      )

    if (categoryError) {
      console.error(
        "Category validation error:",
        categoryError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to validate categories.",
        },
        {
          status: 500,
        },
      )
    }

    const validIds =
      new Set(
        (
          validCategories ??
          []
        ).map(
          (category) =>
            category.id,
        ),
      )

    if (
      allCategoryIds.some(
        (category) =>
          !validIds.has(
            category,
          ),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "One or more selected categories do not exist or are inactive.",
        },
        {
          status: 400,
        },
      )
    }

    const imageUrls =
      cleanImageUrls(
        body.image_urls,
      )

    const requestedPrimary =
      cleanString(
        body.image_url,
      )

    const primaryImage =
      requestedPrimary &&
      imageUrls.includes(
        requestedPrimary,
      )
        ? requestedPrimary
        : imageUrls[0] ??
          requestedPrimary ??
          null

    const payload = {
      name,

      category_id:
        categoryId,

      product_type:
        productType,

      set_name:
        cleanString(
          body.set_name,
        ),

      set_release_date:
        cleanString(
          body.set_release_date,
        ),

      pokemon_names:
        cleanStringArray(
          body.pokemon_names,
        ),

      brand:
        cleanString(
          body.brand,
        ),

      language:
        cleanString(
          body.language,
        ) ?? "English",

      description:
        cleanString(
          body.description,
        ),

      tags:
        cleanStringArray(
          body.tags,
        ),

      sku:
        cleanString(
          body.sku,
        ),

      upc:
        cleanString(
          body.upc,
        ),

      distributor:
        cleanString(
          body.distributor,
        ),

      cost:
        cleanNumber(
          body.cost,
        ),

      price,

      compare_at_price:
        cleanNumber(
          body.compare_at_price,
        ),

      inventory_quantity:
        cleanInteger(
          body.inventory_quantity,
        ),

      max_per_customer:
        body.max_per_customer ===
          null ||
        body.max_per_customer ===
          undefined ||
        body.max_per_customer ===
          ""
          ? null
          : Math.max(
              1,
              cleanInteger(
                body.max_per_customer,
                1,
              ),
            ),

      status: [
        "draft",
        "active",
        "sold_out",
        "archived",
      ].includes(
        body.status,
      )
        ? body.status
        : "draft",

      featured:
        body.featured ===
        true,

      is_new_arrival:
        body.is_new_arrival ===
        true,

      is_fall_exclusive:
        body.is_fall_exclusive ===
        true,

      is_sale:
        body.is_sale ===
        true,

      is_preorder:
        body.is_preorder ===
        true,

      release_date:
        cleanString(
          body.release_date,
        ),

      preorder_closes_at:
        cleanString(
          body.preorder_closes_at,
        ),

      has_variants:
        body.has_variants ===
        true,

      allow_single_purchase:
        allowSingle,

      allow_case_purchase:
        allowCase,

      units_per_case:
        allowCase
          ? unitsPerCase
          : null,

      case_cost:
        allowCase
          ? cleanNumber(
              body.case_cost,
            )
          : null,

      case_price:
        allowCase
          ? casePrice
          : null,

      case_inventory_quantity:
        allowCase
          ? cleanInteger(
              body.case_inventory_quantity,
            )
          : 0,

      weight_oz:
        cleanNumber(
          body.weight_oz,
        ),

      package_length_in:
        cleanNumber(
          body.package_length_in,
        ),

      package_width_in:
        cleanNumber(
          body.package_width_in,
        ),

      package_height_in:
        cleanNumber(
          body.package_height_in,
        ),

      easyship_category:
        cleanString(
          body.easyship_category,
        ),

      case_weight_oz:
        allowCase
          ? cleanNumber(
              body.case_weight_oz,
            )
          : null,

      case_length_in:
        allowCase
          ? cleanNumber(
              body.case_length_in,
            )
          : null,

      case_width_in:
        allowCase
          ? cleanNumber(
              body.case_width_in,
            )
          : null,

      case_height_in:
        allowCase
          ? cleanNumber(
              body.case_height_in,
            )
          : null,

      shipping_required:
        body.shipping_required !==
        false,

      image_url:
        primaryImage,

      image_urls:
        imageUrls,
    }

    const {
      data: product,
      error,
    } = await supabase
      .from(
        "store_products",
      )
      .update(payload)
      .eq("id", id)
      .select(
        `
          *,
          category:store_categories (
            id,
            name,
            slug,
            parent_id
          )
        `,
      )
      .single()

    if (error) {
      console.error(
        "Admin store product PATCH error:",
        error,
      )

      if (
        error.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "Another product already uses that SKU, UPC, or slug.",
          },
          {
            status: 409,
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

    /*
     * Product is valid and updated.
     * Now synchronize its complete
     * category relationship set.
     */
    const {
      error: deleteError,
    } = await supabase
      .from(
        "store_product_categories",
      )
      .delete()
      .eq(
        "product_id",
        id,
      )

    if (deleteError) {
      console.error(
        "Category relationship delete error:",
        deleteError,
      )

      return NextResponse.json(
        {
          error:
            "Product was updated, but category assignments could not be synchronized.",
        },
        {
          status: 500,
        },
      )
    }

    const categoryLinks =
      allCategoryIds.map(
        (category_id) => ({
          product_id: id,
          category_id,
        }),
      )

    const {
      error:
        categoryLinkError,
    } = await supabase
      .from(
        "store_product_categories",
      )
      .insert(
        categoryLinks,
      )

    if (
      categoryLinkError
    ) {
      console.error(
        "Category relationship insert error:",
        categoryLinkError,
      )

      /*
       * At minimum restore the
       * primary category relationship.
       */
      await supabase
        .from(
          "store_product_categories",
        )
        .upsert(
          {
            product_id:
              id,

            category_id:
              categoryId,
          },
          {
            onConflict:
              "product_id,category_id",
          },
        )

      return NextResponse.json(
        {
          error:
            "Product was updated, but some category assignments could not be saved.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
      product: {
        ...product,

        additional_category_ids:
          additionalCategoryIds,
      },
    })
  } catch (error) {
    console.error(
      "Admin store product PATCH exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to update product.",
      },
      {
        status: 500,
      },
    )
  }
}