"use client"

import {
  useMemo,
  useState,
} from "react"
import Link from "next/link"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Heart,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react"

import ProductGallery from "@/components/store/product-gallery"

import {
  Badge,
} from "@/components/ui/badge"
import {
  Button,
} from "@/components/ui/button"

import {
  useStoreCart,
} from "@/lib/store-cart"

type StoreVariant = {
  id: string
  product_id: string
  name: string

  sku:
    | string
    | null

  upc:
    | string
    | null

  option1_name:
    | string
    | null

  option1_value:
    | string
    | null

  option2_name:
    | string
    | null

  option2_value:
    | string
    | null

  option3_name:
    | string
    | null

  option3_value:
    | string
    | null

  price:
    | number
    | string

  compare_at_price:
    | number
    | string
    | null

  inventory_quantity:
    | number
    | string

  image_url:
    | string
    | null

  active: boolean
  sort_order: number
}

type StoreProduct = {
  id: string
  name: string
  slug: string

  description:
    | string
    | null

  sku:
    | string
    | null

  product_type:
    | string
    | null

  set_name:
    | string
    | null

  language:
    | string
    | null

  brand:
    | string
    | null

  tags:
    | string[]
    | null

  price:
    | number
    | string

  compare_at_price:
    | number
    | string
    | null

  inventory_quantity:
    | number
    | string

  max_per_customer:
    | number
    | string
    | null

  status: string

  featured: boolean

  is_preorder: boolean

  release_date:
    | string
    | null

  preorder_closes_at:
    | string
    | null

  image_url:
    | string
    | null

  image_urls:
    | string[]
    | null

  has_variants: boolean

  allow_single_purchase: boolean

  allow_case_purchase: boolean

  units_per_case:
    | number
    | string
    | null

  case_price:
    | number
    | string
    | null

  case_inventory_quantity:
    | number
    | string

  weight_oz:
    | number
    | string
    | null

  shipping_required: boolean

  category:
    | {
        id: string
        name: string
        slug: string
        parent_id:
          | string
          | null
      }
    | null

  variants: StoreVariant[]
}

type OptionGroup = {
  name: string
  values: string[]
}

function numberValue(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const number =
    Number(value ?? 0)

  return Number.isFinite(
    number,
  )
    ? number
    : 0
}

function money(
  value:
    | number
    | string
    | null
    | undefined,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(
    numberValue(value),
  )
}

function getOptionGroups(
  variants: StoreVariant[],
): OptionGroup[] {
  const groups =
    new Map<
      string,
      Set<string>
    >()

  for (const variant of variants) {
    const options = [
      [
        variant.option1_name,
        variant.option1_value,
      ],
      [
        variant.option2_name,
        variant.option2_value,
      ],
      [
        variant.option3_name,
        variant.option3_value,
      ],
    ]

    for (const [
      name,
      value,
    ] of options) {
      if (
        !name ||
        !value
      ) {
        continue
      }

      if (
        !groups.has(name)
      ) {
        groups.set(
          name,
          new Set(),
        )
      }

      groups
        .get(name)
        ?.add(value)
    }
  }

  return Array.from(
    groups.entries(),
  ).map(
    ([
      name,
      values,
    ]) => ({
      name,
      values:
        Array.from(values),
    }),
  )
}

function variantOptionMap(
  variant: StoreVariant,
) {
  const map =
    new Map<
      string,
      string
    >()

  if (
    variant.option1_name &&
    variant.option1_value
  ) {
    map.set(
      variant.option1_name,
      variant.option1_value,
    )
  }

  if (
    variant.option2_name &&
    variant.option2_value
  ) {
    map.set(
      variant.option2_name,
      variant.option2_value,
    )
  }

  if (
    variant.option3_name &&
    variant.option3_value
  ) {
    map.set(
      variant.option3_name,
      variant.option3_value,
    )
  }

  return map
}

