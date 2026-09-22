import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

function csvCell(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return ""
  }

  let text: string

  if (Array.isArray(value)) {
    text = value
      .map(String)
      .join(" | ")
  } else if (
    typeof value === "boolean"
  ) {
    text = value
      ? "true"
      : "false"
  } else {
    text = String(value)
  }

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(
      /"/g,
      '""',
    )}"`
  }

  return text
}

export async function GET() {
  const gate =
    await requireAdmin()

  if (
    gate instanceof NextResponse
  ) {
    return gate
  }

  try {
    const supabase =
      createAdminClient()

    const [
      productsResult,
      categoriesResult,
      linksResult,
    ] = await Promise.all([
      supabase
        .from("store_products")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from("store_categories")
        .select(
          "id,name,slug,parent_id",
        ),

      supabase
        .from(
          "store_product_categories",
        )
        .select(
          "product_id,category_id",
        ),
    ])

    if (productsResult.error) {
      console.error(
        "Store export products error:",
        productsResult.error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load products for export.",
        },
        {
          status: 500,
        },
      )
    }

    if (categoriesResult.error) {
      console.error(
        "Store export categories error:",
        categoriesResult.error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load categories for export.",
        },
        {
          status: 500,
        },
      )
    }

    if (linksResult.error) {
      console.error(
        "Store export category links error:",
        linksResult.error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load product category assignments.",
        },
        {
          status: 500,
        },
      )
    }

    const products =
      productsResult.data ?? []

    const categories =
      categoriesResult.data ?? []

    const links =
      linksResult.data ?? []

    const categoryMap =
      new Map(
        categories.map(
          (category) => [
            category.id,
            category,
          ],
        ),
      )

    function categoryPath(
      categoryId:
        | string
        | null,
    ) {
      if (!categoryId) {
        return ""
      }

      const category =
        categoryMap.get(
          categoryId,
        )

      if (!category) {
        return ""
      }

      const names = [
        category.name,
      ]

      let current =
        category

      const visited =
        new Set<string>()

      while (
        current.parent_id &&
        !visited.has(
          current.parent_id,
        )
      ) {
        visited.add(
          current.parent_id,
        )

        const parent =
          categoryMap.get(
            current.parent_id,
          )

        if (!parent) {
          break
        }

        names.unshift(
          parent.name,
        )

        current = parent
      }

      return names.join(" > ")
    }

    const linksByProduct =
      new Map<
        string,
        string[]
      >()

    for (const link of links) {
      const existing =
        linksByProduct.get(
          link.product_id,
        ) ?? []

      existing.push(
        link.category_id,
      )

      linksByProduct.set(
        link.product_id,
        existing,
      )
    }

    const headers = [
      "id",
      "name",
      "slug",
      "sku",
      "upc",
      "brand",
      "product_type",

      "primary_category",
      "additional_categories",

      "pokemon_names",

      "set_name",
      "set_release_date",
      "language",

      "tags",
      "description",

      "distributor",

      "cost",
      "price",
      "compare_at_price",

      "inventory_quantity",
      "max_per_customer",

      "status",
      "featured",

      "is_new_arrival",
      "is_fall_exclusive",
      "is_sale",

      "is_preorder",
      "release_date",
      "preorder_closes_at",

      "has_variants",

      "allow_single_purchase",
      "allow_case_purchase",

      "units_per_case",
      "case_cost",
      "case_price",
      "case_inventory_quantity",

      "weight_oz",

      "package_length_in",
      "package_width_in",
      "package_height_in",

      "easyship_category",

      "case_weight_oz",
      "case_length_in",
      "case_width_in",
      "case_height_in",

      "shipping_required",

      "image_url",
      "image_urls",

      "created_at",
      "updated_at",
    ]

    const rows =
      products.map(
        (product) => {
          const assignedIds =
            linksByProduct.get(
              product.id,
            ) ?? []

          const additional =
            assignedIds
              .filter(
                (categoryId) =>
                  categoryId !==
                  product.category_id,
              )
              .map(
                categoryPath,
              )
              .filter(Boolean)
              .join(" | ")

          const values = [
            product.id,
            product.name,
            product.slug,
            product.sku,
            product.upc,
            product.brand,
            product.product_type,

            categoryPath(
              product.category_id,
            ),

            additional,

            product.pokemon_names,

            product.set_name,
            product.set_release_date,
            product.language,

            product.tags,
            product.description,

            product.distributor,

            product.cost,
            product.price,
            product.compare_at_price,

            product.inventory_quantity,
            product.max_per_customer,

            product.status,
            product.featured,

            product.is_new_arrival,
            product.is_fall_exclusive,
            product.is_sale,

            product.is_preorder,
            product.release_date,
            product.preorder_closes_at,

            product.has_variants,

            product.allow_single_purchase,
            product.allow_case_purchase,

            product.units_per_case,
            product.case_cost,
            product.case_price,
            product.case_inventory_quantity,

            product.weight_oz,

            product.package_length_in,
            product.package_width_in,
            product.package_height_in,

            product.easyship_category,

            product.case_weight_oz,
            product.case_length_in,
            product.case_width_in,
            product.case_height_in,

            product.shipping_required,

            product.image_url,
            product.image_urls,

            product.created_at,
            product.updated_at,
          ]

          return values
            .map(csvCell)
            .join(",")
        },
      )

    const csv = [
      headers.join(","),
      ...rows,
    ].join("\n")

    const date =
      new Date()
        .toISOString()
        .slice(0, 10)

    return new NextResponse(
      `\uFEFF${csv}`,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="store-products-${date}.csv"`,

          "Cache-Control":
            "no-store",
        },
      },
    )
  } catch (error) {
    console.error(
      "Store product export exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to export products.",
      },
      {
        status: 500,
      },
    )
  }
}