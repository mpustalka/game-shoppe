export const STORE_PRODUCT_TYPE_SUGGESTIONS = [
  "Booster Box",
  "Elite Trainer Box",
  "Booster Bundle",
  "Collection Box",
  "Tin",
  "Blister",
  "Sleeved Booster",
  "Ultra Premium Collection",
  "Deck",
  "Case",
  "Medical Scrubs",
  "Scrub Top",
  "Scrub Pants",
  "Scrub Set",
  "Hoodie",
  "T-Shirt",
  "Hat",
  "Lanyard",
  "Mouse Pad",
  "Funko Pop",
  "Figure",
  "Plush",
  "Statue",
  "Loungefly Backpack",
  "Backpack",
  "Wallet",
  "Accessory",
  "Other",
] as const

export const STORE_LANGUAGES = [
  "English",
  "Japanese",
  "Chinese",
  "Korean",
  "Other",
] as const

export type StoreProductStatus =
  | "draft"
  | "active"
  | "sold_out"
  | "archived"

export interface StoreCategory {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  image_url: string | null
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface StoreProduct {
  id: string

  name: string
  slug: string
  description: string | null

  sku: string | null
  upc: string | null

  category_id: string | null

  product_type: string
  set_name: string | null
  brand: string | null
  language: string

  tags: string[]

  price: number
  compare_at_price: number | null

  inventory_quantity: number

  max_per_customer: number | null

  status: StoreProductStatus

  featured: boolean

  is_preorder: boolean
  release_date: string | null
  preorder_closes_at: string | null

  has_variants: boolean

  allow_single_purchase: boolean
  allow_case_purchase: boolean

  units_per_case: number | null
  case_price: number | null
  case_inventory_quantity: number

  weight_oz: number | null
  shipping_required: boolean

  image_url: string | null
  image_urls: string[]

  created_at: string
  updated_at: string
}

export interface AdminStoreProduct
  extends StoreProduct {
  distributor: string | null
  cost: number | null
  case_cost: number | null
}

export function formatStorePrice(
  value: number | string | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—"
  }

  const number = Number(value)

  if (!Number.isFinite(number)) {
    return "—"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number)
}

export function storeProductAvailability(
  product: StoreProduct,
) {
  if (
    product.status === "sold_out" ||
    (!product.has_variants &&
      product.inventory_quantity <= 0 &&
      product.case_inventory_quantity <= 0)
  ) {
    return "sold-out"
  }

  if (product.is_preorder) {
    return "preorder"
  }

  return "in-stock"
}

export function slugifyProductName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}