import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type IncomingCartItem = {
  productId: string

  variantId:
    | string
    | null

  purchaseType:
    | "single"
    | "case"

  quantity: number
}

function numberValue(value: unknown): number {
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    return 0
  }

  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

export async function POST(
  request: Request,
) {
  try {
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

    const body =
      await request.json()

    const incomingItems:
      IncomingCartItem[] =
      Array.isArray(body.items)
        ? body.items
        : []

    if (!incomingItems.length) {
      return NextResponse.json(
        {
          error:
            "Your cart is empty",
        },
        {
          status: 400,
        },
      )
    }

    const productIds = [
      ...new Set(
        incomingItems.map(
          (item) =>
            item.productId,
        ),
      ),
    ]

    const {
      data: products,
      error: productsError,
    } = await supabase
      .from("store_products")
      .select(`
        id,
        name,
        slug,
        sku,
        price,
        inventory_quantity,
        max_per_customer,
        status,
        is_preorder,
        release_date,
        image_url,
        image_urls,
        has_variants,
        allow_single_purchase,
        allow_case_purchase,
        units_per_case,
        case_price,
        case_inventory_quantity,
        weight_oz,
        shipping_required
      `)
      .in("id", productIds)
      .in(
        "status",
        ["active", "sold_out"],
      )

    if (productsError) {
      console.error(
        "Checkout product validation error:",
        productsError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to validate cart",
        },
        {
          status: 500,
        },
      )
    }

    const variantIds =
      incomingItems
        .map(
          (item) =>
            item.variantId,
        )
        .filter(
          (
            id,
          ): id is string =>
            Boolean(id),
        )

    type StoreVariantRow = {
  id: string
  product_id: string
  name: string | null
  sku: string | null
  price: number | string | null
  inventory_quantity: number | string | null
  image_url: string | null
  active: boolean
}

let variants: StoreVariantRow[] = []

    if (variantIds.length) {
      const {
        data,
        error,
      } = await supabase
        .from(
          "store_product_variants",
        )
        .select(`
          id,
          product_id,
          name,
          sku,
          price,
          inventory_quantity,
          image_url,
          active
        `)
        .in(
          "id",
          variantIds,
        )
        .eq(
          "active",
          true,
        )

      if (error) {
        console.error(
          "Checkout variant validation error:",
          error,
        )

        return NextResponse.json(
          {
            error:
              "Unable to validate cart variants",
          },
          {
            status: 500,
          },
        )
      }

      variants =
        data ?? []
    }

    const productMap =
      new Map(
        (products ?? []).map(
          (product) => [
            product.id,
            product,
          ],
        ),
      )

    const variantMap =
      new Map(
        variants.map(
          (variant) => [
            String(
              variant.id,
            ),
            variant,
          ],
        ),
      )

    const validatedItems = []

    let subtotal = 0
    let totalWeightOz = 0
    let shippingRequired =
      false

    for (
      const item of
      incomingItems
    ) {
      const product =
        productMap.get(
          item.productId,
        )

      if (!product) {
        return NextResponse.json(
          {
            error:
              "A product in your cart is no longer available",
          },
          {
            status: 409,
          },
        )
      }

      if (
        product.status ===
        "sold_out"
      ) {
        return NextResponse.json(
          {
            error:
              `${product.name} is sold out`,
          },
          {
            status: 409,
          },
        )
      }

      const quantity =
        Math.max(
          1,
          Math.floor(
            numberValue(
              item.quantity,
            ),
          ),
        )

      const maxPerCustomer =
        numberValue(
          product.max_per_customer,
        )

      if (
        maxPerCustomer >
          0 &&
        quantity >
          maxPerCustomer
      ) {
        return NextResponse.json(
          {
            error:
              `${product.name} is limited to ${maxPerCustomer} per customer`,
          },
          {
            status: 409,
          },
        )
      }

      let unitPrice = 0
      let inventory = 0

      let sku =
        product.sku

      let variantName:
        | string
        | null = null

      let variantId:
        | string
        | null = null

      let imageUrl =
        product.image_url ??
        product.image_urls?.[0] ??
        null

      let weightMultiplier =
        1

      if (
        item.purchaseType ===
        "case"
      ) {
        if (
          !product.allow_case_purchase
        ) {
          return NextResponse.json(
            {
              error:
                `${product.name} is not available by case`,
            },
            {
              status: 409,
            },
          )
        }

        unitPrice =
          numberValue(
            product.case_price,
          )

        inventory =
          numberValue(
            product.case_inventory_quantity,
          )

        weightMultiplier =
          Math.max(
            1,
            numberValue(
              product.units_per_case,
            ),
          )
      } else {
        if (
          !product.allow_single_purchase
        ) {
          return NextResponse.json(
            {
              error:
                `${product.name} is not available as a single item`,
            },
            {
              status: 409,
            },
          )
        }

        if (
          product.has_variants
        ) {
          if (
            !item.variantId
          ) {
            return NextResponse.json(
              {
                error:
                  `Choose a variant for ${product.name}`,
              },
              {
                status: 409,
              },
            )
          }

          const variant =
            variantMap.get(
              item.variantId,
            )

          if (
            !variant ||
            String(
              variant.product_id,
            ) !==
              product.id
          ) {
            return NextResponse.json(
              {
                error:
                  `The selected option for ${product.name} is no longer available`,
              },
              {
                status: 409,
              },
            )
          }

          variantId =
            String(
              variant.id,
            )

          variantName =
            String(
              variant.name ??
                "",
            ) || null

          sku =
            String(
              variant.sku ??
                product.sku ??
                "",
            ) || null

          unitPrice =
            numberValue(
              variant.price,
            )

          inventory =
            numberValue(
              variant.inventory_quantity,
            )

          imageUrl =
            String(
              variant.image_url ??
                imageUrl ??
                "",
            ) || null
        } else {
          unitPrice =
            numberValue(
              product.price,
            )

          inventory =
            numberValue(
              product.inventory_quantity,
            )
        }
      }

      if (
        inventory <
        quantity
      ) {
        return NextResponse.json(
          {
            error:
              `Only ${inventory} of ${product.name} are currently available`,
          },
          {
            status: 409,
          },
        )
      }

      const lineTotal =
        unitPrice *
        quantity

      const weightOz =
        numberValue(
          product.weight_oz,
        )

      const lineWeight =
        weightOz *
        weightMultiplier *
        quantity

      subtotal +=
        lineTotal

      totalWeightOz +=
        lineWeight

      if (
        product.shipping_required
      ) {
        shippingRequired =
          true
      }

      validatedItems.push({
        productId:
          product.id,

        variantId,

        slug:
          product.slug,

        name:
          product.name,

        variantName,

        sku,

        imageUrl,

        purchaseType:
          item.purchaseType,

        quantity,

        unitPrice,

        lineTotal,

        weightOz,

        shippingWeightOz:
          lineWeight,

        unitsPerCase:
          product.units_per_case
            ? numberValue(
                product.units_per_case,
              )
            : null,

        maxPerCustomer:
          maxPerCustomer >
          0
            ? maxPerCustomer
            : null,

        isPreorder:
          product.is_preorder,

        releaseDate:
          product.release_date,

        shippingRequired:
          product.shipping_required,
      })
    }

    return NextResponse.json({
      items:
        validatedItems,

      subtotal:
        Number(
          subtotal.toFixed(
            2,
          ),
        ),

      totalWeightOz:
        Number(
          totalWeightOz.toFixed(
            2,
          ),
        ),

      shippingRequired,
    })
  } catch (error) {
    console.error(
      "Checkout validation exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to validate cart",
      },
      {
        status: 500,
      },
    )
  }
}