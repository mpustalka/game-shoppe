"use client"

import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  DollarSign,
  ImageIcon,
  Layers3,
  Loader2,
  Package,
  Plus,
  Save,
  Shirt,
  Sparkles,
  Tag,
  Truck,
  X,
} from "lucide-react"

import ImageManager, {
  ProductImage,
} from "@/components/store/admin/image-manager"
import VariantEditor from "@/components/store/admin/variant-editor"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import {
  STORE_LANGUAGES,
  STORE_PRODUCT_TYPE_SUGGESTIONS,
  StoreCategory,
} from "@/lib/store"

type ProductFormProps = {
  productId?: string
}

type ProductFormState = {
  name: string

  category_id: string
  additional_category_ids: string[]

  product_type: string

  set_name: string
  set_release_date: string

  pokemon_names: string[]

  brand: string
  language: string

  description: string
  tags: string

  sku: string
  upc: string
  distributor: string

  cost: string
  price: string
  compare_at_price: string

  inventory_quantity: string
  max_per_customer: string

  status: string
  featured: boolean

  is_new_arrival: boolean
  is_fall_exclusive: boolean
  is_sale: boolean

  is_preorder: boolean
  release_date: string
  preorder_closes_at: string

  has_variants: boolean

  allow_single_purchase: boolean
  allow_case_purchase: boolean

  units_per_case: string
  case_cost: string
  case_price: string
  case_inventory_quantity: string

  weight_oz: string

  package_length_in: string
  package_width_in: string
  package_height_in: string

  easyship_category: string

  case_weight_oz: string
  case_length_in: string
  case_width_in: string
  case_height_in: string

  shipping_required: boolean

  images: ProductImage[]
}

const initialForm: ProductFormState = {
  name: "",

  category_id: "",
  additional_category_ids: [],

  product_type: "",

  set_name: "",
  set_release_date: "",

  pokemon_names: [],

  brand: "",
  language: "English",

  description: "",
  tags: "",

  sku: "",
  upc: "",
  distributor: "",

  cost: "",
  price: "",
  compare_at_price: "",

  inventory_quantity: "0",
  max_per_customer: "",

  status: "draft",
  featured: false,

  is_new_arrival: false,
  is_fall_exclusive: false,
  is_sale: false,

  is_preorder: false,
  release_date: "",
  preorder_closes_at: "",

  has_variants: false,

  allow_single_purchase: true,
  allow_case_purchase: false,

  units_per_case: "",
  case_cost: "",
  case_price: "",
  case_inventory_quantity: "0",

  weight_oz: "",

  package_length_in: "",
  package_width_in: "",
  package_height_in: "",

  easyship_category: "",

  case_weight_oz: "",
  case_length_in: "",
  case_width_in: "",
  case_height_in: "",

  shipping_required: true,

  images: [],
}

function stringValue(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return ""
  }

  return String(value)
}

function stringArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .filter(
          (
            item,
          ): item is string =>
            typeof item === "string",
        )
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}

