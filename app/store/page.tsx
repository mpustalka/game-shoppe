"use client"

import Link from "next/link"

import {
  Suspense,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react"

import {
  useRouter,
  useSearchParams,
} from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type StoreCategory = {
  id: string
  name: string
  slug: string
  parent_id: string | null

  description?: string | null

  image_url?: string | null
  navigation_image_url?: string | null
  banner_image_url?: string | null
  mobile_banner_image_url?: string | null

  featured?: boolean
  active?: boolean
  sort_order?: number
}

type StoreProduct = {
  id: string
  name: string
  slug: string

  description: string | null

  sku: string | null
  upc: string | null

  product_type: string | null

  set_name: string | null
  set_release_date: string | null

  pokemon_names: string[]

  language: string | null
  brand: string | null

  tags: string[]

  price: number | string

  compare_at_price:
    | number
    | string
    | null

  inventory_quantity:
    | number
    | string

  status: string

  featured: boolean

  is_new_arrival: boolean
  is_fall_exclusive: boolean
  is_sale: boolean
  is_preorder: boolean

  release_date: string | null
  preorder_closes_at: string | null

  image_url: string | null

  has_variants: boolean

  variant_inventory_quantity: number
  lowest_variant_price: number | null

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

  category_id: string | null
  category: StoreCategory | null

  created_at: string
}

type StoreBanner = {
  id: string

  title: string
  subtitle: string | null

  image_url: string
  mobile_image_url: string | null

  button_text: string | null
  button_url: string | null

  active: boolean
  sort_order: number

  starts_at: string | null
  ends_at: string | null
}

function numberValue(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const parsed = Number(
    value ?? 0,
  )

  return Number.isFinite(parsed)
    ? parsed
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

function getSingleInventory(
  product: StoreProduct,
) {
  if (product.has_variants) {
    return numberValue(
      product.variant_inventory_quantity,
    )
  }

  return numberValue(
    product.inventory_quantity,
  )
}

function getTotalAvailableInventory(
  product: StoreProduct,
) {
  let total = 0

  if (
    product.allow_single_purchase
  ) {
    total +=
      getSingleInventory(product)
  }

  if (
    product.allow_case_purchase
  ) {
    total += numberValue(
      product.case_inventory_quantity,
    )
  }

  return total
}

function isProductAvailable(
  product: StoreProduct,
) {
  if (
    product.status === "sold_out"
  ) {
    return false
  }

  return (
    getTotalAvailableInventory(
      product,
    ) > 0
  )
}

function getStartingPrice(
  product: StoreProduct,
) {
  const prices: number[] = []

  if (
    product.allow_single_purchase
  ) {
    if (
      product.has_variants &&
      product.lowest_variant_price !==
        null
    ) {
      prices.push(
        numberValue(
          product.lowest_variant_price,
        ),
      )
    } else {
      prices.push(
        numberValue(
          product.price,
        ),
      )
    }
  }

  if (
    product.allow_case_purchase &&
    product.case_price !== null
  ) {
    prices.push(
      numberValue(
        product.case_price,
      ),
    )
  }

  const valid =
    prices.filter(
      (price) => price >= 0,
    )

  return valid.length
    ? Math.min(...valid)
    : numberValue(
        product.price,
      )
}

function StorePageContent() {
  const router = useRouter()
  const searchParams =
    useSearchParams()

  const categoryFromUrl =
    searchParams.get(
      "category",
    ) ?? "all"

  const collectionFromUrl =
    searchParams.get(
      "collection",
    ) ?? "all"

  const [
    products,
    setProducts,
  ] =
    useState<
      StoreProduct[]
    >([])

  const [
    categories,
    setCategories,
  ] =
    useState<
      StoreCategory[]
    >([])

  const [
    banners,
    setBanners,
  ] =
    useState<
      StoreBanner[]
    >([])

  const [
    bannerIndex,
    setBannerIndex,
  ] = useState(0)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState("")

  const [
    search,
    setSearch,
  ] = useState("")

  const [
    productType,
    setProductType,
  ] = useState("all")

  const [
    pokemon,
    setPokemon,
  ] = useState("all")

  const [
    setName,
    setSetName,
  ] = useState("all")

  const [
    language,
    setLanguage,
  ] = useState("all")

  const [
    availability,
    setAvailability,
  ] = useState("all")

  const [
    minPrice,
    setMinPrice,
  ] = useState("")

  const [
    maxPrice,
    setMaxPrice,
  ] = useState("")

  const [
    sort,
    setSort,
  ] = useState("featured")

  useEffect(() => {
    let cancelled = false

    async function loadStore() {
      setLoading(true)
      setError("")

      try {
        const [
          productResponse,
          categoryResponse,
          bannerResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/store/products",
              {
                cache:
                  "no-store",
              },
            ),

            fetch(
              "/api/store/categories",
              {
                cache:
                  "no-store",
              },
            ),

            fetch(
              "/api/store/banners",
              {
                cache:
                  "no-store",
              },
            ),
          ])

        const [
          productData,
          categoryData,
          bannerData,
        ] =
          await Promise.all([
            productResponse.json(),
            categoryResponse.json(),
            bannerResponse.json(),
          ])

        if (
          !productResponse.ok
        ) {
          throw new Error(
            productData.error ??
              "Unable to load products.",
          )
        }

        if (
          !categoryResponse.ok
        ) {
          throw new Error(
            categoryData.error ??
              "Unable to load categories.",
          )
        }

        if (
          !bannerResponse.ok
        ) {
          throw new Error(
            bannerData.error ??
              "Unable to load banners.",
          )
        }

        if (!cancelled) {
          setProducts(
            productData.products ??
              [],
          )

          setCategories(
            categoryData.categories ??
              [],
          )

          setBanners(
            bannerData.banners ??
              [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load store.",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStore()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      banners.length <= 1
    ) {
      return
    }

    const timer =
      window.setInterval(
        () => {
          setBannerIndex(
            (current) =>
              (current + 1) %
              banners.length,
          )
        },
        7000,
      )

    return () => {
      window.clearInterval(
        timer,
      )
    }
  }, [banners.length])

  useEffect(() => {
    if (
      bannerIndex >=
      banners.length
    ) {
      setBannerIndex(0)
    }
  }, [
    bannerIndex,
    banners.length,
  ])

  const childrenMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          StoreCategory[]
        >()

      for (
        const category
        of categories
      ) {
        if (
          !category.parent_id
        ) {
          continue
        }

        const children =
          map.get(
            category.parent_id,
          ) ?? []

        children.push(
          category,
        )

        map.set(
          category.parent_id,
          children,
        )
      }

      for (
        const children
        of map.values()
      ) {
        children.sort(
          (a, b) =>
            Number(
              a.sort_order ?? 0,
            ) -
              Number(
                b.sort_order ?? 0,
              ) ||
            a.name.localeCompare(
              b.name,
            ),
        )
      }

      return map
    }, [categories])

  const topCategories =
    useMemo(() => {
      return categories
        .filter(
          (category) =>
            !category.parent_id,
        )
        .sort(
          (a, b) =>
            Number(
              a.sort_order ?? 0,
            ) -
              Number(
                b.sort_order ?? 0,
              ) ||
            a.name.localeCompare(
              b.name,
            ),
        )
    }, [categories])

  function collectCategoryIds(
    id: string,
  ) {
    const ids =
      new Set<string>()

    function walk(
      categoryId: string,
    ) {
      if (
        ids.has(categoryId)
      ) {
        return
      }

      ids.add(categoryId)

      const children =
        childrenMap.get(
          categoryId,
        ) ?? []

      for (
        const child
        of children
      ) {
        walk(child.id)
      }
    }

    walk(id)

    return ids
  }

  const selectedCategory =
    useMemo(() => {
      if (
        categoryFromUrl ===
        "all"
      ) {
        return null
      }

      return (
        categories.find(
          (category) =>
            category.slug ===
            categoryFromUrl,
        ) ?? null
      )
    }, [
      categories,
      categoryFromUrl,
    ])

  const selectedCategoryIds =
    useMemo(() => {
      if (
        !selectedCategory
      ) {
        return null
      }

      return collectCategoryIds(
        selectedCategory.id,
      )
    }, [
      selectedCategory,
      childrenMap,
    ])

  const productTypes =
    useMemo(() => {
      return Array.from(
        new Set(
          products
            .map(
              (product) =>
                product.product_type,
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ),
      ).sort()
    }, [products])

  const pokemonNames =
    useMemo(() => {
      return Array.from(
        new Set(
          products.flatMap(
            (product) =>
              product.pokemon_names ??
              [],
          ),
        ),
      ).sort((a, b) =>
        a.localeCompare(b),
      )
    }, [products])

  const languages =
    useMemo(() => {
      return Array.from(
        new Set(
          products
            .map(
              (product) =>
                product.language,
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ),
      ).sort()
    }, [products])

  const tcgSets =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >()

      for (
        const product
        of products
      ) {
        if (
          !product.set_name
        ) {
          continue
        }

        const timestamp =
          product.set_release_date
            ? new Date(
                `${product.set_release_date}T12:00:00`,
              ).getTime()
            : 0

        map.set(
          product.set_name,
          Math.max(
            map.get(
              product.set_name,
            ) ?? 0,
            Number.isFinite(
              timestamp,
            )
              ? timestamp
              : 0,
          ),
        )
      }

      return Array.from(
        map.entries(),
      )
        .sort(
          (a, b) =>
            b[1] - a[1] ||
            a[0].localeCompare(
              b[0],
            ),
        )
        .map(
          ([name]) => name,
        )
    }, [products])

  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase()

      const minimum =
        minPrice === ""
          ? null
          : Number(minPrice)

      const maximum =
        maxPrice === ""
          ? null
          : Number(maxPrice)

      const result =
        products.filter(
          (product) => {
            if (
              selectedCategoryIds &&
              product.category_id &&
              !selectedCategoryIds.has(
                product.category_id,
              )
            ) {
              return false
            }

            if (
              selectedCategoryIds &&
              !product.category_id
            ) {
              return false
            }

            if (
              collectionFromUrl ===
                "new" &&
              !product.is_new_arrival
            ) {
              return false
            }

            if (
              collectionFromUrl ===
                "preorder" &&
              !product.is_preorder
            ) {
              return false
            }

            if (
              collectionFromUrl ===
                "sale" &&
              !product.is_sale
            ) {
              return false
            }

            if (
              collectionFromUrl ===
                "fall" &&
              !product.is_fall_exclusive
            ) {
              return false
            }

            if (
              normalizedSearch
            ) {
              const searchable = [
                product.name,
                product.product_type,
                product.set_name,
                product.sku,
                product.upc,
                product.language,
                product.brand,
                product.category
                  ?.name,
                ...(
                  product.tags ??
                  []
                ),
                ...(
                  product.pokemon_names ??
                  []
                ),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

              if (
                !searchable.includes(
                  normalizedSearch,
                )
              ) {
                return false
              }
            }

            if (
              productType !==
                "all" &&
              product.product_type !==
                productType
            ) {
              return false
            }

            if (
              pokemon !==
                "all" &&
              !(
                product.pokemon_names ??
                []
              ).includes(pokemon)
            ) {
              return false
            }

            if (
              setName !==
                "all" &&
              product.set_name !==
                setName
            ) {
              return false
            }

            if (
              language !==
                "all" &&
              product.language !==
                language
            ) {
              return false
            }

            const available =
              isProductAvailable(
                product,
              )

            if (
              availability ===
                "in-stock" &&
              !available
            ) {
              return false
            }

            if (
              availability ===
                "preorder" &&
              !product.is_preorder
            ) {
              return false
            }

            if (
              availability ===
                "sold-out" &&
              available
            ) {
              return false
            }

            const price =
              getStartingPrice(
                product,
              )

            if (
              minimum !== null &&
              Number.isFinite(
                minimum,
              ) &&
              price < minimum
            ) {
              return false
            }

            if (
              maximum !== null &&
              Number.isFinite(
                maximum,
              ) &&
              price > maximum
            ) {
              return false
            }

            return true
          },
        )

      return [
        ...result,
      ].sort((a, b) => {
        if (
          sort ===
          "price-low"
        ) {
          return (
            getStartingPrice(a) -
            getStartingPrice(b)
          )
        }

        if (
          sort ===
          "price-high"
        ) {
          return (
            getStartingPrice(b) -
            getStartingPrice(a)
          )
        }

        if (
          sort === "newest"
        ) {
          return (
            new Date(
              b.created_at,
            ).getTime() -
            new Date(
              a.created_at,
            ).getTime()
          )
        }

        if (
          sort === "set-newest"
        ) {
          const aDate =
            a.set_release_date
              ? new Date(
                  `${a.set_release_date}T12:00:00`,
                ).getTime()
              : 0

          const bDate =
            b.set_release_date
              ? new Date(
                  `${b.set_release_date}T12:00:00`,
                ).getTime()
              : 0

          return (
            bDate - aDate
          )
        }

        if (
          sort === "release"
        ) {
          const aDate =
            a.release_date
              ? new Date(
                  `${a.release_date}T12:00:00`,
                ).getTime()
              : 0

          const bDate =
            b.release_date
              ? new Date(
                  `${b.release_date}T12:00:00`,
                ).getTime()
              : 0

          return (
            bDate - aDate
          )
        }

        if (
          a.featured !==
          b.featured
        ) {
          return a.featured
            ? -1
            : 1
        }

        if (
          a.is_new_arrival !==
          b.is_new_arrival
        ) {
          return a.is_new_arrival
            ? -1
            : 1
        }

        return (
          new Date(
            b.created_at,
          ).getTime() -
          new Date(
            a.created_at,
          ).getTime()
        )
      })
    }, [
      products,
      selectedCategoryIds,
      collectionFromUrl,
      search,
      productType,
      pokemon,
      setName,
      language,
      availability,
      minPrice,
      maxPrice,
      sort,
    ])

  function updateUrl(
    updates: {
      category?: string | null
      collection?: string | null
    },
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      )

    if (
      updates.category !==
      undefined
    ) {
      if (
        !updates.category ||
        updates.category ===
          "all"
      ) {
        params.delete(
          "category",
        )
      } else {
        params.set(
          "category",
          updates.category,
        )
      }
    }

    if (
      updates.collection !==
      undefined
    ) {
      if (
        !updates.collection ||
        updates.collection ===
          "all"
      ) {
        params.delete(
          "collection",
        )
      } else {
        params.set(
          "collection",
          updates.collection,
        )
      }
    }

    const query =
      params.toString()

    router.push(
      query
        ? `/store?${query}`
        : "/store",
      {
        scroll: false,
      },
    )
  }

  function clearFilters() {
    setSearch("")
    setProductType("all")
    setPokemon("all")
    setSetName("all")
    setLanguage("all")
    setAvailability("all")
    setMinPrice("")
    setMaxPrice("")
    setSort("featured")

    router.push(
      "/store",
      {
        scroll: false,
      },
    )
  }

  const activeBanner =
    banners[
      bannerIndex
    ] ?? null

  const activeCategoryName =
    selectedCategory?.name ??
    (collectionFromUrl ===
    "new"
      ? "New Arrivals"
      : collectionFromUrl ===
          "preorder"
        ? "Preorders & Upcoming"
        : collectionFromUrl ===
            "sale"
          ? "Sale"
          : collectionFromUrl ===
              "fall"
            ? "Fall Exclusives"
            : "All Products")

  return (
    <main className="min-h-screen bg-background">
      {/* HERO BANNERS */}

      {activeBanner ? (
        <section className="relative overflow-hidden border-b bg-black">
          <div className="relative min-h-[380px] sm:min-h-[440px] lg:min-h-[520px]">
            <picture>
              {activeBanner.mobile_image_url && (
                <source
                  media="(max-width: 639px)"
                  srcSet={
                    activeBanner.mobile_image_url
                  }
                />
              )}

              <img
                src={
                  activeBanner.image_url
                }
                alt={
                  activeBanner.title
                }
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>

            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />

            <div className="relative mx-auto flex min-h-[380px] max-w-7xl items-center px-4 py-12 sm:min-h-[440px] sm:px-6 lg:min-h-[520px] lg:px-8">
              <div className="max-w-2xl text-white">
                <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-rose-300">
                  <Sparkles className="h-4 w-4" />
                  Card Vault Store
                </div>

                <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  {
                    activeBanner.title
                  }
                </h1>

                {activeBanner.subtitle && (
                  <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
                    {
                      activeBanner.subtitle
                    }
                  </p>
                )}

                <div className="mt-7 flex flex-wrap gap-3">
                  {activeBanner.button_text &&
                    activeBanner.button_url && (
                      <Button
                        asChild
                        size="lg"
                        className="bg-rose-600 font-bold text-white hover:bg-rose-500"
                      >
                        <Link
                          href={
                            activeBanner.button_url
                          }
                        >
                          <ShoppingBag className="mr-2 h-5 w-5" />

                          {
                            activeBanner.button_text
                          }
                        </Link>
                      </Button>
                    )}

                  <Button
                    asChild
                    size="lg"
                    variant="secondary"
                  >
                    <Link href="/cart">
                      View Cart
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {banners.length >
              1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full opacity-80"
                  onClick={() =>
                    setBannerIndex(
                      (current) =>
                        (current -
                          1 +
                          banners.length) %
                        banners.length,
                    )
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full opacity-80"
                  onClick={() =>
                    setBannerIndex(
                      (current) =>
                        (current +
                          1) %
                        banners.length,
                    )
                  }
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
                  {banners.map(
                    (
                      banner,
                      index,
                    ) => (
                      <button
                        key={
                          banner.id
                        }
                        type="button"
                        aria-label={`Show banner ${index + 1}`}
                        onClick={() =>
                          setBannerIndex(
                            index,
                          )
                        }
                        className={`h-2.5 rounded-full transition-all ${
                          index ===
                          bannerIndex
                            ? "w-8 bg-white"
                            : "w-2.5 bg-white/50 hover:bg-white/80"
                        }`}
                      />
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/60 via-background to-background" />

          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em] text-rose-500">
                <Sparkles className="h-4 w-4" />
                Card Vault Store
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Pokémon gear,
                <span className="text-rose-500">
                  {" "}
                  collectibles
                </span>{" "}
                & TCG.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Shop Pokémon TCG,
                apparel, medical
                scrubs, Loungefly,
                Funko, plush,
                collectibles and
                accessories.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* COLLECTION LINKS */}

      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <CollectionLink
            title="New Arrivals"
            icon={<Sparkles />}
            active={
              collectionFromUrl ===
              "new"
            }
            onClick={() =>
              updateUrl({
                category: null,
                collection: "new",
              })
            }
          />

          <CollectionLink
            title="Preorders"
            icon={<CalendarDays />}
            active={
              collectionFromUrl ===
              "preorder"
            }
            onClick={() =>
              updateUrl({
                category: null,
                collection:
                  "preorder",
              })
            }
          />

          <CollectionLink
            title="Fall Exclusives"
            icon={<Flame />}
            active={
              collectionFromUrl ===
              "fall"
            }
            onClick={() =>
              updateUrl({
                category: null,
                collection: "fall",
              })
            }
          />

          <CollectionLink
            title="Sale"
            icon={<Tag />}
            active={
              collectionFromUrl ===
              "sale"
            }
            onClick={() =>
              updateUrl({
                category: null,
                collection: "sale",
              })
            }
          />
        </div>
      </section>

      {/* CATEGORIES */}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">
              Browse
            </p>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Shop by Category
            </h2>
          </div>

          {(selectedCategory ||
            collectionFromUrl !==
              "all") && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                updateUrl({
                  category: null,
                  collection: null,
                })
              }
            >
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {topCategories.length >
        0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topCategories.map(
              (category) => (
                <CategoryCard
                  key={
                    category.id
                  }
                  category={
                    category
                  }
                  selected={
                    selectedCategory
                      ?.id ===
                    category.id
                  }
                  onClick={() =>
                    updateUrl({
                      category:
                        category.slug,
                      collection:
                        null,
                    })
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No storefront
            categories are
            available yet.
          </div>
        )}

        {selectedCategory &&
          (
            childrenMap.get(
              selectedCategory.id,
            ) ?? []
          ).length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-black">
                {
                  selectedCategory.name
                }{" "}
                Categories
              </p>

              <div className="flex flex-wrap gap-2">
                {(
                  childrenMap.get(
                    selectedCategory.id,
                  ) ?? []
                ).map(
                  (category) => (
                    <Button
                      key={
                        category.id
                      }
                      type="button"
                      variant="outline"
                      onClick={() =>
                        updateUrl({
                          category:
                            category.slug,
                          collection:
                            null,
                        })
                      }
                    >
                      {
                        category.name
                      }
                    </Button>
                  ),
                )}
              </div>
            </div>
          )}
      </section>

      {/* PRODUCTS */}

      <section className="border-t bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">
                Store
              </p>

              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                {
                  activeCategoryName
                }
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {
                  filteredProducts.length
                }{" "}
                {filteredProducts.length ===
                1
                  ? "product"
                  : "products"}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={
                clearFilters
              }
            >
              Clear Filters
            </Button>
          </div>

          {/* FILTERS */}

          <div className="mb-8 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search product, Pokémon, set, SKU..."
                  className="pl-9"
                />
              </div>

              <FilterSelect
                value={
                  productType
                }
                onChange={
                  setProductType
                }
                label="All Product Types"
                values={
                  productTypes
                }
              />

              <FilterSelect
                value={
                  availability
                }
                onChange={
                  setAvailability
                }
                label="All Availability"
                options={[
                  {
                    value:
                      "in-stock",
                    label:
                      "In Stock",
                  },
                  {
                    value:
                      "preorder",
                    label:
                      "Preorders",
                  },
                  {
                    value:
                      "sold-out",
                    label:
                      "Sold Out",
                  },
                ]}
              />

              <FilterSelect
                value={pokemon}
                onChange={
                  setPokemon
                }
                label="All Pokémon"
                values={
                  pokemonNames
                }
              />

              <FilterSelect
                value={setName}
                onChange={
                  setSetName
                }
                label="All TCG Sets"
                values={
                  tcgSets
                }
              />

              <FilterSelect
                value={language}
                onChange={
                  setLanguage
                }
                label="All Languages"
                values={
                  languages
                }
              />

              <select
                value={sort}
                onChange={(
                  event,
                ) =>
                  setSort(
                    event.target
                      .value,
                  )
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="featured">
                  Featured
                </option>

                <option value="newest">
                  Newest Products
                </option>

                <option value="set-newest">
                  TCG Sets: Newest
                  First
                </option>

                <option value="release">
                  Upcoming Release
                  Date
                </option>

                <option value="price-low">
                  Price: Low to High
                </option>

                <option value="price-high">
                  Price: High to Low
                </option>
              </select>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(
                  event,
                ) =>
                  setMinPrice(
                    event.target
                      .value,
                  )
                }
                placeholder="Min price"
              />

              <Input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(
                  event,
                ) =>
                  setMaxPrice(
                    event.target
                      .value,
                  )
                }
                placeholder="Max price"
              />
            </div>
          </div>

          {loading && (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />

                <p className="mt-3 text-sm text-muted-foreground">
                  Loading store...
                </p>
              </div>
            </div>
          )}

          {!loading &&
            error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <p className="font-bold text-red-500">
                Unable to load
                store
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredProducts.length ===
              0 && (
              <div className="rounded-2xl border bg-card p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />

                <h3 className="mt-4 text-lg font-black">
                  No products
                  found
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  No products
                  currently match
                  these filters.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  onClick={
                    clearFilters
                  }
                >
                  Clear Filters
                </Button>
              </div>
            )}

          {!loading &&
            !error &&
            filteredProducts.length >
              0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(
                  (product) => (
                    <ProductCard
                      key={
                        product.id
                      }
                      product={
                        product
                      }
                    />
                  ),
                )}
              </div>
            )}
        </div>
      </section>
    </main>
  )
}

function CollectionLink({
  title,
  icon,
  active,
  onClick,
}: {
  title: string
  icon: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[92px] items-center justify-center gap-3 bg-background px-4 py-5 text-center transition hover:bg-muted ${
        active
          ? "text-rose-500"
          : ""
      }`}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>

      <span className="font-black">
        {title}
      </span>
    </button>
  )
}

function CategoryCard({
  category,
  selected,
  onClick,
}: {
  category: StoreCategory
  selected: boolean
  onClick: () => void
}) {
  const image =
    category.navigation_image_url ??
    category.image_url ??
    category.banner_image_url

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[180px] overflow-hidden rounded-2xl border text-left transition hover:-translate-y-1 hover:shadow-xl ${
        selected
          ? "border-rose-500 ring-2 ring-rose-500/20"
          : ""
      }`}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />

      <div className="relative flex min-h-[180px] items-end p-5 text-white">
        <div>
          <h3 className="text-xl font-black">
            {category.name}
          </h3>

          {category.description && (
            <p className="mt-1 line-clamp-2 text-xs text-white/70">
              {
                category.description
              }
            </p>
          )}

          <span className="mt-3 inline-flex items-center text-xs font-black uppercase tracking-wider">
            Shop
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  )
}

function ProductCard({
  product,
}: {
  product: StoreProduct
}) {
  const available =
    isProductAvailable(
      product,
    )

  const totalInventory =
    getTotalAvailableInventory(
      product,
    )

  const startingPrice =
    getStartingPrice(
      product,
    )

  const compareAt =
    numberValue(
      product.compare_at_price,
    )

  const image =
    product.image_url ?? null

  const hasMultiplePrices =
    Boolean(
      product.has_variants ||
      product.allow_case_purchase,
    )

  return (
    <article className="group flex overflow-hidden rounded-2xl border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex w-full flex-col">
        <Link
          href={`/store/${product.slug}`}
          className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted/20"
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
            />
          ) : (
            <Box className="h-16 w-16 text-muted-foreground/30" />
          )}

          <div className="absolute left-3 top-3 flex max-w-[85%] flex-wrap gap-1.5">
            {product.is_new_arrival && (
              <Badge className="bg-sky-600 text-white hover:bg-sky-600">
                NEW
              </Badge>
            )}

            {product.is_preorder && (
              <Badge className="bg-amber-500 text-black hover:bg-amber-500">
                PRE-ORDER
              </Badge>
            )}

            {product.is_sale && (
              <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                SALE
              </Badge>
            )}

            {product.is_fall_exclusive && (
              <Badge className="bg-orange-600 text-white hover:bg-orange-600">
                FALL
              </Badge>
            )}

            {!available && (
              <Badge variant="destructive">
                SOLD OUT
              </Badge>
            )}

            {available &&
              !product.is_preorder && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  IN STOCK
                </Badge>
              )}

            {product.allow_case_purchase && (
              <Badge variant="secondary">
                CASES
              </Badge>
            )}
          </div>

          <button
            type="button"
            aria-label="Favorite product"
            title="Favorites coming next"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition hover:text-rose-500"
            onClick={(event) => {
              event.preventDefault()
            }}
          >
            <Heart className="h-4 w-4" />
          </button>
        </Link>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {product.category && (
              <span>
                {
                  product.category
                    .name
                }
              </span>
            )}

            {product.category &&
              product.product_type && (
                <span>•</span>
              )}

            {product.product_type && (
              <span>
                {
                  product.product_type
                }
              </span>
            )}
          </div>

          <Link
            href={`/store/${product.slug}`}
          >
            <h3 className="line-clamp-2 text-lg font-black transition group-hover:text-rose-500">
              {product.name}
            </h3>
          </Link>

          {product.brand && (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {product.brand}
            </p>
          )}

          {product.pokemon_names
            ?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.pokemon_names
                .slice(0, 3)
                .map(
                  (name) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="text-[10px]"
                    >
                      {name}
                    </Badge>
                  ),
                )}
            </div>
          )}

          {product.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {
                product.description
              }
            </p>
          )}

          {product.is_preorder &&
            product.release_date && (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-500">
                <CalendarDays className="h-3.5 w-3.5" />

                Releases{" "}
                {new Date(
                  `${product.release_date}T12:00:00`,
                ).toLocaleDateString()}
              </div>
            )}

          <div className="mt-auto pt-5">
            <div className="flex items-end gap-2">
              <div>
                {hasMultiplePrices && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    From
                  </p>
                )}

                <span className="text-xl font-black">
                  {money(
                    startingPrice,
                  )}
                </span>
              </div>

              {!hasMultiplePrices &&
                compareAt >
                  startingPrice && (
                  <span className="pb-0.5 text-sm text-muted-foreground line-through">
                    {money(
                      compareAt,
                    )}
                  </span>
                )}
            </div>

            {available &&
              totalInventory <= 5 && (
                <p className="mt-1 text-xs font-bold text-orange-500">
                  Only{" "}
                  {totalInventory}{" "}
                  available
                </p>
              )}

            <Button
              asChild
              className="mt-4 w-full bg-rose-600 font-bold text-white hover:bg-rose-500"
            >
              <Link
                href={`/store/${product.slug}`}
              >
                {product.is_preorder
                  ? "View Pre-Order"
                  : "View Product"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function FilterSelect({
  value,
  onChange,
  label,
  values,
  options,
}: {
  value: string

  onChange: (
    value: string,
  ) => void

  label: string

  values?: string[]

  options?: {
    value: string
    label: string
  }[]
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value,
        )
      }
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="all">
        {label}
      </option>

      {options
        ? options.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </option>
            ),
          )
        : values?.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ),
          )}
    </select>
  )
}

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <StorePageLoading />
      }
    >
      <StorePageContent />
    </Suspense>
  )
}

function StorePageLoading() {
  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />

          <p className="mt-4 text-sm text-white/45">
            Loading store...
          </p>
        </div>
      </div>
    </main>
  )
}