"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  Boxes,
  Check,
  Copy,
  DollarSign,
  ImageIcon,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type OptionGroup = {
  name: string
  values: string[]
  draftValue: string
}

type VariantRow = {
  id?: string | null

  name: string

  sku: string
  upc: string

  option1_name: string
  option1_value: string

  option2_name: string
  option2_value: string

  option3_name: string
  option3_value: string

  price: string
  compare_at_price: string
  cost: string

  inventory_quantity: string

  image_url: string

  active: boolean
  sort_order: number
}

type VariantEditorProps = {
  productId: string
  productName: string
  baseSku?: string
  basePrice?: string
  baseCompareAtPrice?: string
  baseCost?: string
  productImages?: string[]
}

function emptyOption(): OptionGroup {
  return {
    name: "",
    values: [],
    draftValue: "",
  }
}

function normalizeSkuPart(
  value: string,
) {
  return value
    .trim()
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
}

function combinationKey(
  values: string[],
) {
  return values
    .map((value) =>
      value
        .trim()
        .toLowerCase(),
    )
    .join("|||")
}

function createCombinations(
  groups: OptionGroup[],
) {
  const activeGroups =
    groups.filter(
      (group) =>
        group.name.trim() &&
        group.values.length >
          0,
    )

  if (
    activeGroups.length === 0
  ) {
    return []
  }

  let combinations: string[][] =
    [[]]

  for (const group of activeGroups) {
    const next: string[][] = []

    for (const existing of combinations) {
      for (const value of group.values) {
        next.push([
          ...existing,
          value,
        ])
      }
    }

    combinations = next
  }

  return combinations
}

function extractOptions(
  variants: VariantRow[],
): OptionGroup[] {
  const groups = [
    emptyOption(),
    emptyOption(),
    emptyOption(),
  ]

  const configs = [
    {
      name: "option1_name",
      value:
        "option1_value",
    },
    {
      name: "option2_name",
      value:
        "option2_value",
    },
    {
      name: "option3_name",
      value:
        "option3_value",
    },
  ] as const

  configs.forEach(
    (config, index) => {
      const names =
        variants
          .map(
            (variant) =>
              variant[
                config.name
              ],
          )
          .filter(Boolean)

      const firstName =
        names[0] ?? ""

      const values: string[] =
        []

      for (const variant of variants) {
        const value =
          variant[
            config.value
          ]

        if (
          value &&
          !values.includes(
            value,
          )
        ) {
          values.push(
            value,
          )
        }
      }

      groups[index] = {
        name: firstName,
        values,
        draftValue: "",
      }
    },
  )

  return groups
}

