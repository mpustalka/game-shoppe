import {
  NextRequest,
  NextResponse,
} from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { slugifyProductName } from "@/lib/store"

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const cleaned = value.trim()

  return cleaned || null
}

function requiredString(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function optionalNumber(value: unknown) {
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

function nonNegativeInteger(
  value: unknown,
  fallback = 0,
) {
  const number =
    optionalNumber(value)

  if (number === null) {
    return fallback
  }

  return Math.max(
    0,
    Math.floor(number),
  )
}

function parseStringArray(
  value: unknown,
) {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
          .map((item) =>
            item.trim(),
          )
          .filter(Boolean),
      ),
    ]
  }

  if (typeof value === "string") {
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

function parseImageUrls(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .filter(
          (
            item,
          ): item is string =>
            typeof item ===
            "string",
        )
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean),
    ),
  ]
}

function parseCategoryIds(
  value: unknown,
) {
  return parseStringArray(
    value,
  )
}

export async function GET() {
  const gate =
    await requireAdmin()

  if (
    gate instanceof
    NextResponse
  ) {
    return gate
  }

  try {
    const supabase =
      createAdminClient()

    const {
      data,
      error,
    } = await supabase
      .from("store_products")
      .select(`
        *,
        category:store_categories (
          id,
          name,
          slug
        )
      `)
      .order("created_at", {
        ascending: false,
      })

    if (error) {
      console.error(
        "Admin store products GET error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load store products",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
      products: data ?? [],
    })
  } catch (error) {
    console.error(
      "Admin store products GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load store products",
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(
  request: NextRequest,
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
    const body =
      await request.json()

    const name =
      requiredString(
        body.name,
      )

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Product name is required",
        },
        {
          status: 400,
        },
      )
    }

    const productType =
      requiredString(
        body.product_type,
      )

    if (!productType) {
      return NextResponse.json(
        {
          error:
            "Product type is required",
        },
        {
          status: 400,
        },
      )
    }

    const categoryId =
      optionalString(
        body.category_id,
      )

    if (!categoryId) {
      return NextResponse.json(
        {
          error:
            "Product category is required",
        },
        {
          status: 400,
        },
      )
    }

    const price =
      optionalNumber(
        body.price,
      )

    if (
      price === null ||
      price < 0
    ) {
      return NextResponse.json(
        {
          error:
            "A valid selling price is required",
        },
        {
          status: 400,
        },
      )
    }

    const cost =
      optionalNumber(
        body.cost,
      )

    const compareAtPrice =
      optionalNumber(
        body.compare_at_price,
      )

    const maxPerCustomer =
      optionalNumber(
        body.max_per_customer,
      )

    const weightOz =
      optionalNumber(
        body.weight_oz,
      )

    const packageLength =
      optionalNumber(
        body.package_length_in,
      )

    const packageWidth =
      optionalNumber(
        body.package_width_in,
      )

    const packageHeight =
      optionalNumber(
        body.package_height_in,
      )

    const caseWeightOz =
      optionalNumber(
        body.case_weight_oz,
      )

    const caseLength =
      optionalNumber(
        body.case_length_in,
      )

    const caseWidth =
      optionalNumber(
        body.case_width_in,
      )

    const caseHeight =
      optionalNumber(
        body.case_height_in,
      )

    const allowCasePurchase =
      Boolean(
        body.allow_case_purchase,
      )

    const allowSinglePurchase =
      body.allow_single_purchase !==
      false

    const unitsPerCase =
      optionalNumber(
        body.units_per_case,
      )

    const casePrice =
      optionalNumber(
        body.case_price,
      )

    const caseCost =
      optionalNumber(
        body.case_cost,
      )

    if (
      allowCasePurchase &&
      (!unitsPerCase ||
        unitsPerCase < 1)
    ) {
      return NextResponse.json(
        {
          error:
            "Units per case is required when case sales are enabled.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      allowCasePurchase &&
      (casePrice === null ||
        casePrice < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Case price is required when case sales are enabled.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !allowSinglePurchase &&
      !allowCasePurchase
    ) {
      return NextResponse.json(
        {
          error:
            "Enable either single-item or case purchasing.",
        },
        {
          status: 400,
        },
      )
    }

    const statuses = [
      "draft",
      "active",
      "sold_out",
      "archived",
    ]

    const status =
      statuses.includes(
        body.status,
      )
        ? body.status
        : "draft"

    const requestedSlug =
      optionalString(
        body.slug,
      ) ??
      slugifyProductName(
        name,
      )

    if (!requestedSlug) {
      return NextResponse.json(
        {
          error:
            "Unable to generate product slug",
        },
        {
          status: 400,
        },
      )
    }

    const additionalCategoryIds =
      parseCategoryIds(
        body.additional_category_ids,
      ).filter(
        (id) =>
          id !== categoryId,
      )

    const allCategoryIds = [
      categoryId,
      ...additionalCategoryIds,
    ]

    const supabase =
      createAdminClient()

    /*
     * Validate every category
     * before creating anything.
     */
    const {
      data: validCategories,
      error:
        categoryValidationError,
    } = await supabase
      .from("store_categories")
      .select("id")
      .in(
        "id",
        allCategoryIds,
      )
      .eq(
        "active",
        true,
      )

    if (
      categoryValidationError
    ) {
      console.error(
        "Category validation error:",
        categoryValidationError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to validate categories",
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

    const invalidCategory =
      allCategoryIds.find(
        (id) =>
          !validIds.has(id),
      )

    if (invalidCategory) {
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
      parseImageUrls(
        body.image_urls,
      )

    const mainImage =
      optionalString(
        body.image_url,
      ) ??
      imageUrls[0] ??
      null

    const product = {
      name,

      slug:
        requestedSlug,

      description:
        optionalString(
          body.description,
        ),

      sku:
        optionalString(
          body.sku,
        ),

      upc:
        optionalString(
          body.upc,
        ),

      category_id:
        categoryId,

      product_type:
        productType,

      set_name:
        optionalString(
          body.set_name,
        ),

      set_release_date:
        optionalString(
          body.set_release_date,
        ),

      pokemon_names:
        parseStringArray(
          body.pokemon_names,
        ),

      brand:
        optionalString(
          body.brand,
        ),

      language:
        optionalString(
          body.language,
        ) ?? "English",

      tags:
        parseStringArray(
          body.tags,
        ),

      distributor:
        optionalString(
          body.distributor,
        ),

      cost,

      price,

      compare_at_price:
        compareAtPrice,

      inventory_quantity:
        nonNegativeInteger(
          body.inventory_quantity,
        ),

      max_per_customer:
        maxPerCustomer ===
        null
          ? null
          : Math.max(
              1,
              Math.floor(
                maxPerCustomer,
              ),
            ),

      status,

      featured:
        Boolean(
          body.featured,
        ),

      is_new_arrival:
        Boolean(
          body.is_new_arrival,
        ),

      is_fall_exclusive:
        Boolean(
          body.is_fall_exclusive,
        ),

      is_sale:
        Boolean(
          body.is_sale,
        ),

      is_preorder:
        Boolean(
          body.is_preorder,
        ),

      release_date:
        optionalString(
          body.release_date,
        ),

      preorder_closes_at:
        optionalString(
          body.preorder_closes_at,
        ),

      has_variants:
        Boolean(
          body.has_variants,
        ),

      allow_single_purchase:
        allowSinglePurchase,

      allow_case_purchase:
        allowCasePurchase,

      units_per_case:
        allowCasePurchase
          ? Math.floor(
              unitsPerCase!,
            )
          : null,

      case_price:
        allowCasePurchase
          ? casePrice
          : null,

      case_cost:
        allowCasePurchase
          ? caseCost
          : null,

      case_inventory_quantity:
        allowCasePurchase
          ? nonNegativeInteger(
              body.case_inventory_quantity,
            )
          : 0,

      weight_oz:
        weightOz,

      package_length_in:
        packageLength,

      package_width_in:
        packageWidth,

      package_height_in:
        packageHeight,

      easyship_category:
        optionalString(
          body.easyship_category,
        ),

      case_weight_oz:
        allowCasePurchase
          ? caseWeightOz
          : null,

      case_length_in:
        allowCasePurchase
          ? caseLength
          : null,

      case_width_in:
        allowCasePurchase
          ? caseWidth
          : null,

      case_height_in:
        allowCasePurchase
          ? caseHeight
          : null,

      shipping_required:
        body.shipping_required !==
        false,

      image_url:
        mainImage,

      image_urls:
        imageUrls,
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        "store_products",
      )
      .insert(product)
      .select("*")
      .single()

    if (error) {
      console.error(
        "Admin store product POST error:",
        error,
      )

      if (
        error.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "A product with this SKU or URL slug already exists.",
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
     * Store primary + additional
     * category relationships.
     */
    const categoryLinks =
      allCategoryIds.map(
        (category_id) => ({
          product_id:
            data.id,

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
      .upsert(
        categoryLinks,
        {
          onConflict:
            "product_id,category_id",
          ignoreDuplicates:
            true,
        },
      )

    if (categoryLinkError) {
      console.error(
        "Product category link error:",
        categoryLinkError,
      )

      /*
       * Avoid leaving a partially
       * created product behind.
       */
      await supabase
        .from(
          "store_products",
        )
        .delete()
        .eq(
          "id",
          data.id,
        )

      return NextResponse.json(
        {
          error:
            "The product could not be linked to its categories.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        product: {
          ...data,

          additional_category_ids:
            additionalCategoryIds,
        },
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "Admin store product POST exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to create product",
      },
      {
        status: 500,
      },
    )
  }
}