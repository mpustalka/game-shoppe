import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    /*
     * PUBLIC STOREFRONT ENDPOINT
     *
     * Customers do not need to be signed in to browse
     * products. Supabase RLS controls which rows are
     * publicly readable.
     */
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("store_products")
      .select(`
        id,
        name,
        slug,
        description,
        product_type,
        set_name,
        set_release_date,
        pokemon_names,
        language,
        brand,
        tags,
        price,
        sku,
        upc,
        compare_at_price,
        inventory_quantity,
        status,
        featured,
        is_new_arrival,
        is_fall_exclusive,
        is_sale,
        is_preorder,
        release_date,
        preorder_closes_at,
        image_url,
        has_variants,
        allow_single_purchase,
        allow_case_purchase,
        units_per_case,
        case_price,
        case_inventory_quantity,
        category_id,
        created_at,
        category:store_categories (
          id,
          name,
          slug,
          parent_id
        ),
        variants:store_product_variants (
          price,
          inventory_quantity,
          active
        )
      `)
      .in("status", [
        "active",
        "sold_out",
      ])
      .order("featured", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })

    if (error) {
      console.error(
        "Store products GET error:",
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

    const products = (data ?? []).map(
      (product) => {
        const activeVariants =
          (product.variants ?? []).filter(
            (variant) =>
              variant.active,
          )

        const variantInventory =
          activeVariants.reduce(
            (total, variant) =>
              total +
              Number(
                variant.inventory_quantity ??
                  0,
              ),
            0,
          )

        const variantPrices =
          activeVariants
            .map((variant) =>
              Number(
                variant.price,
              ),
            )
            .filter(
              (price) =>
                Number.isFinite(
                  price,
                ) &&
                price >= 0,
            )

        const lowestVariantPrice =
          variantPrices.length
            ? Math.min(
                ...variantPrices,
              )
            : null

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,

          description:
            product.description,

          product_type:
            product.product_type,

          set_name:
            product.set_name,

          set_release_date:
            product.set_release_date,

          pokemon_names:
            product.pokemon_names ??
            [],

          language:
            product.language,

          brand:
            product.brand,

          tags:
            product.tags ?? [],

          price:
            product.price,

          sku:
            product.sku,

          upc:
            product.upc,

          compare_at_price:
            product.compare_at_price,

          inventory_quantity:
            product.inventory_quantity,

          status:
            product.status,

          featured:
            product.featured,

          is_new_arrival:
            product.is_new_arrival,

          is_fall_exclusive:
            product.is_fall_exclusive,

          is_sale:
            product.is_sale,

          is_preorder:
            product.is_preorder,

          release_date:
            product.release_date,

          preorder_closes_at:
            product.preorder_closes_at,

          image_url:
            product.image_url,

          has_variants:
            product.has_variants,

          variant_inventory_quantity:
            variantInventory,

          lowest_variant_price:
            lowestVariantPrice,

          allow_single_purchase:
            product.allow_single_purchase,

          allow_case_purchase:
            product.allow_case_purchase,

          units_per_case:
            product.units_per_case,

          case_price:
            product.case_price,

          case_inventory_quantity:
            product.case_inventory_quantity,

          category_id:
            product.category_id,

          category:
            product.category,

          created_at:
            product.created_at,
        }
      },
    )

    return NextResponse.json(
      {
        products,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error(
      "Store products GET exception:",
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