export default function VariantEditor({
  productId,
  productName,
  baseSku = "",
  basePrice = "",
  baseCompareAtPrice = "",
  baseCost = "",
  productImages = [],
}: VariantEditorProps) {
  const [
    options,
    setOptions,
  ] = useState<OptionGroup[]>([
    emptyOption(),
    emptyOption(),
    emptyOption(),
  ])

  const [
    variants,
    setVariants,
  ] = useState<VariantRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState("")

  const [success, setSuccess] =
    useState("")

  const [
    bulkPrice,
    setBulkPrice,
  ] = useState("")

  const [
    bulkCost,
    setBulkCost,
  ] = useState("")

  const [
    bulkInventory,
    setBulkInventory,
  ] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

      try {
        const response =
          await fetch(
            `/api/admin/store/products/${productId}/variants`,
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
              "Unable to load variants.",
          )
        }

        const loaded: VariantRow[] =
          (
            data.variants ??
            []
          ).map(
            (
              variant: Record<
                string,
                unknown
              >,
              index: number,
            ) => ({
              id:
                typeof variant.id ===
                "string"
                  ? variant.id
                  : null,

              name:
                String(
                  variant.name ??
                    "",
                ),

              sku:
                String(
                  variant.sku ??
                    "",
                ),

              upc:
                String(
                  variant.upc ??
                    "",
                ),

              option1_name:
                String(
                  variant.option1_name ??
                    "",
                ),

              option1_value:
                String(
                  variant.option1_value ??
                    "",
                ),

              option2_name:
                String(
                  variant.option2_name ??
                    "",
                ),

              option2_value:
                String(
                  variant.option2_value ??
                    "",
                ),

              option3_name:
                String(
                  variant.option3_name ??
                    "",
                ),

              option3_value:
                String(
                  variant.option3_value ??
                    "",
                ),

              price:
                String(
                  variant.price ??
                    "",
                ),

              compare_at_price:
                String(
                  variant.compare_at_price ??
                    "",
                ),

              cost:
                String(
                  variant.cost ??
                    "",
                ),

              inventory_quantity:
                String(
                  variant.inventory_quantity ??
                    0,
                ),

              image_url:
                String(
                  variant.image_url ??
                    "",
                ),

              active:
                variant.active !==
                false,

              sort_order:
                Number(
                  variant.sort_order ??
                    index,
                ),
            }),
          )

        if (!cancelled) {
          setVariants(
            loaded,
          )

          if (
            loaded.length >
            0
          ) {
            setOptions(
              extractOptions(
                loaded,
              ),
            )
          }
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof
              Error
              ? error.message
              : "Unable to load variants.",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [productId])

  const combinationCount =
    useMemo(
      () =>
        createCombinations(
          options,
        ).length,
      [options],
    )

  const totalInventory =
    useMemo(
      () =>
        variants.reduce(
          (
            total,
            variant,
          ) =>
            total +
            (variant.active
              ? Number(
                  variant.inventory_quantity ||
                    0,
                )
              : 0),
          0,
        ),
      [variants],
    )

  function updateOptionName(
    index: number,
    name: string,
  ) {
    setOptions(
      (current) =>
        current.map(
          (
            option,
            optionIndex,
          ) =>
            optionIndex ===
            index
              ? {
                  ...option,
                  name,
                }
              : option,
        ),
    )
  }

  function updateDraftValue(
    index: number,
    value: string,
  ) {
    setOptions(
      (current) =>
        current.map(
          (
            option,
            optionIndex,
          ) =>
            optionIndex ===
            index
              ? {
                  ...option,
                  draftValue:
                    value,
                }
              : option,
        ),
    )
  }

  function addOptionValue(
    index: number,
  ) {
    setOptions(
      (current) =>
        current.map(
          (
            option,
            optionIndex,
          ) => {
            if (
              optionIndex !==
              index
            ) {
              return option
            }

            const value =
              option.draftValue.trim()

            if (!value) {
              return option
            }

            const exists =
              option.values.some(
                (
                  existing,
                ) =>
                  existing.toLowerCase() ===
                  value.toLowerCase(),
              )

            if (exists) {
              return {
                ...option,
                draftValue:
                  "",
              }
            }

            return {
              ...option,

              values: [
                ...option.values,
                value,
              ],

              draftValue: "",
            }
          },
        ),
    )
  }

  function removeOptionValue(
    optionIndex: number,
    value: string,
  ) {
    setOptions(
      (current) =>
        current.map(
          (
            option,
            index,
          ) =>
            index ===
            optionIndex
              ? {
                  ...option,

                  values:
                    option.values.filter(
                      (
                        existing,
                      ) =>
                        existing !==
                        value,
                    ),
                }
              : option,
        ),
    )
  }

  function clearOption(
    index: number,
  ) {
    setOptions(
      (current) =>
        current.map(
          (
            option,
            optionIndex,
          ) =>
            optionIndex ===
            index
              ? emptyOption()
              : option,
        ),
    )
  }

  function generateVariants() {
    setError("")
    setSuccess("")

    const activeOptions =
      options.filter(
        (option) =>
          option.name.trim() &&
          option.values.length >
            0,
      )

    if (
      activeOptions.length ===
      0
    ) {
      setError(
        "Add at least one option name and value before generating variants.",
      )
      return
    }

    const combinations =
      createCombinations(
        options,
      )

    const existingMap =
      new Map<
        string,
        VariantRow
      >()

    for (const variant of variants) {
      const values = [
        variant.option1_value,
        variant.option2_value,
        variant.option3_value,
      ].filter(Boolean)

      existingMap.set(
        combinationKey(
          values,
        ),
        variant,
      )
    }

    const generated =
      combinations.map(
        (
          combination,
          index,
        ) => {
          const existing =
            existingMap.get(
              combinationKey(
                combination,
              ),
            )

          const option1 =
            activeOptions[0]

          const option2 =
            activeOptions[1]

          const option3 =
            activeOptions[2]

          const values =
            combination.filter(
              Boolean,
            )

          const generatedName =
            values.join(" / ")

          if (existing) {
            return {
              ...existing,

              name:
                generatedName,

              option1_name:
                option1?.name ??
                "",

              option1_value:
                combination[0] ??
                "",

              option2_name:
                option2?.name ??
                "",

              option2_value:
                combination[1] ??
                "",

              option3_name:
                option3?.name ??
                "",

              option3_value:
                combination[2] ??
                "",

              sort_order:
                index,
            }
          }

          return {
            id: null,

            name:
              generatedName,

            sku: "",

            upc: "",

            option1_name:
              option1?.name ??
              "",

            option1_value:
              combination[0] ??
              "",

            option2_name:
              option2?.name ??
              "",

            option2_value:
              combination[1] ??
              "",

            option3_name:
              option3?.name ??
              "",

            option3_value:
              combination[2] ??
              "",

            price:
              basePrice,

            compare_at_price:
              baseCompareAtPrice,

            cost:
              baseCost,

            inventory_quantity:
              "0",

            image_url: "",

            active: true,

            sort_order:
              index,
          } satisfies VariantRow
        },
      )

    setVariants(
      generated,
    )

    setSuccess(
      `${generated.length} variant${
        generated.length ===
        1
          ? ""
          : "s"
      } generated.`,
    )
  }

  function updateVariant<
    K extends keyof VariantRow,
  >(
    index: number,
    field: K,
    value: VariantRow[K],
  ) {
    setVariants(
      (current) =>
        current.map(
          (
            variant,
            variantIndex,
          ) =>
            variantIndex ===
            index
              ? {
                  ...variant,
                  [field]:
                    value,
                }
              : variant,
        ),
    )
  }

  function removeVariant(
    index: number,
  ) {
    setVariants(
      (current) =>
        current.filter(
          (
            _variant,
            variantIndex,
          ) =>
            variantIndex !==
            index,
        ),
    )
  }

  function applyBulkPrice() {
    if (
      bulkPrice.trim() ===
      ""
    ) {
      return
    }

    setVariants(
      (current) =>
        current.map(
          (variant) => ({
            ...variant,
            price:
              bulkPrice,
          }),
        ),
    )
  }

  function applyBulkCost() {
    if (
      bulkCost.trim() ===
      ""
    ) {
      return
    }

    setVariants(
      (current) =>
        current.map(
          (variant) => ({
            ...variant,
            cost:
              bulkCost,
          }),
        ),
    )
  }

  function applyBulkInventory() {
    if (
      bulkInventory.trim() ===
      ""
    ) {
      return
    }

    setVariants(
      (current) =>
        current.map(
          (variant) => ({
            ...variant,

            inventory_quantity:
              bulkInventory,
          }),
        ),
    )
  }

  function generateSkus() {
    const root =
      normalizeSkuPart(
        baseSku ||
          productName,
      ) || "PRODUCT"

    setVariants(
      (current) =>
        current.map(
          (
            variant,
            index,
          ) => {
            const parts = [
              variant.option1_value,
              variant.option2_value,
              variant.option3_value,
            ]
              .filter(Boolean)
              .map(
                normalizeSkuPart,
              )
              .filter(Boolean)

            const suffix =
              parts.join("-") ||
              String(
                index + 1,
              )

            return {
              ...variant,

              sku:
                `${root}-${suffix}`,
            }
          },
        ),
    )
  }

  function setAllActive(
    active: boolean,
  ) {
    setVariants(
      (current) =>
        current.map(
          (variant) => ({
            ...variant,
            active,
          }),
        ),
    )
  }

  async function saveVariants() {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      for (
        let index = 0;
        index <
        variants.length;
        index++
      ) {
        const variant =
          variants[index]

        if (
          !variant.name.trim()
        ) {
          throw new Error(
            `Variant ${
              index + 1
            } needs a name.`,
          )
        }

        if (
          variant.price.trim() ===
          ""
        ) {
          throw new Error(
            `${variant.name} needs a selling price.`,
          )
        }

        const price =
          Number(
            variant.price,
          )

        if (
          !Number.isFinite(
            price,
          ) ||
          price < 0
        ) {
          throw new Error(
            `${variant.name} has an invalid selling price.`,
          )
        }

        const inventory =
          Number(
            variant.inventory_quantity ||
              0,
          )

        if (
          !Number.isFinite(
            inventory,
          ) ||
          inventory < 0
        ) {
          throw new Error(
            `${variant.name} has invalid inventory.`,
          )
        }
      }

      const response =
        await fetch(
          `/api/admin/store/products/${productId}/variants`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                variants:
                  variants.map(
                    (
                      variant,
                      index,
                    ) => ({
                      ...variant,

                      sort_order:
                        index,

                      price:
                        Number(
                          variant.price,
                        ),

                      compare_at_price:
                        variant.compare_at_price ===
                        ""
                          ? null
                          : Number(
                              variant.compare_at_price,
                            ),

                      cost:
                        variant.cost ===
                        ""
                          ? null
                          : Number(
                              variant.cost,
                            ),

                      inventory_quantity:
                        Number(
                          variant.inventory_quantity ||
                            0,
                        ),
                    }),
                  ),
              }),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to save variants.",
        )
      }

      const saved: VariantRow[] =
        (
          data.variants ??
          []
        ).map(
          (
            variant: Record<
              string,
              unknown
            >,
            index: number,
          ) => ({
            id:
              String(
                variant.id ??
                  "",
              ),

            name:
              String(
                variant.name ??
                  "",
              ),

            sku:
              String(
                variant.sku ??
                  "",
              ),

            upc:
              String(
                variant.upc ??
                  "",
              ),

            option1_name:
              String(
                variant.option1_name ??
                  "",
              ),

            option1_value:
              String(
                variant.option1_value ??
                  "",
              ),

            option2_name:
              String(
                variant.option2_name ??
                  "",
              ),

            option2_value:
              String(
                variant.option2_value ??
                  "",
              ),

            option3_name:
              String(
                variant.option3_name ??
                  "",
              ),

            option3_value:
              String(
                variant.option3_value ??
                  "",
              ),

            price:
              String(
                variant.price ??
                  "",
              ),

            compare_at_price:
              String(
                variant.compare_at_price ??
                  "",
              ),

            cost:
              String(
                variant.cost ??
                  "",
              ),

            inventory_quantity:
              String(
                variant.inventory_quantity ??
                  0,
              ),

            image_url:
              String(
                variant.image_url ??
                  "",
              ),

            active:
              variant.active !==
              false,

            sort_order:
              Number(
                variant.sort_order ??
                  index,
              ),
          }),
        )

      setVariants(saved)

      setSuccess(
        "Variants saved successfully.",
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save variants.",
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border bg-muted/10">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-rose-500" />

          <p className="mt-3 text-sm text-muted-foreground">
            Loading variants...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />

          {success}
        </div>
      )}

      {/* OPTION BUILDER */}

      <div className="rounded-xl border bg-muted/10 p-4 sm:p-5">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-black">
              Variant Options
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Add up to three option
              groups, then generate all
              combinations.
            </p>
          </div>

          <Badge variant="secondary">
            {combinationCount}{" "}
            possible{" "}
            {combinationCount ===
            1
              ? "variant"
              : "variants"}
          </Badge>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {options.map(
            (
              option,
              optionIndex,
            ) => (
              <div
                key={
                  optionIndex
                }
                className="rounded-xl border bg-background p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Label>
                    Option{" "}
                    {optionIndex +
                      1}
                  </Label>

                  {(option.name ||
                    option.values
                      .length >
                      0) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        clearOption(
                          optionIndex,
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <Input
                  value={
                    option.name
                  }
                  onChange={(
                    event,
                  ) =>
                    updateOptionName(
                      optionIndex,
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    optionIndex ===
                    0
                      ? "Size"
                      : optionIndex ===
                          1
                        ? "Style"
                        : "Color / Design"
                  }
                />

                <div className="mt-3 flex gap-2">
                  <Input
                    value={
                      option.draftValue
                    }
                    onChange={(
                      event,
                    ) =>
                      updateDraftValue(
                        optionIndex,
                        event.target
                          .value,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault()

                        addOptionValue(
                          optionIndex,
                        )
                      }
                    }}
                    placeholder="Add value..."
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      addOptionValue(
                        optionIndex,
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {option.values
                  .length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.values.map(
                      (value) => (
                        <Badge
                          key={
                            value
                          }
                          variant="secondary"
                          className="gap-1 py-1.5"
                        >
                          {value}

                          <button
                            type="button"
                            onClick={() =>
                              removeOptionValue(
                                optionIndex,
                                value,
                              )
                            }
                            className="ml-1 rounded-full hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ),
                    )}
                  </div>
                )}
              </div>
            ),
          )}
        </div>

        <div className="mt-5">
          <Button
            type="button"
            onClick={
              generateVariants
            }
            className="bg-violet-600 text-white hover:bg-violet-500"
          >
            <WandSparkles className="mr-2 h-4 w-4" />
            Generate Variants
          </Button>
        </div>
      </div>

      {/* BULK EDITOR */}

      {variants.length > 0 && (
        <div className="rounded-xl border bg-muted/10 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="font-black">
              Bulk Editing
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Apply common values to
              every generated variant.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <BulkField
              icon={
                <DollarSign className="h-4 w-4" />
              }
              label="Selling Price"
              value={bulkPrice}
              onChange={
                setBulkPrice
              }
              onApply={
                applyBulkPrice
              }
              placeholder={
                basePrice ||
                "54.99"
              }
            />

            <BulkField
              icon={
                <DollarSign className="h-4 w-4" />
              }
              label="Cost"
              value={bulkCost}
              onChange={
                setBulkCost
              }
              onApply={
                applyBulkCost
              }
              placeholder={
                baseCost ||
                "30.00"
              }
            />

            <BulkField
              icon={
                <Boxes className="h-4 w-4" />
              }
              label="Inventory"
              value={
                bulkInventory
              }
              onChange={
                setBulkInventory
              }
              onApply={
                applyBulkInventory
              }
              placeholder="5"
              integer
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={
                generateSkus
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate SKUs
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAllActive(
                  true,
                )
              }
            >
              Activate All
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAllActive(
                  false,
                )
              }
            >
              Deactivate All
            </Button>
          </div>
        </div>
      )}

      {/* VARIANT ROWS */}

      {variants.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-black">
                Generated Variants
              </h3>

              <p className="text-sm text-muted-foreground">
                {
                  variants.length
                }{" "}
                variants ·{" "}
                {totalInventory}{" "}
                active units
              </p>
            </div>

            <Button
              type="button"
              onClick={
                saveVariants
              }
              disabled={saving}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              Save Variants
            </Button>
          </div>

          {variants.map(
            (
              variant,
              index,
            ) => (
              <VariantCard
                key={
                  variant.id ??
                  `${variant.name}-${index}`
                }
                variant={
                  variant
                }
                index={index}
                productImages={
                  productImages
                }
                onChange={
                  updateVariant
                }
                onRemove={() =>
                  removeVariant(
                    index,
                  )
                }
              />
            ),
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={
                saveVariants
              }
              disabled={saving}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              Save Variants
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <PackagePlus className="mx-auto h-9 w-9 text-muted-foreground" />

          <p className="mt-3 font-bold">
            No variants yet
          </p>

          <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
            Add options above and
            generate combinations. For
            example: Size × Style ×
            Design.
          </p>
        </div>
      )}
    </div>
  )
}

