"use client"

import Link from "next/link"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  ArrowRight,
  Boxes,
  CalendarDays,
  DollarSign,
  Download,
  Edit,
  FolderTree,
  ImageIcon,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Upload,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type StoreCategory = {
  id: string
  name: string
  slug: string
}

type StoreProduct = {
  id: string
  name: string
  slug: string

  description: string | null

  sku: string | null
  upc: string | null

  category_id: string | null
  category?: StoreCategory | null

  product_type: string

  set_name: string | null
  set_release_date: string | null

  pokemon_names: string[]

  brand: string | null
  language: string

  distributor: string | null

  cost: number | null
  price: number
  compare_at_price: number | null

  inventory_quantity: number
  max_per_customer: number | null

  status:
    | "draft"
    | "active"
    | "sold_out"
    | "archived"

  featured: boolean

  is_new_arrival: boolean
  is_fall_exclusive: boolean
  is_sale: boolean

  is_preorder: boolean
  release_date: string | null
  preorder_closes_at: string | null

  has_variants: boolean

  allow_single_purchase: boolean
  allow_case_purchase: boolean

  units_per_case: number | null
  case_cost: number | null
  case_price: number | null
  case_inventory_quantity: number

  weight_oz: number | null

  package_length_in: number | null
  package_width_in: number | null
  package_height_in: number | null

  easyship_category: string | null

  case_weight_oz: number | null
  case_length_in: number | null
  case_width_in: number | null
  case_height_in: number | null

  shipping_required: boolean

  image_url: string | null
  image_urls: string[]

  created_at: string
  updated_at: string
}

function money(
  value:
    | number
    | string
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—"
  }

  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return "—"
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(amount)
}

