"use client"

import Link from "next/link"
import {
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react"

import {
  Button,
} from "@/components/ui/button"

import {
  useStoreCart,
} from "@/lib/store-cart"

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(value)
}

export default function CartPage() {
  const {
    items,
    hydrated,
    subtotal,
    itemCount,
    removeItem,
    updateQuantity,
    clearCart,
  } = useStoreCart()

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">
          Loading cart...
        </p>
      </div>
    )
  }

  if (
    items.length === 0
  ) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center px-4">
        <div className="w-full rounded-3xl border bg-card p-8 text-center">
          <ShoppingBag className="mx-auto h-14 w-14 text-muted-foreground" />

          <h1 className="mt-5 text-2xl font-black">
            Your Cart Is
            Empty
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Find something
            awesome in the
            Pokémon store.
          </p>

          <Button
            asChild
            className="mt-6 bg-rose-600 text-white hover:bg-rose-500"
          >
            <Link href="/store">
              Browse Store
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-rose-500">
            Pokémon Store
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Shopping Cart
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {itemCount}{" "}
            {itemCount === 1
              ? "item"
              : "items"}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={
            clearCart
          }
        >
          Clear Cart
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {items.map(
            (item) => (
              <div
                key={
                  item.cartId
                }
                className="flex gap-4 rounded-2xl border bg-card p-4 sm:p-5"
              >
                <Link
                  href={`/store/${item.slug}`}
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/20"
                >
                  {item.imageUrl ? (
                    <img
                      src={
                        item.imageUrl
                      }
                      alt={
                        item.name
                      }
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/store/${item.slug}`}
                        className="font-black hover:text-rose-500"
                      >
                        {
                          item.name
                        }
                      </Link>

                      {item.variantName && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {
                            item.variantName
                          }
                        </p>
                      )}

                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {item.purchaseType ===
                        "case"
                          ? `Case${
                              item.unitsPerCase
                                ? ` · ${item.unitsPerCase} units`
                                : ""
                            }`
                          : "Single Item"}
                      </p>

                      {item.isPreorder && (
                        <p className="mt-2 text-xs font-bold text-amber-500">
                          PRE-ORDER
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        removeItem(
                          item.cartId,
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center overflow-hidden rounded-lg border">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        disabled={
                          item.quantity <=
                          1
                        }
                        onClick={() =>
                          updateQuantity(
                            item.cartId,
                            item.quantity -
                              1,
                          )
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>

                      <div className="min-w-10 text-center text-sm font-bold">
                        {
                          item.quantity
                        }
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        disabled={
                          Boolean(
                            item.maxPerCustomer &&
                              item.quantity >=
                                item.maxPerCustomer,
                          )
                        }
                        onClick={() =>
                          updateQuantity(
                            item.cartId,
                            item.quantity +
                              1,
                          )
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="text-right">
                      <p className="font-black">
                        {money(
                          item.unitPrice *
                            item.quantity,
                        )}
                      </p>

                      {item.quantity >
                        1 && (
                        <p className="text-xs text-muted-foreground">
                          {money(
                            item.unitPrice,
                          )}{" "}
                          each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>

        <div>
          <div className="sticky top-6 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-black">
              Order Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal
                </span>

                <span className="font-bold">
                  {money(
                    subtotal,
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping
                </span>

                <span>
                  Calculated
                  next
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-black">
                    Total
                  </span>

                  <span className="font-black">
                    {money(
                      subtotal,
                    )}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Before
                  shipping and
                  applicable
                  taxes.
                </p>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="mt-6 h-12 w-full bg-rose-600 font-black text-white hover:bg-rose-500"
            >
              <Link href="/checkout">
                Continue to
                Shipping
              </Link>
            </Button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-4 w-4" />

              Live Easyship
              rates at
              checkout
            </div>

            <Button
              asChild
              variant="ghost"
              className="mt-2 w-full"
            >
              <Link href="/store">
                Continue
                Shopping
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}