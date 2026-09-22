import {
  NextRequest,
  NextResponse,
} from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

import {
  normalizeLookup,
  parseCsv,
  STORE_CSV_COLUMNS,
  type ImportPreviewRow,
} from "@/lib/store-csv"

type ExistingProduct = {
  id: string
  name: string
  slug: string

  sku: string | null
  upc: string | null
}

type StoreCategory = {
  id: string
  name: string
  slug: string
  parent_id: string | null
}

function clean(
  value:
    | string
    | undefined,
) {
  return (
    value?.trim() ?? ""
  )
}

function splitPipe(
  value:
    | string
    | undefined,
) {
  return [
    ...new Set(
      (value ?? "")
        .split("|")
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean),
    ),
  ]
}

function categoryPath(
  category: StoreCategory,
  categoryMap: Map<
    string,
    StoreCategory
  >,
) {
  const parts = [
    category.name,
  ]

  const visited =
    new Set<string>()

  let current =
    category

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

    parts.unshift(
      parent.name,
    )

    current = parent
  }

  return parts.join(" > ")
}

export async function POST(
  request: NextRequest,
) {
  const gate =
    await requireAdmin()

  if (
    gate instanceof
    NextResponse
  ) {
    return gate
  }

  try {
    const formData =
      await request.formData()

    const file =
      formData.get("file")

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a CSV file to import.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      return NextResponse.json(
        {
          error:
            "The import file must be a CSV.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          error:
            "CSV files are limited to 10 MB.",
        },
        {
          status: 400,
        },
      )
    }

    const text =
      await file.text()

    const {
      headers,
      rows,
    } = parseCsv(text)

    if (
      headers.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The CSV does not contain a header row.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The CSV does not contain any product rows.",
        },
        {
          status: 400,
        },
      )
    }

    if (
      rows.length > 5000
    ) {
      return NextResponse.json(
        {
          error:
            "A single import is limited to 5,000 products.",
        },
        {
          status: 400,
        },
      )
    }

    const requiredHeaders = [
      "name",
      "product_type",
      "primary_category",
      "price",
    ]

    const missingHeaders =
      requiredHeaders.filter(
        (header) =>
          !headers.includes(
            header,
          ),
      )

    if (
      missingHeaders.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            `Missing required CSV columns: ${missingHeaders.join(
              ", ",
            )}`,
        },
        {
          status: 400,
        },
      )
    }

    const unknownHeaders =
      headers.filter(
        (header) =>
          !STORE_CSV_COLUMNS.includes(
            header as
              (typeof STORE_CSV_COLUMNS)[number],
          ),
      )

    const supabase =
      createAdminClient()

    const [
      productsResult,
      categoriesResult,
    ] = await Promise.all([
      supabase
        .from(
          "store_products",
        )
        .select(
          "id,name,slug,sku,upc",
        ),

      supabase
        .from(
          "store_categories",
        )
        .select(
          "id,name,slug,parent_id",
        )
        .eq(
          "active",
          true,
        ),
    ])

    if (
      productsResult.error
    ) {
      console.error(
        "Store import preview products error:",
        productsResult.error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load existing products.",
        },
        {
          status: 500,
        },
      )
    }

    if (
      categoriesResult.error
    ) {
      console.error(
        "Store import preview categories error:",
        categoriesResult.error,
      )

      return NextResponse.json(
        {
          error:
            "Unable to load store categories.",
        },
        {
          status: 500,
        },
      )
    }

    const products =
      (productsResult.data ??
        []) as ExistingProduct[]

    const categories =
      (categoriesResult.data ??
        []) as StoreCategory[]

    const productsById =
      new Map<
        string,
        ExistingProduct
      >()

    const productsBySku =
      new Map<
        string,
        ExistingProduct
      >()

    const productsByUpc =
      new Map<
        string,
        ExistingProduct
      >()

    const productsBySlug =
      new Map<
        string,
        ExistingProduct
      >()

    for (
      const product
      of products
    ) {
      productsById.set(
        product.id,
        product,
      )

      if (product.sku) {
        productsBySku.set(
          normalizeLookup(
            product.sku,
          ),
          product,
        )
      }

      if (product.upc) {
        productsByUpc.set(
          normalizeLookup(
            product.upc,
          ),
          product,
        )
      }

      productsBySlug.set(
        normalizeLookup(
          product.slug,
        ),
        product,
      )
    }

    const categoryMap =
      new Map<
        string,
        StoreCategory
      >()

    for (
      const category
      of categories
    ) {
      categoryMap.set(
        category.id,
        category,
      )
    }

    const categoriesByPath =
      new Map<
        string,
        StoreCategory
      >()

    const categoriesBySlug =
      new Map<
        string,
        StoreCategory
      >()

    const categoriesByName =
      new Map<
        string,
        StoreCategory[]
      >()

    for (
      const category
      of categories
    ) {
      const path =
        categoryPath(
          category,
          categoryMap,
        )

      categoriesByPath.set(
        normalizeLookup(
          path,
        ),
        category,
      )

      categoriesBySlug.set(
        normalizeLookup(
          category.slug,
        ),
        category,
      )

      const nameKey =
        normalizeLookup(
          category.name,
        )

      const sameName =
        categoriesByName.get(
          nameKey,
        ) ?? []

      sameName.push(
        category,
      )

      categoriesByName.set(
        nameKey,
        sameName,
      )
    }

    function resolveCategory(
      value: string,
    ) {
      const key =
        normalizeLookup(
          value,
        )

      if (!key) {
        return {
          category: null,
          error:
            "Category is empty.",
        }
      }

      const byPath =
        categoriesByPath.get(
          key,
        )

      if (byPath) {
        return {
          category: byPath,
          error: null,
        }
      }

      const bySlug =
        categoriesBySlug.get(
          key,
        )

      if (bySlug) {
        return {
          category: bySlug,
          error: null,
        }
      }

      const byName =
        categoriesByName.get(
          key,
        ) ?? []

      if (
        byName.length === 1
      ) {
        return {
          category:
            byName[0],
          error: null,
        }
      }

      if (
        byName.length > 1
      ) {
        return {
          category: null,
          error:
            `Category "${value}" is ambiguous. Use its full hierarchy path.`,
        }
      }

      return {
        category: null,
        error:
          `Category "${value}" does not exist or is inactive.`,
      }
    }

    const previewRows:
      ImportPreviewRow[] =
        rows.map(
          (
            row,
            index,
          ) => {
            const rowNumber =
              index + 2

            const errors:
              string[] = []

            const warnings:
              string[] = []

            const name =
              clean(row.name)

            const sku =
              clean(row.sku) ||
              null

            const upc =
              clean(row.upc) ||
              null

            const slug =
              clean(row.slug) ||
              null

            if (!name) {
              errors.push(
                "Product name is required.",
              )
            }

            if (
              !clean(
                row.product_type,
              )
            ) {
              errors.push(
                "Product type is required.",
              )
            }

            const price =
              Number(
                row.price,
              )

            if (
              row.price ===
                undefined ||
              row.price.trim() ===
                "" ||
              !Number.isFinite(
                price,
              ) ||
              price < 0
            ) {
              errors.push(
                "A valid selling price is required.",
              )
            }

            const primary =
              clean(
                row.primary_category,
              )

            if (!primary) {
              errors.push(
                "Primary category is required.",
              )
            } else {
              const resolved =
                resolveCategory(
                  primary,
                )

              if (
                resolved.error
              ) {
                errors.push(
                  resolved.error,
                )
              }
            }

            const additional =
              splitPipe(
                row.additional_categories,
              )

            for (
              const category
              of additional
            ) {
              const resolved =
                resolveCategory(
                  category,
                )

              if (
                resolved.error
              ) {
                errors.push(
                  resolved.error,
                )
              }
            }

            const status =
              clean(
                row.status,
              )

            if (
              status &&
              ![
                "draft",
                "active",
                "sold_out",
                "archived",
              ].includes(
                status,
              )
            ) {
              errors.push(
                `Invalid status "${status}".`,
              )
            }

            const allowSingle =
              ![
                "false",
                "0",
                "no",
              ].includes(
                clean(
                  row.allow_single_purchase,
                ).toLowerCase(),
              )

            const allowCase =
              [
                "true",
                "1",
                "yes",
              ].includes(
                clean(
                  row.allow_case_purchase,
                ).toLowerCase(),
              )

            if (
              !allowSingle &&
              !allowCase
            ) {
              errors.push(
                "Single or case purchasing must be enabled.",
              )
            }

            if (allowCase) {
              const units =
                Number(
                  row.units_per_case,
                )

              const casePrice =
                Number(
                  row.case_price,
                )

              if (
                !Number.isFinite(
                  units,
                ) ||
                units < 1
              ) {
                errors.push(
                  "Units per case must be at least 1.",
                )
              }

              if (
                row.case_price ===
                  undefined ||
                row.case_price.trim() ===
                  "" ||
                !Number.isFinite(
                  casePrice,
                ) ||
                casePrice < 0
              ) {
                errors.push(
                  "Case selling price is required when case purchasing is enabled.",
                )
              }
            }

            let matched:
              ExistingProduct
              | undefined

            let matchedBy:
              | "id"
              | "sku"
              | "upc"
              | "slug"
              | null =
                null

            const id =
              clean(row.id)

            if (
              id &&
              productsById.has(
                id,
              )
            ) {
              matched =
                productsById.get(
                  id,
                )

              matchedBy =
                "id"
            } else if (
              sku &&
              productsBySku.has(
                normalizeLookup(
                  sku,
                ),
              )
            ) {
              matched =
                productsBySku.get(
                  normalizeLookup(
                    sku,
                  ),
                )

              matchedBy =
                "sku"
            } else if (
              upc &&
              productsByUpc.has(
                normalizeLookup(
                  upc,
                ),
              )
            ) {
              matched =
                productsByUpc.get(
                  normalizeLookup(
                    upc,
                  ),
                )

              matchedBy =
                "upc"
            } else if (
              slug &&
              productsBySlug.has(
                normalizeLookup(
                  slug,
                ),
              )
            ) {
              matched =
                productsBySlug.get(
                  normalizeLookup(
                    slug,
                  ),
                )

              matchedBy =
                "slug"
            }

            if (
              id &&
              !productsById.has(
                id,
              )
            ) {
              warnings.push(
                "CSV product ID was not found; SKU, UPC or slug matching was attempted instead.",
              )
            }

            return {
              rowNumber,

              action:
                errors.length >
                0
                  ? "error"
                  : matched
                    ? "update"
                    : "new",

              matchId:
                matched?.id ??
                null,

              matchedBy,

              name:
                name ||
                "(Unnamed product)",

              sku,
              upc,
              slug,

              errors,
              warnings,

              data: row,
            }
          },
        )

    const summary = {
      total:
        previewRows.length,

      new:
        previewRows.filter(
          (row) =>
            row.action ===
            "new",
        ).length,

      update:
        previewRows.filter(
          (row) =>
            row.action ===
            "update",
        ).length,

      error:
        previewRows.filter(
          (row) =>
            row.action ===
            "error",
        ).length,
    }

    return NextResponse.json({
      fileName:
        file.name,

      unknownHeaders,

      summary,

      rows:
        previewRows,
    })
  } catch (error) {
    console.error(
      "Store import preview exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to preview the product import.",
      },
      {
        status: 500,
      },
    )
  }
}