import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type PurchaseType = "single" | "case"

type CartItem = {
  productId: string
  variantId?: string | null
  purchaseType: PurchaseType
  quantity: number
}

type ShippingAddress = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

type SelectedShippingRate = {
  id?: string | null
  rateId?: string | null
  amount?: number | string | null
  price?: number | string | null
  service?: string | null
  serviceName?: string | null
  courier?: string | null
  courierName?: string | null
}

type CreateOrderBody = {
  items?: CartItem[]
  address?: ShippingAddress
  shippingRate?: SelectedShippingRate | null
  checkoutKey?: string
  paymentMethod?: "cashapp"
}

type VariantRow = {
  id: string
  product_id: string
  name: string | null
  sku: string | null
  price: number | string | null
  inventory_quantity: number | string | null
  active: boolean | null
}

type ValidatedOrderItem = {
  product_id: string
  variant_id: string | null
  product_name: string
  variant_name: string | null
  sku: string | null
  purchase_type: PurchaseType
  quantity: number
  unit_price: number
  line_total: number
  is_preorder: boolean
  release_date: string | null
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

function optionalText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed || null
}

function money(value: number) {
  return Number(value.toFixed(2))
}

function makeOrderNumber() {
  const now = new Date()

  const date = now
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")

  const random =
    crypto.randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase()

  return `CV-${date}-${random}`
}
export async function GET() {
  try {
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
            "You must be signed in.",
        },
        {
          status: 401,
        },
      )
    }

    const admin =
      createAdminClient()

    const {
      data: orders,
      error,
    } =
      await admin
        .from("store_orders")
        .select(`
          id,
          order_number,
          status,
          payment_status,
          fulfillment_status,
          total,
          payment_provider,
          payment_submitted_at,
          created_at,
          items:store_order_items (
            id,
            product_name,
            variant_name,
            quantity
          )
        `)
        .eq(
          "user_id",
          user.id,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )

    if (error) {
      console.error(
        "Customer orders GET error:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load your orders.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        orders:
          orders ?? [],
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error(
      "Customer orders GET exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load your orders.",
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
  try {
    /*
     * Authenticate with the normal
     * Supabase server client.
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
            "You must be signed in to place an order.",
        },
        {
          status: 401,
        },
      )
    }

    const body =
      (await request.json()) as CreateOrderBody

    const items =
      Array.isArray(body.items)
        ? body.items
        : []

    if (!items.length) {
      return NextResponse.json(
        {
          error:
            "Your cart is empty.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Cash App is the only store
     * payment method we're enabling
     * in this first pass.
     */
    if (
      body.paymentMethod !==
      "cashapp"
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported payment method.",
        },
        {
          status: 400,
        },
      )
    }

    const checkoutKey =
      optionalText(
        body.checkoutKey,
      )

    if (!checkoutKey) {
      return NextResponse.json(
        {
          error:
            "Checkout key is required.",
        },
        {
          status: 400,
        },
      )
    }

    const address =
      body.address ?? {}

    const firstName =
      optionalText(
        address.firstName,
      )

    const lastName =
      optionalText(
        address.lastName,
      )

    const email =
      optionalText(
        address.email,
      ) ??
      user.email ??
      null

    const address1 =
      optionalText(
        address.address1,
      )

    const city =
      optionalText(
        address.city,
      )

    const state =
      optionalText(
        address.state,
      )

    const postalCode =
      optionalText(
        address.postalCode,
      )

    const country =
      optionalText(
        address.country,
      ) ?? "US"

    if (
      !firstName ||
      !lastName ||
      !email ||
      !address1 ||
      !city ||
      !state ||
      !postalCode
    ) {
      return NextResponse.json(
        {
          error:
            "Complete your shipping address before placing the order.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Validate cart shape.
     *
     * We trust only IDs, purchase type,
     * and quantity from the browser.
     */
    for (const item of items) {
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

    const admin =
      createAdminClient()

    /*
     * Idempotency:
     *
     * If this checkout already created
     * an order, return it rather than
     * creating a duplicate.
     */
    const {
      data: existingOrder,
      error: existingError,
    } =
      await admin
        .from("store_orders")
        .select(
          `
            id,
            order_number,
            status,
            payment_status,
            subtotal,
            shipping_amount,
            tax_amount,
            discount_amount,
            total,
            payment_provider
          `,
        )
        .eq(
          "checkout_key",
          checkoutKey,
        )
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle()

    if (existingError) {
      console.error(
        "Existing store order lookup error:",
        existingError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to verify checkout.",
        },
        {
          status: 500,
        },
      )
    }

    if (existingOrder) {
      return NextResponse.json(
        {
          order: existingOrder,
          existing: true,
        },
        {
          status: 200,
        },
      )
    }

    /*
     * Fetch authoritative products.
     */
    const productIds = [
      ...new Set(
        items.map(
          (item) =>
            item.productId,
        ),
      ),
    ]

    const {
      data: products,
      error: productsError,
    } =
      await admin
        .from("store_products")
        .select(
          `
            id,
            name,
            sku,
            price,
            inventory_quantity,
            max_per_customer,
            status,
            is_preorder,
            release_date,
            has_variants,
            allow_single_purchase,
            allow_case_purchase,
            case_price,
            case_inventory_quantity
          `,
        )
        .in(
          "id",
          productIds,
        )

    if (productsError) {
      console.error(
        "Store order product lookup error:",
        productsError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to verify products.",
        },
        {
          status: 500,
        },
      )
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

    /*
     * Fetch authoritative variants.
     */
    const variantIds = [
      ...new Set(
        items
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
      VariantRow[] = []

    if (variantIds.length) {
      const {
        data: variantRows,
        error: variantsError,
      } =
        await admin
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
              active
            `,
          )
          .in(
            "id",
            variantIds,
          )

      if (variantsError) {
        console.error(
          "Store order variant lookup error:",
          variantsError,
        )

        return NextResponse.json(
          {
            error:
              "Unable to verify product options.",
          },
          {
            status: 500,
          },
        )
      }

      variants =
        (variantRows ??
          []) as VariantRow[]
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
     * Rebuild the order using
     * authoritative DB values.
     */
    const orderItems:
      ValidatedOrderItem[] = []

    let subtotal = 0

    for (const cartItem of items) {
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
        maxPerCustomer > 0 &&
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
        VariantRow | null =
        null

      let variantName:
        string | null =
        null

      let sku =
        optionalText(
          product.sku,
        )

      let unitPrice = 0
      let availableStock = 0

      /*
       * Case purchase.
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

        if (unitPrice <= 0) {
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
      } else {
        /*
         * Single purchase.
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

        if (product.has_variants) {
          if (!cartItem.variantId) {
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
            ) ?? null

          if (
            !variant ||
            variant.product_id !==
              product.id ||
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

          const variantPrice =
            variant.price ===
              null ||
            variant.price ===
              undefined ||
            variant.price === ""
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
            optionalText(
              variant.name,
            )

          sku =
            optionalText(
              variant.sku,
            ) ?? sku
        } else {
          if (cartItem.variantId) {
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
      }

      if (
        cartItem.quantity >
        availableStock
      ) {
        return NextResponse.json(
          {
            error:
              availableStock > 0
                ? `Only ${availableStock} of ${product.name}${variantName ? ` (${variantName})` : ""} are available.`
                : `${product.name}${variantName ? ` (${variantName})` : ""} is sold out.`,
          },
          {
            status: 400,
          },
        )
      }

      const lineTotal =
        money(
          unitPrice *
            cartItem.quantity,
        )

      subtotal += lineTotal

      orderItems.push({
        product_id:
          product.id,

        variant_id:
          variant?.id ?? null,

        product_name:
          product.name,

        variant_name:
          variantName,

        sku,

        purchase_type:
          cartItem.purchaseType,

        quantity:
          cartItem.quantity,

        unit_price:
          money(unitPrice),

        line_total:
          lineTotal,

        is_preorder:
          Boolean(
            product.is_preorder,
          ),

        release_date:
          optionalText(
            product.release_date,
          ),
      })
    }

    subtotal =
      money(subtotal)

    /*
     * Shipping.
     *
     * This first implementation stores
     * the selected Easyship rate.
     *
     * The checkout page already obtains
     * this rate server-side through your
     * Easyship API route.
     */
    const selectedRate =
      body.shippingRate ?? null

    const shippingAmount =
      selectedRate
        ? money(
            numberValue(
              selectedRate.amount ??
                selectedRate.price,
            ),
          )
        : 0

    if (shippingAmount < 0) {
      return NextResponse.json(
        {
          error:
            "Invalid shipping amount.",
        },
        {
          status: 400,
        },
      )
    }

    /*
     * Tax integration comes next.
     *
     * Keep tax at zero until we connect
     * the actual tax calculation rather
     * than inventing a percentage.
     */
    const taxAmount = 0

    const discountAmount = 0

    const total =
      money(
        subtotal +
          shippingAmount +
          taxAmount -
          discountAmount,
      )

    const orderNumber =
      makeOrderNumber()

    const customerName =
      `${firstName} ${lastName}`.trim()

    /*
     * Create the order.
     */
    const {
      data: order,
      error: orderError,
    } =
      await admin
        .from("store_orders")
        .insert({
          user_id:
            user.id,

          order_number:
            orderNumber,

          checkout_key:
            checkoutKey,

          status:
            "payment_pending",

          payment_status:
            "pending",

          fulfillment_status:
            "unfulfilled",

          subtotal,

          shipping_amount:
            shippingAmount,

          tax_amount:
            taxAmount,

          discount_amount:
            discountAmount,

          total,

          customer_email:
            email,

          customer_name:
            customerName,

          shipping_name:
            customerName,

          shipping_address1:
            address1,

          shipping_address2:
            optionalText(
              address.address2,
            ),

          shipping_city:
            city,

          shipping_state:
            state,

          shipping_postal_code:
            postalCode,

          shipping_country:
            country,

          payment_provider:
            "cashapp",

          shipping_rate_id:
            optionalText(
              selectedRate?.id ??
                selectedRate?.rateId,
            ),

          shipping_service:
            optionalText(
              selectedRate?.service ??
                selectedRate?.serviceName,
            ),

          shipping_courier:
            optionalText(
              selectedRate?.courier ??
                selectedRate?.courierName,
            ),
        })
        .select(
          `
            id,
            order_number,
            status,
            payment_status,
            fulfillment_status,
            subtotal,
            shipping_amount,
            tax_amount,
            discount_amount,
            total,
            payment_provider,
            created_at
          `,
        )
        .single()

    if (orderError || !order) {
      /*
       * Handle a duplicate checkout key
       * caused by simultaneous requests.
       */
      if (
        orderError?.code ===
        "23505"
      ) {
        const {
          data:
            duplicateOrder,
        } =
          await admin
            .from(
              "store_orders",
            )
            .select(
              `
                id,
                order_number,
                status,
                payment_status,
                fulfillment_status,
                subtotal,
                shipping_amount,
                tax_amount,
                discount_amount,
                total,
                payment_provider,
                created_at
              `,
            )
            .eq(
              "checkout_key",
              checkoutKey,
            )
            .eq(
              "user_id",
              user.id,
            )
            .maybeSingle()

        if (duplicateOrder) {
          return NextResponse.json(
            {
              order:
                duplicateOrder,
              existing: true,
            },
            {
              status: 200,
            },
          )
        }
      }

      console.error(
        "Store order insert error:",
        orderError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to create your order.",
        },
        {
          status: 500,
        },
      )
    }

    /*
     * Snapshot order items.
     */
    const rows =
      orderItems.map(
        (item) => ({
          order_id:
            order.id,
          ...item,
        }),
      )

    const {
      error: itemsError,
    } =
      await admin
        .from(
          "store_order_items",
        )
        .insert(rows)

    if (itemsError) {
      console.error(
        "Store order item insert error:",
        itemsError,
      )

      /*
       * Don't leave an incomplete order
       * available for payment.
       */
      await admin
        .from("store_orders")
        .delete()
        .eq(
          "id",
          order.id,
        )

      return NextResponse.json(
        {
          error:
            "Unable to save the items in your order.",
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        order,
        existing: false,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "Create store order exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create order.",
      },
      {
        status: 500,
      },
    )
  }
}