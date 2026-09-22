import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type PurchaseType = "single" | "case"

type CheckoutCartItem = {
  productId: string
  variantId?: string | null
  purchaseType: PurchaseType
  quantity: number
}

type CheckoutRequestBody = {
  items?: CheckoutCartItem[]
}

type StoreVariantRow = {
  id: string
  product_id: string
  name: string | null
  sku: string | null
  price: number | string | null
  inventory_quantity: number | string | null
  image_url: string | null
  active: boolean | null
}

type ValidatedCheckoutItem = {
  productId: string
  variantId: string | null

  slug: string
  name: string

  variantName: string | null
  sku: string | null
  imageUrl: string | null

  purchaseType: PurchaseType

  quantity: number
  unitPrice: number
  lineTotal: number

  isPreorder: boolean
  releaseDate: string | null
}

function numberValue(
  value: unknown,
): number {
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

function stringValue(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed || null
}

export async function POST(
  request: Request,
) {
  try {
    /*
     * Authentication
     */
    const supabase =
      await createClient()

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Not signed in",
        },
        {
          status: 401,
        },
      )
    }

    /*
     * Read request
     */
    const body =
      (await request.json()) as CheckoutRequestBody

    const cartItems =
      Array.isArray(body.items)
        ? body.items
        : []

    if (
      cartItems.length === 0
    ) {
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

    /*
     * Validate incoming cart shape.
     *
     * We only trust IDs, purchase type,
     * and requested quantity from the client.
     */
    for (
      const item of cartItems
    ) {
      if (
        !item.productId ||
        typeof item.productId !==
          "string"
      ) {
        return NextResponse.json(
          {
            error:
              "A cart item is missing its product ID.",
          },
          {
            status: 400,
          },
        )
      }

      if (
        item.purchaseType !==
          "single" &&
        item.purchaseType !==
          "case"
      ) {
        return NextResponse.json(
          {
            error:
              "A cart item has an invalid purchase type.",
          },
          {
            status: 400,
          },
        )
      }

      if (
        !Number.isInteger(
          item.quantity,
        ) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Cart quantities must be positive whole numbers.",
          },
          {
            status: 400,
          },
        )
      }
    }

    /*
     * Fetch authoritative product data.
     */
    const productIds = [
      ...new Set(
        cartItems.map(
          (item) =>
            item.productId,
        ),
      ),
    ]

    const {
      data: products,
      error: productsError,
    } =
      await supabase
        .from(
          "store_products",
        )
        .select(
          `
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
          `,
        )
        .in(
          "id",
          productIds,
        )

    if (
      productsError
    ) {
      console.error(
        "Checkout product lookup error:",
        productsError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to verify products in your cart.",
        },
        {
          status: 500,
        },
      )
    }

    const productMap =
      new Map(
        (
          products ?? []
        ).map(
          (product) => [
            product.id,
            product,
          ],
        ),
      )

    /*
     * Fetch only variants referenced
     * by this cart.
     */
    const variantIds = [
      ...new Set(
        cartItems
          .map(
            (item) =>
              item.variantId,
          )
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
                "string" &&
              value.length > 0,
          ),
      ),
    ]

    let variants:
      StoreVariantRow[] =
      []

    if (
      variantIds.length >
      0
    ) {
      const {
        data:
          variantRows,
        error:
          variantsError,
      } =
        await supabase
          .from(
            "store_product_variants",
          )
          .select(
            `
              id,
              product_id,
              name,
              sku,
              price,
              inventory_quantity,
              image_url,
              active
            `,
          )
          .in(
            "id",
            variantIds,
          )

      if (
        variantsError
      ) {
        console.error(
          "Checkout variant lookup error:",
          variantsError,
        )

        return NextResponse.json(
          {
            error:
              "Unable to verify product options in your cart.",
          },
          {
            status: 500,
          },
        )
      }

      variants =
        (variantRows ??
          []) as StoreVariantRow[]
    }

    const variantMap =
      new Map(
        variants.map(
          (variant) => [
            variant.id,
            variant,
          ],
        ),
      )

    /*
     * Build authoritative checkout.
     */
    const validatedItems:
      ValidatedCheckoutItem[] =
      []

    let subtotal = 0
    let totalWeightOz = 0
    let shippingRequired =
      false

    for (
      const cartItem of cartItems
    ) {
      const product =
        productMap.get(
          cartItem.productId,
        )

      if (!product) {
        return NextResponse.json(
          {
            error:
              "A product in your cart is no longer available.",
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Only active / sold-out products
       * are valid storefront products.
       *
       * sold_out is allowed through this
       * check so we can return the more
       * useful stock message below.
       */
      if (
        product.status !==
          "active" &&
        product.status !==
          "sold_out"
      ) {
        return NextResponse.json(
          {
            error:
              `${product.name} is no longer available.`,
          },
          {
            status: 400,
          },
        )
      }

      /*
       * Per-customer purchase limit.
       */
      const maxPerCustomer =
        product.max_per_customer ===
          null ||
        product.max_per_customer ===
          undefined
          ? null
          : numberValue(
              product.max_per_customer,
            )

      if (
        maxPerCustomer !==
          null &&
        maxPerCustomer >
          0 &&
        cartItem.quantity >
          maxPerCustomer
      ) {
        return NextResponse.json(
          {
            error:
              `${product.name} is limited to ${maxPerCustomer} per customer.`,
          },
          {
            status: 400,
          },
        )
      }

      let variant:
        StoreVariantRow |
        null = null

      let unitPrice = 0
      let availableStock =
        0

      let sku =
        stringValue(
          product.sku,
        )

      let imageUrl =
        stringValue(
          product.image_url,
        )

      let variantName:
        string | null =
        null

      let lineWeightOz =
        0

      /*
       * CASE PURCHASE
       */
      if (
        cartItem.purchaseType ===
        "case"
      ) {
        if (
          !product.allow_case_purchase
        ) {
          return NextResponse.json(
            {
              error:
                `${product.name} is not available by the case.`,
            },
            {
              status: 400,
            },
          )
        }

        unitPrice =
          numberValue(
            product.case_price,
          )

        availableStock =
          numberValue(
            product.case_inventory_quantity,
          )

        if (
          unitPrice <= 0
        ) {
          return NextResponse.json(
            {
              error:
                `${product.name} does not have a valid case price.`,
            },
            {
              status: 400,
            },
          )
        }

        if (
          cartItem.quantity >
          availableStock
        ) {
          return NextResponse.json(
            {
              error:
                availableStock >
                0
                  ? `Only ${availableStock} case${availableStock === 1 ? "" : "s"} of ${product.name} are available.`
                  : `${product.name} is sold out by the case.`,
            },
            {
              status: 400,
            },
          )
        }

        /*
         * Until we store a dedicated
         * case shipping weight, estimate
         * case weight using:
         *
         * single weight × units per case
         */
        const singleWeightOz =
          numberValue(
            product.weight_oz,
          )

        const unitsPerCase =
          Math.max(
            1,
            numberValue(
              product.units_per_case,
            ),
          )

        lineWeightOz =
          singleWeightOz *
          unitsPerCase *
          cartItem.quantity
      } else {
        /*
         * SINGLE PURCHASE
         */
        if (
          !product.allow_single_purchase
        ) {
          return NextResponse.json(
            {
              error:
                `${product.name} is not available as a single item.`,
            },
            {
              status: 400,
            },
          )
        }

        /*
         * Variant product.
         */
        if (
          product.has_variants
        ) {
          if (
            !cartItem.variantId
          ) {
            return NextResponse.json(
              {
                error:
                  `Select an option for ${product.name}.`,
              },
              {
                status: 400,
              },
            )
          }

          variant =
            variantMap.get(
              cartItem.variantId,
            ) ??
            null

          if (
            !variant ||
            variant.product_id !==
              product.id
          ) {
            return NextResponse.json(
              {
                error:
                  `The selected option for ${product.name} is no longer available.`,
              },
              {
                status: 400,
              },
            )
          }

          if (
            variant.active ===
            false
          ) {
            return NextResponse.json(
              {
                error:
                  `The selected option for ${product.name} is no longer available.`,
              },
              {
                status: 400,
              },
            )
          }

          /*
           * Variant price may intentionally
           * be blank, meaning use the base
           * product price.
           */
          const variantPrice =
            variant.price ===
              null ||
            variant.price ===
              undefined ||
            variant.price ===
              ""
              ? null
              : numberValue(
                  variant.price,
                )

          unitPrice =
            variantPrice ??
            numberValue(
              product.price,
            )

          availableStock =
            numberValue(
              variant.inventory_quantity,
            )

          variantName =
            stringValue(
              variant.name,
            )

          sku =
            stringValue(
              variant.sku,
            ) ??
            sku

          imageUrl =
            stringValue(
              variant.image_url,
            ) ??
            imageUrl
        } else {
          /*
           * Non-variant single product.
           */
          if (
            cartItem.variantId
          ) {
            return NextResponse.json(
              {
                error:
                  `${product.name} does not use product options.`,
              },
              {
                status: 400,
              },
            )
          }

          unitPrice =
            numberValue(
              product.price,
            )

          availableStock =
            numberValue(
              product.inventory_quantity,
            )
        }

        if (
          unitPrice < 0
        ) {
          return NextResponse.json(
            {
              error:
                `${product.name} has an invalid price.`,
            },
            {
              status: 400,
            },
          )
        }

        if (
          cartItem.quantity >
          availableStock
        ) {
          return NextResponse.json(
            {
              error:
                availableStock >
                0
                  ? `Only ${availableStock} of ${product.name}${variantName ? ` (${variantName})` : ""} are available.`
                  : `${product.name}${variantName ? ` (${variantName})` : ""} is sold out.`,
            },
            {
              status: 400,
            },
          )
        }

        lineWeightOz =
          numberValue(
            product.weight_oz,
          ) *
          cartItem.quantity
      }

      /*
       * Product image fallback.
       */
      if (
        !imageUrl &&
        Array.isArray(
          product.image_urls,
        )
      ) {
        const firstImage =
          product.image_urls.find(
            (
              value,
            ) =>
              typeof value ===
                "string" &&
              value.trim().length >
                0,
          )

        imageUrl =
          stringValue(
            firstImage,
          )
      }

      const lineTotal =
        Number(
          (
            unitPrice *
            cartItem.quantity
          ).toFixed(
            2,
          ),
        )

      subtotal +=
        lineTotal

      if (
        product.shipping_required
      ) {
        shippingRequired =
          true

        totalWeightOz +=
          lineWeightOz
      }

      validatedItems.push(
        {
          productId:
            product.id,

          variantId:
            variant?.id ??
            null,

          slug:
            product.slug,

          name:
            product.name,

          variantName,

          sku,

          imageUrl,

          purchaseType:
            cartItem.purchaseType,

          quantity:
            cartItem.quantity,

          unitPrice:
            Number(
              unitPrice.toFixed(
                2,
              ),
            ),

          lineTotal,

          isPreorder:
            Boolean(
              product.is_preorder,
            ),

          releaseDate:
            stringValue(
              product.release_date,
            ),
        },
      )
    }

    /*
     * Final normalized response.
     */
    return NextResponse.json(
      {
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
              3,
            ),
          ),

        shippingRequired,
      },
      {
        status: 200,
      },
    )
  } catch (
    error
  ) {
    console.error(
      "Checkout validation exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to validate cart",
      },
      {
        status: 500,
      },
    )
  }
}