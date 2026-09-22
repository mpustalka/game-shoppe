"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type {
  ReactNode,
} from "react"

export type CartPurchaseType =
  | "single"
  | "case"

export type StoreCartItem = {
  cartId: string

  productId: string
  slug: string
  name: string

  variantId:
    | string
    | null

  variantName:
    | string
    | null

  sku:
    | string
    | null

  imageUrl:
    | string
    | null

  purchaseType:
    CartPurchaseType

  quantity: number

  unitPrice: number

  weightOz: number

  unitsPerCase:
    | number
    | null

  maxPerCustomer:
    | number
    | null

  isPreorder: boolean

  releaseDate:
    | string
    | null
}

type AddCartItem = Omit<
  StoreCartItem,
  "cartId"
>

type StoreCartContextValue = {
  items: StoreCartItem[]

  hydrated: boolean

  itemCount: number

  subtotal: number

  totalWeightOz: number

  addItem: (
    item: AddCartItem,
  ) => void

  removeItem: (
    cartId: string,
  ) => void

  updateQuantity: (
    cartId: string,
    quantity: number,
  ) => void

  clearCart: () => void
}

const STORAGE_KEY =
  "card-vault-store-cart"

const StoreCartContext =
  createContext<
    StoreCartContextValue | undefined
  >(undefined)

function makeCartId(
  item: AddCartItem,
) {
  return [
    item.productId,
    item.variantId ??
      "base",
    item.purchaseType,
  ].join(":")
}

export function StoreCartProvider({
  children,
}: {
  children: ReactNode
}) {
  const [items, setItems] =
    useState<
      StoreCartItem[]
    >([])

  const [
    hydrated,
    setHydrated,
  ] = useState(false)

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          STORAGE_KEY,
        )

      if (stored) {
        const parsed =
          JSON.parse(stored)

        if (
          Array.isArray(parsed)
        ) {
          setItems(parsed)
        }
      }
    } catch (error) {
      console.error(
        "Unable to restore store cart:",
        error,
      )
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items),
      )
    } catch (error) {
      console.error(
        "Unable to save store cart:",
        error,
      )
    }
  }, [
    hydrated,
    items,
  ])

  const addItem =
    useCallback(
      (
        incoming: AddCartItem,
      ) => {
        const cartId =
          makeCartId(incoming)

        setItems(
          (current) => {
            const existing =
              current.find(
                (item) =>
                  item.cartId ===
                  cartId,
              )

            if (!existing) {
              return [
                ...current,
                {
                  ...incoming,
                  cartId,
                },
              ]
            }

            return current.map(
              (item) => {
                if (
                  item.cartId !==
                  cartId
                ) {
                  return item
                }

                let nextQuantity =
                  item.quantity +
                  incoming.quantity

                if (
                  incoming.maxPerCustomer &&
                  incoming.maxPerCustomer >
                    0
                ) {
                  nextQuantity =
                    Math.min(
                      nextQuantity,
                      incoming.maxPerCustomer,
                    )
                }

                return {
                  ...item,
                  quantity:
                    nextQuantity,
                }
              },
            )
          },
        )
      },
      [],
    )

  const removeItem =
    useCallback(
      (
        cartId: string,
      ) => {
        setItems(
          (current) =>
            current.filter(
              (item) =>
                item.cartId !==
                cartId,
            ),
        )
      },
      [],
    )

  const updateQuantity =
    useCallback(
      (
        cartId: string,
        quantity: number,
      ) => {
        setItems(
          (current) =>
            current.map(
              (item) => {
                if (
                  item.cartId !==
                  cartId
                ) {
                  return item
                }

                let next =
                  Math.max(
                    1,
                    Math.floor(
                      quantity,
                    ),
                  )

                if (
                  item.maxPerCustomer &&
                  item.maxPerCustomer >
                    0
                ) {
                  next =
                    Math.min(
                      next,
                      item.maxPerCustomer,
                    )
                }

                return {
                  ...item,
                  quantity:
                    next,
                }
              },
            ),
        )
      },
      [],
    )

  const clearCart =
    useCallback(() => {
      setItems([])
    }, [])

  const itemCount =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
      [items],
    )

  const subtotal =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.unitPrice *
              item.quantity,
          0,
        ),
      [items],
    )

  const totalWeightOz =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item,
          ) => {
            const multiplier =
              item.purchaseType ===
                "case" &&
              item.unitsPerCase
                ? item.unitsPerCase
                : 1

            return (
              total +
              item.weightOz *
                multiplier *
                item.quantity
            )
          },
          0,
        ),
      [items],
    )

  const value =
    useMemo<
      StoreCartContextValue
    >(
      () => ({
        items,
        hydrated,
        itemCount,
        subtotal,
        totalWeightOz,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }),
      [
        items,
        hydrated,
        itemCount,
        subtotal,
        totalWeightOz,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      ],
    )

  return (
    <StoreCartContext.Provider
      value={value}
    >
      {children}
    </StoreCartContext.Provider>
  )
}

export function useStoreCart() {
  const context =
    useContext(
      StoreCartContext,
    )

  if (!context) {
    throw new Error(
      "useStoreCart must be used inside StoreCartProvider",
    )
  }

  return context
}