export default function AdminStorePage() {
  const [
    products,
    setProducts,
  ] = useState<StoreProduct[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    search,
    setSearch,
  ] = useState("")

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all")

  const [
    collectionFilter,
    setCollectionFilter,
  ] = useState("all")

  const [
    error,
    setError,
  ] = useState("")

  const loadProducts =
    useCallback(async () => {
      setLoading(true)
      setError("")

      try {
        const response =
          await fetch(
            "/api/admin/store/products",
            {
              cache: "no-store",
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load products",
          )
        }

        setProducts(
          data.products ?? [],
        )
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load products",
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return products.filter(
        (product) => {
          if (
            statusFilter !== "all" &&
            product.status !==
              statusFilter
          ) {
            return false
          }

          if (
            collectionFilter ===
              "new" &&
            !product.is_new_arrival
          ) {
            return false
          }

          if (
            collectionFilter ===
              "preorder" &&
            !product.is_preorder
          ) {
            return false
          }

          if (
            collectionFilter ===
              "sale" &&
            !product.is_sale
          ) {
            return false
          }

          if (
            collectionFilter ===
              "fall" &&
            !product.is_fall_exclusive
          ) {
            return false
          }

          if (
            collectionFilter ===
              "featured" &&
            !product.featured
          ) {
            return false
          }

          if (
            collectionFilter ===
              "case" &&
            !product.allow_case_purchase
          ) {
            return false
          }

          if (
            collectionFilter ===
              "variants" &&
            !product.has_variants
          ) {
            return false
          }

          if (!query) {
            return true
          }

          const searchable = [
            product.name,
            product.sku,
            product.upc,
            product.product_type,
            product.set_name,
            product.brand,
            product.distributor,
            product.category?.name,
            product.language,
            product.easyship_category,
            ...(product.pokemon_names ??
              []),
          ]

          return searchable.some(
            (value) =>
              value
                ?.toLowerCase()
                .includes(query),
          )
        },
      )
    }, [
      products,
      search,
      statusFilter,
      collectionFilter,
    ])

  const stats =
    useMemo(() => {
      const active =
        products.filter(
          (product) =>
            product.status ===
            "active",
        ).length

      const preorders =
        products.filter(
          (product) =>
            product.is_preorder &&
            product.status !==
              "archived",
        ).length

      const singleInventory =
        products.reduce(
          (total, product) =>
            total +
            Number(
              product.inventory_quantity ??
                0,
            ),
          0,
        )

      const caseInventory =
        products.reduce(
          (total, product) =>
            total +
            Number(
              product.case_inventory_quantity ??
                0,
            ),
          0,
        )

      const retailValue =
        products.reduce(
          (total, product) => {
            const singles =
              Number(
                product.price ?? 0,
              ) *
              Number(
                product.inventory_quantity ??
                  0,
              )

            const cases =
              Number(
                product.case_price ??
                  0,
              ) *
              Number(
                product.case_inventory_quantity ??
                  0,
              )

            return (
              total +
              singles +
              cases
            )
          },
          0,
        )

      return {
        active,
        preorders,
        singleInventory,
        caseInventory,
        retailValue,
      }
    }, [products])

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-500">
            <ShoppingBag className="h-4 w-4" />
            Store Administration
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Store Products
          </h1>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            Manage Pokémon TCG,
            apparel, medical scrubs,
            Loungefly, Funko,
            collectibles, accessories,
            pre-orders and distributor
            inventory.
          </p>
        </div>

        {/* QUICK ACTIONS */}

        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link href="/store">
              <Store className="mr-2 h-4 w-4" />
              View Store
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link href="/admin/store/categories">
              <FolderTree className="mr-2 h-4 w-4" />
              Categories
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link href="/admin/store/banners">
              <ImageIcon className="mr-2 h-4 w-4" />
              Banners
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            className="bg-rose-600 text-white hover:bg-rose-500"
          >
            <Link href="/admin/store/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* STORE MANAGEMENT */}

      <section className="mb-8">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">
            Store Management
          </p>

          <h2 className="mt-1 text-2xl font-black">
            Manage Your Store
          </h2>

          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Everything you need to
            manage the storefront is
            available here. No admin
            URLs to remember.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AdminLinkCard
            href="/admin/store/new"
            title="Add Product"
            description="Add a product, preorder, case, apparel item or collectible."
            icon={<Plus />}
          />

          <AdminLinkCard
            href="/admin/store"
            title="Products"
            description="Search, review and edit your complete store catalog."
            icon={<Package />}
          />

          <AdminLinkCard
            href="/admin/store/categories"
            title="Categories"
            description="Manage categories, subcategories, images and navigation."
            icon={<FolderTree />}
          />

          <AdminLinkCard
            href="/admin/store/banners"
            title="Banners"
            description="Manage storefront hero images, promotions and schedules."
            icon={<ImageIcon />}
          />

          <AdminLinkCard
            href="/admin/store/import"
            title="Import Products"
            description="Bulk create or update products from a CSV file."
            icon={<Upload />}
          />

          <AdminLinkCard
            href="/api/admin/store/export"
            title="Export Products"
            description="Download your current store catalog as a CSV file."
            icon={<Download />}
            external
          />

          <AdminLinkCard
            href="/store"
            title="View Store"
            description="Open the customer storefront and review what shoppers see."
            icon={<Store />}
          />
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* STATS */}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Active Products"
          value={stats.active.toString()}
          icon={<Package />}
        />

        <StatCard
          title="Pre-Orders"
          value={stats.preorders.toString()}
          icon={<CalendarDays />}
        />

        <StatCard
          title="Single Units"
          value={stats.singleInventory.toLocaleString()}
          icon={<Boxes />}
        />

        <StatCard
          title="Cases"
          value={stats.caseInventory.toLocaleString()}
          icon={<Boxes />}
        />

        <StatCard
          title="Retail Inventory"
          value={money(
            stats.retailValue,
          )}
          icon={<DollarSign />}
        />
      </div>

      {/* PRODUCT LIST */}

      <div className="overflow-hidden rounded-2xl border bg-card">
        {/* TOOLBAR */}

        <div className="flex flex-col justify-between gap-4 border-b p-5 xl:flex-row xl:items-center">
          <div>
            <h2 className="font-black">
              Products
            </h2>

            <p className="text-sm text-muted-foreground">
              {filteredProducts.length}{" "}
              shown of{" "}
              {products.length} total
              products
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row">
            {/* SEARCH */}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search name, SKU, Pokémon, set..."
                className="w-full pl-9 lg:w-[300px]"
              />
            </div>

            {/* STATUS FILTER */}

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">
                All Statuses
              </option>

              <option value="active">
                Active
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="sold_out">
                Sold Out
              </option>

              <option value="archived">
                Archived
              </option>
            </select>

            {/* COLLECTION FILTER */}

            <select
              value={collectionFilter}
              onChange={(event) =>
                setCollectionFilter(
                  event.target.value,
                )
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">
                All Products
              </option>

              <option value="new">
                New Arrivals
              </option>

              <option value="preorder">
                Pre-Orders
              </option>

              <option value="sale">
                Sale
              </option>

              <option value="fall">
                Fall Exclusives
              </option>

              <option value="featured">
                Featured
              </option>

              <option value="case">
                Case Sales
              </option>

              <option value="variants">
                Has Variants
              </option>
            </select>

            {/* REFRESH */}

            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                void loadProducts()
              }
              title="Refresh products"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredProducts.length ===
          0 ? (
          <EmptyProducts
            hasProducts={
              products.length > 0
            }
          />
        ) : (
          <div className="divide-y">
            {filteredProducts.map(
              (product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminLinkCard({
  href,
  title,
  description,
  icon,
  external = false,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
  external?: boolean
}) {
  const content = (
    <div className="group flex h-full min-h-[155px] flex-col rounded-2xl border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-rose-500/50 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-rose-500" />
      </div>

      <div className="mt-4">
        <h3 className="font-black transition group-hover:text-rose-500">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )

  if (external) {
    return (
      <a
        href={href}
        className="block h-full"
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      href={href}
      className="block h-full"
    >
      {content}
    </Link>
  )
}

function ProductRow({
  product,
}: {
  product: StoreProduct
}) {
  const singleStock =
    Number(
      product.inventory_quantity ??
        0,
    )

  const caseStock =
    Number(
      product.case_inventory_quantity ??
        0,
    )

  const hasPackageDimensions =
    product.package_length_in !==
      null &&
    product.package_width_in !==
      null &&
    product.package_height_in !==
      null

  return (
    <div className="grid gap-4 p-4 transition hover:bg-muted/30 sm:grid-cols-[76px_1fr_auto] sm:items-center xl:grid-cols-[76px_minmax(300px,1fr)_150px_130px_150px_180px_60px]">
      {/* IMAGE */}

      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Package className="h-7 w-7 text-muted-foreground/40" />
        )}
      </div>

      {/* PRODUCT */}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-bold">
            {product.name}
          </h3>

          {product.featured && (
            <Sparkles
              className="h-4 w-4 text-amber-500"
              aria-label="Featured"
            />
          )}

          {product.is_new_arrival && (
            <Badge
              variant="outline"
              className="border-sky-500/40 text-[10px] text-sky-600 dark:text-sky-400"
            >
              NEW
            </Badge>
          )}

          {product.is_sale && (
            <Badge
              variant="outline"
              className="border-rose-500/40 text-[10px] text-rose-600 dark:text-rose-400"
            >
              SALE
            </Badge>
          )}

          {product.is_fall_exclusive && (
            <Badge
              variant="outline"
              className="border-orange-500/40 text-[10px] text-orange-600 dark:text-orange-400"
            >
              FALL
            </Badge>
          )}

          {product.has_variants && (
            <Badge
              variant="outline"
              className="text-[10px]"
            >
              VARIANTS
            </Badge>
          )}

          {product.allow_case_purchase && (
            <Badge
              variant="outline"
              className="text-[10px]"
            >
              CASE
            </Badge>
          )}
        </div>

        {/* PRODUCT META */}

        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {product.category?.name && (
            <span>
              {
                product.category
                  .name
              }
            </span>
          )}

          {product.product_type && (
            <span>
              •{" "}
              {product.product_type}
            </span>
          )}

          {product.brand && (
            <span>
              • {product.brand}
            </span>
          )}

          {product.set_name && (
            <span>
              • {product.set_name}
            </span>
          )}

          {product.language && (
            <span>
              • {product.language}
            </span>
          )}

          {product.sku && (
            <span>
              • SKU {product.sku}
            </span>
          )}
        </div>

        {/* POKEMON */}

        {product.pokemon_names
          ?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.pokemon_names
              .slice(0, 5)
              .map(
                (pokemon) => (
                  <Badge
                    key={pokemon}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {pokemon}
                  </Badge>
                ),
              )}

            {product.pokemon_names
              .length > 5 && (
              <Badge
                variant="secondary"
                className="text-[10px]"
              >
                +
                {product
                  .pokemon_names
                  .length - 5}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* INVENTORY */}

      <div>
        <p className="text-xs text-muted-foreground">
          Inventory
        </p>

        <p className="font-bold">
          {singleStock}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            singles
          </span>
        </p>

        {product.allow_case_purchase && (
          <p className="text-xs text-muted-foreground">
            {caseStock} cases
          </p>
        )}
      </div>

      {/* PRICE */}

      <div>
        <p className="text-xs text-muted-foreground">
          Price
        </p>

        <p className="font-bold">
          {money(product.price)}
        </p>

        {product.compare_at_price !==
          null &&
          Number(
            product.compare_at_price,
          ) >
            Number(
              product.price,
            ) && (
            <p className="text-xs text-muted-foreground line-through">
              {money(
                product.compare_at_price,
              )}
            </p>
          )}

        {product.allow_case_purchase &&
          product.case_price !==
            null && (
            <p className="text-xs text-muted-foreground">
              Case{" "}
              {money(
                product.case_price,
              )}
            </p>
          )}
      </div>

      {/* TYPE */}

      <div>
        <p className="text-xs text-muted-foreground">
          Type
        </p>

        <p className="truncate text-sm font-medium">
          {product.product_type}
        </p>

        {product.is_preorder &&
          product.release_date && (
            <p className="mt-1 text-xs text-muted-foreground">
              Release{" "}
              {formatDate(
                product.release_date,
              )}
            </p>
          )}

        {!product.is_preorder &&
          product.set_release_date && (
            <p className="mt-1 text-xs text-muted-foreground">
              Set{" "}
              {formatDate(
                product.set_release_date,
              )}
            </p>
          )}
      </div>

      {/* STATUS / SHIPPING */}

      <div className="flex flex-wrap gap-1">
        <StatusBadge
          product={product}
        />

        {product.shipping_required && (
          <Badge
            variant="outline"
            className={
              hasPackageDimensions &&
              product.weight_oz !==
                null
                ? "text-[10px]"
                : "border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400"
            }
          >
            {hasPackageDimensions &&
            product.weight_oz !==
              null
              ? "SHIPPING READY"
              : "SHIPPING DATA"}
          </Badge>
        )}
      </div>

      {/* EDIT */}

      <Button
        asChild
        variant="ghost"
        size="icon"
        title="Edit product"
      >
        <Link
          href={`/admin/store/${product.id}/edit`}
        >
          <Edit className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

function StatusBadge({
  product,
}: {
  product: StoreProduct
}) {
  if (
    product.status === "archived"
  ) {
    return (
      <Badge variant="secondary">
        ARCHIVED
      </Badge>
    )
  }

  if (
    product.status === "draft"
  ) {
    return (
      <Badge variant="outline">
        DRAFT
      </Badge>
    )
  }

  if (
    product.status ===
      "sold_out" ||
    (!product.has_variants &&
      product.inventory_quantity <=
        0 &&
      product.case_inventory_quantity <=
        0)
  ) {
    return (
      <Badge className="bg-red-600 text-white hover:bg-red-600">
        SOLD OUT
      </Badge>
    )
  }

  if (product.is_preorder) {
    return (
      <Badge className="bg-amber-500 text-black hover:bg-amber-500">
        PRE-ORDER
      </Badge>
    )
  }

  return (
    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
      ACTIVE
    </Badge>
  )
}

function EmptyProducts({
  hasProducts,
}: {
  hasProducts: boolean
}) {
  return (
    <div className="py-20 text-center">
      <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />

      <h3 className="mt-4 font-bold">
        {hasProducts
          ? "No matching products"
          : "No store products yet"}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {hasProducts
          ? "Try changing your search, status, or collection filter."
          : "Add your first Pokémon TCG product, apparel item, collectible or preorder."}
      </p>

      {!hasProducts && (
        <Button
          asChild
          className="mt-5 bg-rose-600 text-white hover:bg-rose-500"
        >
          <Link href="/admin/store/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-black">
        {value}
      </p>
    </div>
  )
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(date)
}