function VariantCard({
  variant,
  index,
  productImages,
  onChange,
  onRemove,
}: {
  variant: VariantRow
  index: number
  productImages: string[]
  onChange: <
    K extends keyof VariantRow,
  >(
    index: number,
    field: K,
    value: VariantRow[K],
  ) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 font-black text-violet-500">
            {index + 1}
          </div>

          <div>
            <p className="font-black">
              {variant.name}
            </p>

            <div className="mt-1 flex flex-wrap gap-1.5">
              {variant.option1_value && (
                <Badge variant="secondary">
                  {
                    variant.option1_value
                  }
                </Badge>
              )}

              {variant.option2_value && (
                <Badge variant="secondary">
                  {
                    variant.option2_value
                  }
                </Badge>
              )}

              {variant.option3_value && (
                <Badge variant="secondary">
                  {
                    variant.option3_value
                  }
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Active
            </span>

            <Switch
              checked={
                variant.active
              }
              onCheckedChange={(
                checked,
              ) =>
                onChange(
                  index,
                  "active",
                  checked,
                )
              }
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={
              onRemove
            }
            className="text-red-500 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <VariantField label="SKU">
          <Input
            value={
              variant.sku
            }
            onChange={(
              event,
            ) =>
              onChange(
                index,
                "sku",
                event.target.value,
              )
            }
            placeholder="SKU"
          />
        </VariantField>

        <VariantField label="UPC">
          <Input
            value={
              variant.upc
            }
            onChange={(
              event,
            ) =>
              onChange(
                index,
                "upc",
                event.target.value,
              )
            }
            placeholder="UPC"
          />
        </VariantField>

        <VariantField label="Cost">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={
              variant.cost
            }
            onChange={(
              event,
            ) =>
              onChange(
                index,
                "cost",
                event.target.value,
              )
            }
            placeholder="0.00"
          />
        </VariantField>

        <VariantField label="Selling Price">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={
              variant.price
            }
            onChange={(
              event,
            ) =>
              onChange(
                index,
                "price",
                event.target.value,
              )
            }
            placeholder="0.00"
          />
        </VariantField>

        <VariantField label="MSRP / Compare At">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={
              variant.compare_at_price
            }
            onChange={(
              event,
            ) =>
              onChange(
                index,
                "compare_at_price",
                event.target.value,
              )
            }
            placeholder="0.00"
          />
        </VariantField>

        <VariantField label="Inventory">
          <Input
            type="number"
            min="0"
            step="1"
            value={
              variant.inventory_quantity
            }
            onChange={(
              event,
            ) =>
              onChange(
                index,
                "inventory_quantity",
                event.target.value,
              )
            }
          />
        </VariantField>

        <div className="md:col-span-2">
          <VariantField label="Variant Image URL">
            <Input
              type="url"
              value={
                variant.image_url
              }
              onChange={(
                event,
              ) =>
                onChange(
                  index,
                  "image_url",
                  event.target.value,
                )
              }
              placeholder="https://..."
            />
          </VariantField>

          {productImages.length >
            0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Or choose one of the
                product images:
              </p>

              <div className="flex flex-wrap gap-2">
                {productImages.map(
                  (
                    image,
                    imageIndex,
                  ) => (
                    <button
                      type="button"
                      key={
                        image
                      }
                      onClick={() =>
                        onChange(
                          index,
                          "image_url",
                          image,
                        )
                      }
                      className={`relative h-16 w-16 overflow-hidden rounded-lg border bg-white p-1 ${
                        variant.image_url ===
                        image
                          ? "ring-2 ring-rose-500"
                          : ""
                      }`}
                    >
                      <img
                        src={
                          image
                        }
                        alt={`Product image ${
                          imageIndex +
                          1
                        }`}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {variant.image_url && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border bg-muted/10 p-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
            <img
              src={
                variant.image_url
              }
              alt={
                variant.name
              }
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold">
              <ImageIcon className="h-4 w-4" />
              Variant Image
            </p>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              {
                variant.image_url
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function BulkField({
  icon,
  label,
  value,
  onChange,
  onApply,
  placeholder,
  integer = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
  onApply: () => void
  placeholder: string
  integer?: boolean
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>

      <div className="mt-3 flex gap-2">
        <Input
          type="number"
          min="0"
          step={
            integer
              ? "1"
              : "0.01"
          }
          value={value}
          onChange={(
            event,
          ) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={
            placeholder
          }
        />

        <Button
          type="button"
          variant="outline"
          onClick={
            onApply
          }
        >
          Apply
        </Button>
      </div>
    </div>
  )
}

function VariantField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}