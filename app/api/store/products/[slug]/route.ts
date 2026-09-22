import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { slug } = await context.params

    if (!slug) {
      return NextResponse.json(
        {
          error: "Product slug is required",
        },
        {
          status: 400,
        },
      )
    }

    const supabase =
      await createClient()

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Not signed in",
        },
        {
          status: 401,
        },
      )
    }

    const {
      data: product,
      error: productError,
    } = await supabase
      .from("store_products")
      .select(`
        id,
        name,
        slug,
        description,
        sku,
        upc,
        product_type,
        set_name,
        language,
        brand,
        tags,
        price,
        compare_at_price,
        inventory_quantity,
        max_per_customer,
        status,
        featured,
        is_preorder,
        release_date,
        preorder_closes_at,
        image_url,
        image_urls,
        has_variants,
        allow_single_purchase,
        allow_case_purchase,
        units_per_case,
        case_price,
        case_inventory_quantity,
        weight_oz,
        shipping_required,
        category_id,
        created_at,
        updated_at,
        category:store_categories (
          id,
          name,
          slug,
          parent_id
        )
      `)
      .eq("slug", slug)
      .in(
        "status",
        ["active", "sold_out"],
      )
      .single()

    if (productError) {
      if (
        productError.code ===
        "PGRST116"
      ) {
        return NextResponse.json(
          {
            error:
              "Product not found",
          },
          {
            status: 404,
          },
        )
      }

      console.error(
        "Store product GET error:",
        productError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load product",
        },
        {
          status: 500,
        },
      )
    }

    let variants: unknown[] = []

    if (product.has_variants) {
      const {
        data: variantData,
        error: variantError,
      } = await supabase
        .from(
          "store_product_variants",
        )
        .select(`
          id,
          product_id,
          name,
          sku,
          upc,
          option1_name,
          option1_value,
          option2_name,
          option2_value,
          option3_name,
          option3_value,
          price,
          compare_at_price,
          inventory_quantity,
          image_url,
          active,
          sort_order
        `)
        .eq(
          "product_id",
          product.id,
        )
        .eq("active", true)
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

      if (variantError) {
        console.error(
          "Store variants GET error:",
          variantError,
        )

        return NextResponse.json(
          {
            error:
              "Unable to load product variants",
          },
          {
            status: 500,
          },
        )
      }

      variants =
        variantData ?? []
    }

    return NextResponse.json({
      product: {
        ...product,
        variants,
      },
    })
  } catch (error) {
    console.error(
      "Store product GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load product",
      },
      {
        status: 500,
      },
    )
  }
}