function dateTimeLocalValue(
  value: unknown,
) {
  if (
    typeof value !== "string" ||
    !value
  ) {
    return ""
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ""
  }

  const pad = (
    value: number,
  ) =>
    String(value).padStart(
      2,
      "0",
    )

  return [
    date.getFullYear(),
    "-",
    pad(
      date.getMonth() + 1,
    ),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("")
}

function productToForm(
  product: Record<
    string,
    unknown
  >,
): ProductFormState {
  const gallery =
    Array.isArray(
      product.image_urls,
    )
      ? product.image_urls
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
                "string" &&
              value.trim().length >
                0,
          )
          .map((value) =>
            value.trim(),
          )
      : []

  const primaryImage =
    typeof product.image_url ===
      "string" &&
    product.image_url.trim()
      ? product.image_url.trim()
      : null

  let imageUrls = [
    ...gallery,
  ]

  if (
    primaryImage &&
    !imageUrls.includes(
      primaryImage,
    )
  ) {
    imageUrls.unshift(
      primaryImage,
    )
  }

  if (primaryImage) {
    const primaryIndex =
      imageUrls.indexOf(
        primaryImage,
      )

    if (primaryIndex > 0) {
      imageUrls.splice(
        primaryIndex,
        1,
      )

      imageUrls.unshift(
        primaryImage,
      )
    }
  }

  imageUrls = [
    ...new Set(imageUrls),
  ]

  return {
    name:
      stringValue(
        product.name,
      ),

    category_id:
      stringValue(
        product.category_id,
      ),

    additional_category_ids:
      stringArray(
        product.additional_category_ids,
      ),

    product_type:
      stringValue(
        product.product_type,
      ),

    set_name:
      stringValue(
        product.set_name,
      ),

    set_release_date:
      stringValue(
        product.set_release_date,
      ),

    pokemon_names:
      stringArray(
        product.pokemon_names,
      ),

    brand:
      stringValue(
        product.brand,
      ),

    language:
      stringValue(
        product.language,
      ) || "English",

    description:
      stringValue(
        product.description,
      ),

    tags:
      Array.isArray(
        product.tags,
      )
        ? product.tags
            .map(String)
            .join(", ")
        : stringValue(
            product.tags,
          ),

    sku:
      stringValue(
        product.sku,
      ),

    upc:
      stringValue(
        product.upc,
      ),

    distributor:
      stringValue(
        product.distributor,
      ),

    cost:
      stringValue(
        product.cost,
      ),

    price:
      stringValue(
        product.price,
      ),

    compare_at_price:
      stringValue(
        product.compare_at_price,
      ),

    inventory_quantity:
      stringValue(
        product.inventory_quantity,
      ) || "0",

    max_per_customer:
      stringValue(
        product.max_per_customer,
      ),

    status:
      stringValue(
        product.status,
      ) || "draft",

    featured:
      product.featured === true,

    is_new_arrival:
      product.is_new_arrival === true,

    is_fall_exclusive:
      product.is_fall_exclusive === true,

    is_sale:
      product.is_sale === true,

    is_preorder:
      product.is_preorder === true,

    release_date:
      stringValue(
        product.release_date,
      ),

    preorder_closes_at:
      dateTimeLocalValue(
        product.preorder_closes_at,
      ),

    has_variants:
      product.has_variants === true,

    allow_single_purchase:
      product.allow_single_purchase !==
      false,

    allow_case_purchase:
      product.allow_case_purchase ===
      true,

    units_per_case:
      stringValue(
        product.units_per_case,
      ),

    case_cost:
      stringValue(
        product.case_cost,
      ),

    case_price:
      stringValue(
        product.case_price,
      ),

    case_inventory_quantity:
      stringValue(
        product.case_inventory_quantity,
      ) || "0",

    weight_oz:
      stringValue(
        product.weight_oz,
      ),

    package_length_in:
      stringValue(
        product.package_length_in,
      ),

    package_width_in:
      stringValue(
        product.package_width_in,
      ),

    package_height_in:
      stringValue(
        product.package_height_in,
      ),

    easyship_category:
      stringValue(
        product.easyship_category,
      ),

    case_weight_oz:
      stringValue(
        product.case_weight_oz,
      ),

    case_length_in:
      stringValue(
        product.case_length_in,
      ),

    case_width_in:
      stringValue(
        product.case_width_in,
      ),

    case_height_in:
      stringValue(
        product.case_height_in,
      ),

    shipping_required:
      product.shipping_required !==
      false,

    images:
      imageUrls.map(
        (url) => ({
          url,
          path: null,
        }),
      ),
  }
}