export default function ProductDetail({
  product,
}: {
  product: StoreProduct
}) {
  const {
    addItem,
  } = useStoreCart()

  const variants =
    product.variants ??
    []

  const optionGroups =
    useMemo(
      () =>
        getOptionGroups(
          variants,
        ),
      [variants],
    )

  const [
    selectedOptions,
    setSelectedOptions,
  ] = useState<
    Record<
      string,
      string
    >
  >({})

  const [
    purchaseType,
    setPurchaseType,
  ] = useState<
    "single" | "case"
  >(
    product.allow_single_purchase
      ? "single"
      : "case",
  )

  const [
    quantity,
    setQuantity,
  ] = useState(1)

  const [
    added,
    setAdded,
  ] = useState(false)

  const selectedVariant =
    useMemo(() => {
      if (
        !product.has_variants
      ) {
        return null
      }

      if (
        optionGroups.some(
          (group) =>
            !selectedOptions[
              group.name
            ],
        )
      ) {
        return null
      }

      return (
        variants.find(
          (variant) => {
            const map =
              variantOptionMap(
                variant,
              )

            return optionGroups.every(
              (group) =>
                map.get(
                  group.name,
                ) ===
                selectedOptions[
                  group.name
                ],
            )
          },
        ) ?? null
      )
    }, [
      product.has_variants,
      variants,
      optionGroups,
      selectedOptions,
    ])

  const selectedPrice =
    purchaseType ===
    "case"
      ? numberValue(
          product.case_price,
        )
      : selectedVariant
        ? numberValue(
            selectedVariant.price,
          )
        : numberValue(
            product.price,
          )

  const compareAt =
    purchaseType ===
    "case"
      ? null
      : selectedVariant
        ? numberValue(
            selectedVariant.compare_at_price,
          )
        : numberValue(
            product.compare_at_price,
          )

  const stock =
    purchaseType ===
    "case"
      ? numberValue(
          product.case_inventory_quantity,
        )
      : product.has_variants
        ? selectedVariant
          ? numberValue(
              selectedVariant.inventory_quantity,
            )
          : 0
        : numberValue(
            product.inventory_quantity,
          )

  const maxPerCustomer =
    numberValue(
      product.max_per_customer,
    )

  const maximumQuantity =
    Math.max(
      0,
      Math.min(
        stock,
        maxPerCustomer >
          0
          ? maxPerCustomer
          : stock,
      ),
    )

  const requiresVariant =
    product.has_variants &&
    !selectedVariant

  const unavailable =
    product.status ===
      "sold_out" ||
    stock <= 0

  function selectOption(
    name: string,
    value: string,
  ) {
    setSelectedOptions(
      (current) => ({
        ...current,
        [name]: value,
      }),
    )

    setQuantity(1)
    setAdded(false)
  }

  function handleAddToCart() {
    if (
      requiresVariant ||
      unavailable
    ) {
      return
    }

    addItem({
      productId:
        product.id,

      slug:
        product.slug,

      name:
        product.name,

      variantId:
        selectedVariant?.id ??
        null,

      variantName:
        selectedVariant?.name ??
        null,

      sku:
        selectedVariant?.sku ??
        product.sku ??
        null,

      imageUrl:
        selectedVariant?.image_url ??
        product.image_url ??
        product.image_urls?.[0] ??
        null,

      purchaseType,

      quantity,

      unitPrice:
        selectedPrice,

      weightOz:
        numberValue(
          product.weight_oz,
        ),

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
    })

    setAdded(true)

    window.setTimeout(
      () =>
        setAdded(false),
      2500,
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Button
        asChild
        variant="ghost"
        className="-ml-3 mb-5"
      >
        <Link href="/store">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Store
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] xl:gap-12">
        <ProductGallery
          name={
            product.name
          }
          imageUrl={
            product.image_url
          }
          imageUrls={
            product.image_urls
          }
          selectedImage={
            selectedVariant?.image_url
          }
        />

        <div>
          <div className="flex flex-wrap gap-2">
            {product.category && (
              <Badge variant="secondary">
                {
                  product
                    .category
                    .name
                }
              </Badge>
            )}

            {product.product_type && (
              <Badge variant="outline">
                {
                  product.product_type
                }
              </Badge>
            )}

            {product.is_preorder && (
              <Badge className="bg-amber-500 text-black hover:bg-amber-500">
                PRE-ORDER
              </Badge>
            )}

            {product.featured && (
              <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                FEATURED
              </Badge>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {product.brand && (
              <span>
                {
                  product.brand
                }
              </span>
            )}

            {product.set_name && (
              <span>
                {
                  product.set_name
                }
              </span>
            )}

            {product.language && (
              <span>
                {
                  product.language
                }
              </span>
            )}
          </div>

          <div className="mt-6 flex items-end gap-3">
            <span className="text-3xl font-black">
              {money(
                selectedPrice,
              )}
            </span>

            {compareAt &&
              compareAt >
                selectedPrice && (
                <span className="pb-1 text-lg text-muted-foreground line-through">
                  {money(
                    compareAt,
                  )}
                </span>
              )}
          </div>

          {product.is_preorder &&
            product.release_date && (
              <div className="mt-5 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

                <div>
                  <p className="font-bold">
                    Pre-Order
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Expected
                    release:{" "}
                    {new Date(
                      `${product.release_date}T12:00:00`,
                    ).toLocaleDateString()}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Orders containing
                    pre-order items may
                    ship when the
                    pre-order inventory
                    becomes available.
                  </p>
                </div>
              </div>
            )}

          {/* SINGLE / CASE */}

          {product.allow_single_purchase &&
            product.allow_case_purchase && (
              <div className="mt-7">
                <p className="mb-3 text-sm font-bold">
                  Purchase
                  Option
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseType(
                        "single",
                      )
                      setQuantity(
                        1,
                      )
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      purchaseType ===
                      "single"
                        ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500"
                        : "hover:border-rose-500/40"
                    }`}
                  >
                    <Package className="mb-2 h-5 w-5" />

                    <p className="font-bold">
                      Single
                    </p>

                    <p className="mt-1 text-sm">
                      {money(
                        selectedVariant?.price ??
                          product.price,
                      )}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseType(
                        "case",
                      )
                      setQuantity(
                        1,
                      )
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      purchaseType ===
                      "case"
                        ? "border-rose-500 bg-rose-500/10 ring-1 ring-rose-500"
                        : "hover:border-rose-500/40"
                    }`}
                  >
                    <Package className="mb-2 h-5 w-5" />

                    <p className="font-bold">
                      Case
                    </p>

                    <p className="mt-1 text-sm">
                      {money(
                        product.case_price,
                      )}
                    </p>

                    {product.units_per_case && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {
                          product.units_per_case
                        }{" "}
                        units
                      </p>
                    )}
                  </button>
                </div>
              </div>
            )}

          {/* OPTIONS */}

          {purchaseType ===
            "single" &&
            product.has_variants &&
            optionGroups.map(
              (group) => (
                <div
                  key={
                    group.name
                  }
                  className="mt-7"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold">
                      {
                        group.name
                      }
                    </p>

                    {selectedOptions[
                      group.name
                    ] && (
                      <span className="text-xs text-muted-foreground">
                        {
                          selectedOptions[
                            group
                              .name
                          ]
                        }
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group.values.map(
                      (
                        value,
                      ) => {
                        const selected =
                          selectedOptions[
                            group
                              .name
                          ] ===
                          value

                        return (
                          <button
                            key={
                              value
                            }
                            type="button"
                            onClick={() =>
                              selectOption(
                                group.name,
                                value,
                              )
                            }
                            className={`min-w-16 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                              selected
                                ? "border-rose-500 bg-rose-500 text-white"
                                : "hover:border-rose-500/50"
                            }`}
                          >
                            {
                              value
                            }
                          </button>
                        )
                      },
                    )}
                  </div>
                </div>
              ),
            )}

          {/* STOCK */}

          <div className="mt-7 rounded-xl border bg-muted/20 p-4">
            {requiresVariant &&
            purchaseType ===
              "single" ? (
              <p className="text-sm font-medium text-muted-foreground">
                Select all
                options to see
                availability.
              </p>
            ) : unavailable ? (
              <p className="font-bold text-red-500">
                Sold Out
              </p>
            ) : (
              <>
                <p className="font-bold text-emerald-500">
                  In Stock
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {stock}{" "}
                  {purchaseType ===
                  "case"
                    ? stock ===
                      1
                      ? "case available"
                      : "cases available"
                    : stock ===
                        1
                      ? "item available"
                      : "items available"}
                </p>
              </>
            )}
          </div>

          {/* QUANTITY */}

          {!requiresVariant &&
            !unavailable && (
              <div className="mt-6">
                <p className="mb-3 text-sm font-bold">
                  Quantity
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-xl border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={
                        quantity <=
                        1
                      }
                      onClick={() =>
                        setQuantity(
                          (
                            current,
                          ) =>
                            Math.max(
                              1,
                              current -
                                1,
                            ),
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <div className="min-w-12 text-center font-bold">
                      {quantity}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={
                        quantity >=
                        maximumQuantity
                      }
                      onClick={() =>
                        setQuantity(
                          (
                            current,
                          ) =>
                            Math.min(
                              maximumQuantity,
                              current +
                                1,
                            ),
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {maxPerCustomer >
                    0 && (
                    <p className="text-xs text-muted-foreground">
                      Limit{" "}
                      {
                        maxPerCustomer
                      }{" "}
                      per customer
                    </p>
                  )}
                </div>
              </div>
            )}

          {/* ADD CART */}

          <div className="mt-7 flex gap-3">
            <Button
              type="button"
              size="lg"
              disabled={
                requiresVariant ||
                unavailable
              }
              onClick={
                handleAddToCart
              }
              className="h-12 flex-1 bg-rose-600 text-base font-black text-white hover:bg-rose-500"
            >
              {added ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {product.is_preorder
                    ? "Add Pre-Order to Cart"
                    : "Add to Cart"}
                </>
              )}
            </Button>

            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-12 w-12"
              title="Favorites coming next"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          {added && (
            <Button
              asChild
              variant="outline"
              className="mt-3 w-full"
            >
              <Link href="/cart">
                View Cart
              </Link>
            </Button>
          )}

          {product.shipping_required && (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" />

              Live shipping
              rates calculated
              at checkout.
            </div>
          )}

          {/* DESCRIPTION */}

          {product.description && (
            <div className="mt-8 border-t pt-7">
              <h2 className="font-black">
                Product
                Description
              </h2>

              <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {
                  product.description
                }
              </div>
            </div>
          )}

          {product.sku && (
            <div className="mt-7 border-t pt-5 text-xs text-muted-foreground">
              SKU:{" "}
              {selectedVariant?.sku ??
                product.sku}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}