export default function ProductForm({
  productId,
}: ProductFormProps) {
  const router = useRouter()

  const [form, setForm] =
    useState<ProductFormState>({
      ...initialForm,
      additional_category_ids: [],
      pokemon_names: [],
      images: [],
    })

  const [
    pokemonInput,
    setPokemonInput,
  ] = useState("")

  const [
    categories,
    setCategories,
  ] = useState<
    StoreCategory[]
  >([])

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] = useState(true)

  const [
    productLoading,
    setProductLoading,
  ] = useState(
    Boolean(productId),
  )

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState("")

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      try {
        const response =
          await fetch(
            "/api/admin/store/categories",
            {
              cache:
                "no-store",
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load categories",
          )
        }

        if (!cancelled) {
          setCategories(
            data.categories ??
              [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Unable to load categories",
          )
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(
            false,
          )
        }
      }
    }

    void loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!productId) {
      setProductLoading(
        false,
      )
      return
    }

    let cancelled = false

    async function loadProduct() {
      setProductLoading(true)
      setError("")

      try {
        const response =
          await fetch(
            `/api/admin/store/products/${productId}`,
            {
              cache:
                "no-store",
            },
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load product",
          )
        }

        if (!data.product) {
          throw new Error(
            "Product was not returned by the server.",
          )
        }

        if (!cancelled) {
          setForm(
            productToForm(
              data.product,
            ),
          )
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Unable to load product",
          )
        }
      } finally {
        if (!cancelled) {
          setProductLoading(
            false,
          )
        }
      }
    }

    void loadProduct()

    return () => {
      cancelled = true
    }
  }, [productId])

  const categoryOptions =
    useMemo(() => {
      const categoryMap =
        new Map<
          string,
          StoreCategory
        >()

      for (
        const category of categories
      ) {
        categoryMap.set(
          category.id,
          category,
        )
      }

      function getPath(
        category: StoreCategory,
      ) {
        const names = [
          category.name,
        ]

        let current =
          category

        const visited =
          new Set<string>()

        while (
          current.parent_id &&
          !visited.has(
            current.parent_id,
          )
        ) {
          visited.add(
            current.parent_id,
          )

          const parent =
            categoryMap.get(
              current.parent_id,
            )

          if (!parent) {
            break
          }

          names.unshift(
            parent.name,
          )

          current = parent
        }

        return names.join(
          " → ",
        )
      }

      return categories
        .map(
          (category) => ({
            ...category,
            displayName:
              getPath(
                category,
              ),
          }),
        )
        .sort((a, b) =>
          a.displayName.localeCompare(
            b.displayName,
          ),
        )
    }, [categories])

  const additionalCategoryOptions =
    useMemo(
      () =>
        categoryOptions.filter(
          (category) =>
            category.id !==
            form.category_id,
        ),
      [
        categoryOptions,
        form.category_id,
      ],
    )

  function update<
    K extends keyof ProductFormState,
  >(
    field: K,
    value: ProductFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function setPrimaryCategory(
    value: string,
  ) {
    setForm((current) => ({
      ...current,

      category_id:
        value,

      additional_category_ids:
        current.additional_category_ids.filter(
          (id) =>
            id !== value,
        ),
    }))
  }

  function toggleAdditionalCategory(
    categoryId: string,
  ) {
    setForm((current) => {
      const exists =
        current.additional_category_ids.includes(
          categoryId,
        )

      return {
        ...current,

        additional_category_ids:
          exists
            ? current.additional_category_ids.filter(
                (id) =>
                  id !==
                  categoryId,
              )
            : [
                ...current.additional_category_ids,
                categoryId,
              ],
      }
    })
  }

  function addPokemon() {
    const value =
      pokemonInput.trim()

    if (!value) {
      return
    }

    setForm((current) => {
      const exists =
        current.pokemon_names.some(
          (name) =>
            name.toLowerCase() ===
            value.toLowerCase(),
        )

      if (exists) {
        return current
      }

      return {
        ...current,

        pokemon_names: [
          ...current.pokemon_names,
          value,
        ],
      }
    })

    setPokemonInput("")
  }

  function handlePokemonKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === "Enter" ||
      event.key === ","
    ) {
      event.preventDefault()
      addPokemon()
    }
  }

  function removePokemon(
    pokemon: string,
  ) {
    setForm((current) => ({
      ...current,

      pokemon_names:
        current.pokemon_names.filter(
          (name) =>
            name !== pokemon,
        ),
    }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (saving) {
      return
    }

    setSaving(true)
    setError("")

    try {
      if (!form.name.trim()) {
        throw new Error(
          "Product name is required.",
        )
      }

      if (!form.category_id) {
        throw new Error(
          "Select a primary product category.",
        )
      }

      if (
        !form.product_type.trim()
      ) {
        throw new Error(
          "Product type is required.",
        )
      }

      if (
        form.price.trim() ===
        ""
      ) {
        throw new Error(
          "Selling price is required.",
        )
      }

      const price =
        Number(form.price)

      if (
        !Number.isFinite(
          price,
        ) ||
        price < 0
      ) {
        throw new Error(
          "Enter a valid selling price.",
        )
      }

      if (
        !form.allow_single_purchase &&
        !form.allow_case_purchase
      ) {
        throw new Error(
          "Enable single-item or case purchasing.",
        )
      }

      if (
        form.allow_case_purchase &&
        !form.units_per_case
      ) {
        throw new Error(
          "Enter the number of units per case.",
        )
      }

      if (
        form.allow_case_purchase &&
        !form.case_price
      ) {
        throw new Error(
          "Enter a case selling price.",
        )
      }

      const payload = {
        name:
          form.name.trim(),

        category_id:
          form.category_id,

        additional_category_ids:
          form.additional_category_ids,

        product_type:
          form.product_type.trim(),

        set_name:
          form.set_name.trim(),

        set_release_date:
          form.set_release_date ||
          null,

        pokemon_names:
          form.pokemon_names,

        brand:
          form.brand.trim(),

        language:
          form.language,

        description:
          form.description.trim(),

        tags:
          form.tags,

        sku:
          form.sku.trim(),

        upc:
          form.upc.trim(),

        distributor:
          form.distributor.trim(),

        cost:
          form.cost === ""
            ? null
            : Number(
                form.cost,
              ),

        price,

        compare_at_price:
          form.compare_at_price ===
          ""
            ? null
            : Number(
                form.compare_at_price,
              ),

        inventory_quantity:
          Number(
            form.inventory_quantity ||
              0,
          ),

        max_per_customer:
          form.max_per_customer ===
          ""
            ? null
            : Number(
                form.max_per_customer,
              ),

        status:
          form.status,

        featured:
          form.featured,

        is_new_arrival:
          form.is_new_arrival,

        is_fall_exclusive:
          form.is_fall_exclusive,

        is_sale:
          form.is_sale,

        is_preorder:
          form.is_preorder,

        release_date:
          form.release_date ||
          null,

        preorder_closes_at:
          form.preorder_closes_at
            ? new Date(
                form.preorder_closes_at,
              ).toISOString()
            : null,

        has_variants:
          form.has_variants,

        allow_single_purchase:
          form.allow_single_purchase,

        allow_case_purchase:
          form.allow_case_purchase,

        units_per_case:
          form.allow_case_purchase &&
          form.units_per_case !==
            ""
            ? Number(
                form.units_per_case,
              )
            : null,

        case_cost:
          form.allow_case_purchase &&
          form.case_cost !== ""
            ? Number(
                form.case_cost,
              )
            : null,

        case_price:
          form.allow_case_purchase &&
          form.case_price !== ""
            ? Number(
                form.case_price,
              )
            : null,

        case_inventory_quantity:
          form.allow_case_purchase
            ? Number(
                form.case_inventory_quantity ||
                  0,
              )
            : 0,

        weight_oz:
          form.weight_oz === ""
            ? null
            : Number(
                form.weight_oz,
              ),

        package_length_in:
          form.package_length_in ===
          ""
            ? null
            : Number(
                form.package_length_in,
              ),

        package_width_in:
          form.package_width_in ===
          ""
            ? null
            : Number(
                form.package_width_in,
              ),

        package_height_in:
          form.package_height_in ===
          ""
            ? null
            : Number(
                form.package_height_in,
              ),

        easyship_category:
          form.easyship_category.trim() ||
          null,

        case_weight_oz:
          form.allow_case_purchase &&
          form.case_weight_oz !==
            ""
            ? Number(
                form.case_weight_oz,
              )
            : null,

        case_length_in:
          form.allow_case_purchase &&
          form.case_length_in !==
            ""
            ? Number(
                form.case_length_in,
              )
            : null,

        case_width_in:
          form.allow_case_purchase &&
          form.case_width_in !==
            ""
            ? Number(
                form.case_width_in,
              )
            : null,

        case_height_in:
          form.allow_case_purchase &&
          form.case_height_in !==
            ""
            ? Number(
                form.case_height_in,
              )
            : null,

        shipping_required:
          form.shipping_required,

        image_url:
          form.images[0]
            ?.url ?? null,

        image_urls:
          form.images.map(
            (image) =>
              image.url,
          ),
      }

      const endpoint =
        productId
          ? `/api/admin/store/products/${productId}`
          : "/api/admin/store/products"

      const response =
        await fetch(
          endpoint,
          {
            method:
              productId
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            (productId
              ? "Unable to update product"
              : "Unable to create product"),
        )
      }

      if (
        !productId &&
        form.has_variants &&
        data.product?.id
      ) {
        router.push(
          `/admin/store/${data.product.id}/edit`,
        )

        router.refresh()
        return
      }

      router.push(
        "/admin/store",
      )

      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : productId
            ? "Unable to update product"
            : "Unable to create product",
      )
    } finally {
      setSaving(false)
    }
  }

  if (productLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border bg-card">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />

          <p className="mt-3 font-medium">
            Loading product...
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Loading product
            information and images.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* PRODUCT INFORMATION */}

        <Section
          icon={<Package />}
          title="Product Information"
          description="General product information shown throughout the store."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field
              label="Product Name"
              required
            >
              <Input
                value={form.name}
                onChange={(event) =>
                  update(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="Pokémon Eevee Medical Scrub Set"
                required
              />
            </Field>

            <Field
              label="Product Type"
              required
              help="Choose a suggestion or type your own product type."
            >
              <Input
                value={
                  form.product_type
                }
                onChange={(event) =>
                  update(
                    "product_type",
                    event.target.value,
                  )
                }
                list="store-product-types"
                placeholder="Medical Scrubs"
                required
              />

              <datalist id="store-product-types">
                {STORE_PRODUCT_TYPE_SUGGESTIONS.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    />
                  ),
                )}
              </datalist>
            </Field>

            <Field label="Brand">
              <Input
                value={
                  form.brand
                }
                onChange={(event) =>
                  update(
                    "brand",
                    event.target.value,
                  )
                }
                placeholder="Loungefly, Funko, Pokémon..."
              />
            </Field>

            <div className="md:col-span-2 xl:col-span-3">
              <Field label="Description">
                <Textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    update(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Product description..."
                  className="min-h-32"
                />
              </Field>
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <Field
                label="Tags"
                help="Comma separated. Example: pikachu, eevee, medical, scrub, apparel"
              >
                <Input
                  value={
                    form.tags
                  }
                  onChange={(event) =>
                    update(
                      "tags",
                      event.target.value,
                    )
                  }
                  placeholder="eevee, medical, scrubs, apparel"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* CATEGORIES */}

        <Section
          icon={<Layers3 />}
          title="Categories & Organization"
          description="Choose the product's main category and optionally place it in additional catalog categories."
        >
          <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            <Field
              label="Primary Category"
              required
              help="This is the product's main catalog category."
            >
              <Select
                value={
                  form.category_id
                }
                onValueChange={
                  setPrimaryCategory
                }
                disabled={
                  categoriesLoading
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      categoriesLoading
                        ? "Loading categories..."
                        : "Select primary category"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {categoryOptions.map(
                    (category) => (
                      <SelectItem
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.displayName
                        }
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <Label>
                Additional Categories
              </Label>

              <p className="text-xs text-muted-foreground">
                Optional. A product can
                appear in more than one
                part of your catalog.
              </p>

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-3">
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : additionalCategoryOptions.length ===
                  0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    No additional
                    categories available.
                  </p>
                ) : (
                  additionalCategoryOptions.map(
                    (category) => {
                      const checked =
                        form.additional_category_ids.includes(
                          category.id,
                        )

                      return (
                        <label
                          key={
                            category.id
                          }
                          className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition hover:bg-muted/50"
                        >
                          <span className="text-sm font-medium">
                            {
                              category.displayName
                            }
                          </span>

                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            onChange={() =>
                              toggleAdditionalCategory(
                                category.id,
                              )
                            }
                            className="h-4 w-4 accent-rose-600"
                          />
                        </label>
                      )
                    },
                  )
                )}
              </div>

              {form.additional_category_ids.length >
                0 && (
                <p className="text-xs font-medium text-rose-500">
                  {
                    form.additional_category_ids
                      .length
                  }{" "}
                  additional{" "}
                  {form.additional_category_ids
                    .length ===
                  1
                    ? "category"
                    : "categories"}{" "}
                  selected
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* POKEMON / TCG */}

        <Section
          icon={<Tag />}
          title="Pokémon & TCG Information"
          description="Add Pokémon featured on the merchandise and TCG set information when applicable."
        >
          <div className="space-y-6">
            <Field
              label="Pokémon Featured"
              help="Type a Pokémon name and press Enter, comma, or Add Pokémon. Add as many as needed."
            >
              <div className="flex gap-2">
                <Input
                  value={
                    pokemonInput
                  }
                  onChange={(event) =>
                    setPokemonInput(
                      event.target.value,
                    )
                  }
                  onKeyDown={
                    handlePokemonKeyDown
                  }
                  placeholder="Pikachu"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    addPokemon
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pokémon
                </Button>
              </div>

              {form.pokemon_names.length >
                0 && (
                <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/20 p-3">
                  {form.pokemon_names.map(
                    (pokemon) => (
                      <Badge
                        key={
                          pokemon
                        }
                        variant="secondary"
                        className="gap-1 py-1.5 pl-3 pr-1.5"
                      >
                        {pokemon}

                        <button
                          type="button"
                          onClick={() =>
                            removePokemon(
                              pokemon,
                            )
                          }
                          className="rounded-full p-0.5 hover:bg-background"
                          aria-label={`Remove ${pokemon}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ),
                  )}
                </div>
              )}
            </Field>

            <div className="grid gap-5 md:grid-cols-3">
              <Field
                label="Set / Collection"
                help="Useful for Pokémon TCG products. Leave blank for unrelated merchandise."
              >
                <Input
                  value={
                    form.set_name
                  }
                  onChange={(event) =>
                    update(
                      "set_name",
                      event.target.value,
                    )
                  }
                  placeholder="Prismatic Evolutions"
                />
              </Field>

              <Field label="Set Release Date">
                <Input
                  type="date"
                  value={
                    form.set_release_date
                  }
                  onChange={(event) =>
                    update(
                      "set_release_date",
                      event.target.value,
                    )
                  }
                />
              </Field>

              <Field label="Language">
                <Select
                  value={
                    form.language
                  }
                  onValueChange={(
                    value,
                  ) =>
                    update(
                      "language",
                      value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STORE_LANGUAGES.map(
                      (language) => (
                        <SelectItem
                          key={
                            language
                          }
                          value={
                            language
                          }
                        >
                          {
                            language
                          }
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </Section>

        {/* COLLECTIONS */}

        <Section
          icon={<Sparkles />}
          title="Store Collections"
          description="These flags power storefront collections and filters without forcing the product into artificial categories."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ToggleCard
              title="New Arrival"
              description="Show in New Arrivals."
              checked={
                form.is_new_arrival
              }
              onCheckedChange={(
                checked,
              ) =>
                update(
                  "is_new_arrival",
                  checked,
                )
              }
            />

            <ToggleCard
              title="Fall Exclusive"
              description="Show in Fall Exclusives."
              checked={
                form.is_fall_exclusive
              }
              onCheckedChange={(
                checked,
              ) =>
                update(
                  "is_fall_exclusive",
                  checked,
                )
              }
            />

            <ToggleCard
              title="On Sale"
              description="Include in sale filtering."
              checked={
                form.is_sale
              }
              onCheckedChange={(
                checked,
              ) =>
                update(
                  "is_sale",
                  checked,
                )
              }
            />

            <ToggleCard
              title="Featured Product"
              description="Promote more prominently."
              checked={
                form.featured
              }
              onCheckedChange={(
                checked,
              ) =>
                update(
                  "featured",
                  checked,
                )
              }
            />
          </div>
        </Section>

        {/* INVENTORY */}

        <Section
          icon={<Boxes />}
          title="Inventory & Distribution"
          description="Private purchasing, SKU and inventory information."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Distributor">
              <Input
                value={
                  form.distributor
                }
                onChange={(event) =>
                  update(
                    "distributor",
                    event.target.value,
                  )
                }
                placeholder="Distributor / supplier"
              />
            </Field>

            <Field label="SKU">
              <Input
                value={form.sku}
                onChange={(event) =>
                  update(
                    "sku",
                    event.target.value,
                  )
                }
                placeholder="EE-SCRUB-001"
              />
            </Field>

            <Field label="UPC">
              <Input
                value={form.upc}
                onChange={(event) =>
                  update(
                    "upc",
                    event.target.value,
                  )
                }
                placeholder="UPC / barcode"
              />
            </Field>

            <Field
              label={
                form.has_variants
                  ? "Base Inventory"
                  : "Inventory"
              }
              help={
                form.has_variants
                  ? "Variant inventory is managed separately below."
                  : undefined
              }
            >
              <Input
                type="number"
                min="0"
                step="1"
                value={
                  form.inventory_quantity
                }
                onChange={(event) =>
                  update(
                    "inventory_quantity",
                    event.target.value,
                  )
                }
              />
            </Field>
          </div>
        </Section>

        {/* PRICING */}

        <Section
          icon={<DollarSign />}
          title="Pricing"
          description="Your cost is private. Selling price and MSRP are customer-facing."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Your Cost">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.cost
                }
                onChange={(event) =>
                  update(
                    "cost",
                    event.target.value,
                  )
                }
                placeholder="35.00"
              />
            </Field>

            <Field
              label="Selling Price"
              required
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.price
                }
                onChange={(event) =>
                  update(
                    "price",
                    event.target.value,
                  )
                }
                placeholder="54.99"
                required
              />
            </Field>

            <Field label="MSRP / Compare At">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.compare_at_price
                }
                onChange={(event) =>
                  update(
                    "compare_at_price",
                    event.target.value,
                  )
                }
                placeholder="59.99"
              />
            </Field>

            <Field label="Max Per Customer">
              <Input
                type="number"
                min="1"
                step="1"
                value={
                  form.max_per_customer
                }
                onChange={(event) =>
                  update(
                    "max_per_customer",
                    event.target.value,
                  )
                }
                placeholder="4"
              />
            </Field>
          </div>
        </Section>

        {/* PURCHASE OPTIONS */}

        <Section
          icon={<Package />}
          title="Purchase Options"
          description="Sell the product individually, by sealed case, or both."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleCard
              title="Sell Individual Items"
              description="Customers can purchase individual units."
              checked={
                form.allow_single_purchase
              }
              onCheckedChange={(
                checked,
              ) =>
                update(
                  "allow_single_purchase",
                  checked,
                )
              }
            />

            <ToggleCard
              title="Sell By Case"
              description="Customers can purchase full cases."
              checked={
                form.allow_case_purchase
              }
              onCheckedChange={(
                checked,
              ) =>
                update(
                  "allow_case_purchase",
                  checked,
                )
              }
            />
          </div>

          {form.allow_case_purchase && (
            <div className="mt-5 space-y-6 rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="Units Per Case"
                  required
                >
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.units_per_case
                    }
                    onChange={(event) =>
                      update(
                        "units_per_case",
                        event.target.value,
                      )
                    }
                    placeholder="6"
                  />
                </Field>

                <Field label="Case Cost">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.case_cost
                    }
                    onChange={(event) =>
                      update(
                        "case_cost",
                        event.target.value,
                      )
                    }
                    placeholder="500.00"
                  />
                </Field>

                <Field
                  label="Case Selling Price"
                  required
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.case_price
                    }
                    onChange={(event) =>
                      update(
                        "case_price",
                        event.target.value,
                      )
                    }
                    placeholder="719.99"
                  />
                </Field>

                <Field label="Case Inventory">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.case_inventory_quantity
                    }
                    onChange={(event) =>
                      update(
                        "case_inventory_quantity",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>

              <div className="border-t pt-5">
                <div className="mb-4">
                  <h3 className="font-black">
                    Case Shipping
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Shipping weight and
                    dimensions for one
                    sealed case.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Case Weight (oz)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.case_weight_oz
                      }
                      onChange={(event) =>
                        update(
                          "case_weight_oz",
                          event.target.value,
                        )
                      }
                      placeholder="192"
                    />
                  </Field>

                  <Field label="Length (in)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.case_length_in
                      }
                      onChange={(event) =>
                        update(
                          "case_length_in",
                          event.target.value,
                        )
                      }
                      placeholder="18"
                    />
                  </Field>

                  <Field label="Width (in)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.case_width_in
                      }
                      onChange={(event) =>
                        update(
                          "case_width_in",
                          event.target.value,
                        )
                      }
                      placeholder="14"
                    />
                  </Field>

                  <Field label="Height (in)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.case_height_in
                      }
                      onChange={(event) =>
                        update(
                          "case_height_in",
                          event.target.value,
                        )
                      }
                      placeholder="12"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* VARIANTS */}

        <Section
          icon={<Shirt />}
          title="Product Variants"
          description="Enable this for clothing, scrubs, sizes, colors, styles and other product options."
        >
          <ToggleCard
            title="This Product Has Variants"
            description="Examples: XS / S / M / L, black / purple, scrub top / pants / set."
            checked={
              form.has_variants
            }
            onCheckedChange={(
              checked,
            ) =>
              update(
                "has_variants",
                checked,
              )
            }
          />

          {form.has_variants && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-bold text-amber-600 dark:text-amber-400">
                Variant tracking
                enabled
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {productId
                  ? "Save product changes, then use the Variant Manager below to create sizes, colors, styles, pricing and inventory combinations."
                  : "Save this base product first. You will be taken directly to Edit Product where you can build its variants."}
              </p>
            </div>
          )}
        </Section>

        {/* PREORDER */}

        <Section
          icon={
            <CalendarDays />
          }
          title="Pre-Order"
          description="Use this for upcoming Pokémon TCG releases or merchandise."
        >
          <ToggleCard
            title="This Is A Pre-Order"
            description="Customers can purchase before the product release date."
            checked={
              form.is_preorder
            }
            onCheckedChange={(
              checked,
            ) =>
              update(
                "is_preorder",
                checked,
              )
            }
          />

          {form.is_preorder && (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="Product Release Date">
                <Input
                  type="date"
                  value={
                    form.release_date
                  }
                  onChange={(event) =>
                    update(
                      "release_date",
                      event.target.value,
                    )
                  }
                />
              </Field>

              <Field label="Pre-Order Closes">
                <Input
                  type="datetime-local"
                  value={
                    form.preorder_closes_at
                  }
                  onChange={(event) =>
                    update(
                      "preorder_closes_at",
                      event.target.value,
                    )
                  }
                />
              </Field>
            </div>
          )}
        </Section>

        {/* IMAGES */}

        <Section
          icon={<ImageIcon />}
          title="Product Images"
          description="Upload product photos or add them by URL. The first image is the primary storefront image."
        >
          <ImageManager
            images={
              form.images
            }
            onChange={(
              images,
            ) =>
              update(
                "images",
                images,
              )
            }
          />
        </Section>

        {/* SHIPPING */}

        <Section
          icon={<Truck />}
          title="Shipping & Easyship"
          description="Physical weight, package dimensions and customs category used for shipping rates and fulfillment."
        >
          <div className="space-y-6">
            <ToggleCard
              title="Requires Shipping"
              description="Disable only for non-physical products."
              checked={
                form.shipping_required
              }
              onCheckedChange={(
                checked,
              ) =>
                update(
                  "shipping_required",
                  checked,
                )
              }
            />

            {form.shipping_required && (
              <>
                <div>
                  <div className="mb-4">
                    <h3 className="font-black">
                      Individual Item Package
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter the packaged
                      weight and dimensions
                      for one sellable unit.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Weight (oz)">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.weight_oz
                        }
                        onChange={(event) =>
                          update(
                            "weight_oz",
                            event.target.value,
                          )
                        }
                        placeholder="12"
                      />
                    </Field>

                    <Field label="Length (in)">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.package_length_in
                        }
                        onChange={(event) =>
                          update(
                            "package_length_in",
                            event.target.value,
                          )
                        }
                        placeholder="10"
                      />
                    </Field>

                    <Field label="Width (in)">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.package_width_in
                        }
                        onChange={(event) =>
                          update(
                            "package_width_in",
                            event.target.value,
                          )
                        }
                        placeholder="8"
                      />
                    </Field>

                    <Field label="Height (in)">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.package_height_in
                        }
                        onChange={(event) =>
                          update(
                            "package_height_in",
                            event.target.value,
                          )
                        }
                        placeholder="4"
                      />
                    </Field>
                  </div>
                </div>

                <Field
                  label="Easyship Category"
                  help="Store the Easyship category slug used for this merchandise type."
                >
                  <Input
                    value={
                      form.easyship_category
                    }
                    onChange={(event) =>
                      update(
                        "easyship_category",
                        event.target.value,
                      )
                    }
                    placeholder="Example Easyship category slug"
                  />
                </Field>
              </>
            )}
          </div>
        </Section>

        {/* PUBLISHING */}

        <Section
          icon={<Sparkles />}
          title="Publishing"
          description="Control whether this product is visible in the storefront."
        >
          <Field label="Status">
            <Select
              value={
                form.status
              }
              onValueChange={(
                value,
              ) =>
                update(
                  "status",
                  value,
                )
              }
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="draft">
                  Draft
                </SelectItem>

                <SelectItem value="active">
                  Active / Published
                </SelectItem>

                <SelectItem value="sold_out">
                  Sold Out
                </SelectItem>

                <SelectItem value="archived">
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* SAVE BAR */}

        <div className="sticky bottom-4 z-20 flex flex-col justify-between gap-3 rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {productId
                ? "Editing Product"
                : form.status ===
                    "active"
                  ? "Published"
                  : form.status}
            </Badge>

            {form.is_new_arrival && (
              <Badge variant="outline">
                New Arrival
              </Badge>
            )}

            {form.is_fall_exclusive && (
              <Badge variant="outline">
                Fall Exclusive
              </Badge>
            )}

            {form.is_sale && (
              <Badge variant="outline">
                Sale
              </Badge>
            )}

            {form.is_preorder && (
              <Badge className="bg-amber-500 text-black hover:bg-amber-500">
                Pre-Order
              </Badge>
            )}

            {form.allow_case_purchase && (
              <Badge variant="outline">
                Case Sales
              </Badge>
            )}

            {form.has_variants && (
              <Badge variant="outline">
                Variants
              </Badge>
            )}

            {form.additional_category_ids.length >
              0 && (
              <Badge variant="outline">
                +
                {
                  form.additional_category_ids
                    .length
                }{" "}
                Categories
              </Badge>
            )}

            {form.pokemon_names.length >
              0 && (
              <Badge variant="outline">
                {
                  form.pokemon_names
                    .length
                }{" "}
                Pokémon
              </Badge>
            )}

            {form.images.length >
              0 && (
              <Badge variant="outline">
                {
                  form.images
                    .length
                }{" "}
                {form.images
                  .length === 1
                  ? "Image"
                  : "Images"}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() =>
                router.push(
                  "/admin/store",
                )
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                saving ||
                productLoading
              }
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  {productId
                    ? "Saving Changes..."
                    : "Saving Product..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />

                  {productId
                    ? "Save Changes"
                    : form.has_variants
                      ? "Save & Configure Variants"
                      : "Save Product"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* VARIANT MANAGER OUTSIDE FORM */}

      {productId &&
        form.has_variants && (
          <Section
            icon={<Shirt />}
            title="Variant Manager"
            description="Build and manage sizes, colors, styles, SKUs, prices, images and inventory."
          >
            <VariantEditor
              productId={
                productId
              }
              productName={
                form.name
              }
              baseSku={
                form.sku
              }
              basePrice={
                form.price
              }
              baseCompareAtPrice={
                form.compare_at_price
              }
              baseCost={
                form.cost
              }
              productImages={form.images.map(
                (image) =>
                  image.url,
              )}
            />
          </Section>
        )}
    </div>
  )
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex gap-3 border-b p-5 sm:p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>

        <div>
          <h2 className="font-black">
            {title}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string
  help?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </Label>

      {children}

      {help && (
        <p className="text-xs text-muted-foreground">
          {help}
        </p>
      )}
    </div>
  )
}

function ToggleCard({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (
    checked: boolean,
  ) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <div>
        <p className="font-bold">
          {title}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <Switch
        checked={checked}
        onCheckedChange={
          onCheckedChange
        }
      />
    </div>
  )
}