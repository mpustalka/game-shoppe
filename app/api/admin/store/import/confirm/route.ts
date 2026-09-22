import {
  NextRequest,
  NextResponse,
} from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { slugifyProductName } from "@/lib/store"

import {
  csvBoolean,
  csvInteger,
  csvNullableNumber,
  csvNullableString,
  normalizeLookup,
  splitPipeList,
  type CsvRow,
} from "@/lib/store-csv"

type ConfirmRequest = {
  rows?: Array<{
    rowNumber: number
    action:
      | "new"
      | "update"
      | "error"
    matchId: string | null
    data: CsvRow
  }>
}

type ExistingProduct = {
  id: string
  name: string
  slug: string
  sku: string | null
  upc: string | null
  has_variants: boolean
}

type StoreCategory = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  active: boolean
}

type ImportResult = {
  rowNumber: number
  action:
    | "created"
    | "updated"
    | "failed"
  productId: string | null
  name: string
  message: string
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

function normalizeDate(
  value: unknown,
) {
  const cleaned =
    csvNullableString(value)

  if (!cleaned) {
    return null
  }

  return cleaned
}

function normalizeImageUrls(
  value: unknown,
) {
  return splitPipeList(value)
}

function normalizeStringArray(
  value: unknown,
) {
  return splitPipeList(value)
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
    const body =
      (await request.json()) as ConfirmRequest

    const rows =
      Array.isArray(body.rows)
        ? body.rows
        : []

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "There are no products to import.",
        },
        {
          status: 400,
        },
      )
    }

    if (rows.length > 5000) {
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

    if (
      rows.some(
        (row) =>
          row.action ===
          "error",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The import contains validation errors. Preview and correct the CSV before confirming.",
        },
        {
          status: 400,
        },
      )
    }

    const supabase =
      createAdminClient()

    /*
     * IMPORTANT:
     * Reload everything needed
     * from the database.
     *
     * We do not trust match IDs
     * or category IDs supplied
     * by the browser.
     */
    const [
      productsResult,
      categoriesResult,
    ] = await Promise.all([
      supabase
        .from("store_products")
        .select(
          "id,name,slug,sku,upc,has_variants",
        ),

      supabase
        .from("store_categories")
        .select(
          "id,name,slug,parent_id,active",
        ),
    ])

    if (productsResult.error) {
      console.error(
        "Import confirm products error:",
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

    if (categoriesResult.error) {
      console.error(
        "Import confirm categories error:",
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

    const existingProducts =
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
      of existingProducts
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
      if (!category.active) {
        continue
      }

      const path =
        categoryPath(
          category,
          categoryMap,
        )

      categoriesByPath.set(
        normalizeLookup(path),
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
        normalizeLookup(value)

      if (!key) {
        throw new Error(
          "Primary category is required.",
        )
      }

      const pathMatch =
        categoriesByPath.get(
          key,
        )

      if (pathMatch) {
        return pathMatch
      }

      const slugMatch =
        categoriesBySlug.get(
          key,
        )

      if (slugMatch) {
        return slugMatch
      }

      const nameMatches =
        categoriesByName.get(
          key,
        ) ?? []

      if (
        nameMatches.length === 1
      ) {
        return nameMatches[0]
      }

      if (
        nameMatches.length > 1
      ) {
        throw new Error(
          `Category "${value}" is ambiguous. Use the complete category path.`,
        )
      }

      throw new Error(
        `Category "${value}" does not exist or is inactive.`,
      )
    }

    function findExistingProduct(
      row: CsvRow,
    ) {
      const id =
        csvNullableString(
          row.id,
        )

      if (
        id &&
        productsById.has(id)
      ) {
        return productsById.get(
          id,
        )!
      }

      const sku =
        csvNullableString(
          row.sku,
        )

      if (sku) {
        const match =
          productsBySku.get(
            normalizeLookup(sku),
          )

        if (match) {
          return match
        }
      }

      const upc =
        csvNullableString(
          row.upc,
        )

      if (upc) {
        const match =
          productsByUpc.get(
            normalizeLookup(upc),
          )

        if (match) {
          return match
        }
      }

      const slug =
        csvNullableString(
          row.slug,
        )

      if (slug) {
        const match =
          productsBySlug.get(
            normalizeLookup(slug),
          )

        if (match) {
          return match
        }
      }

      return null
    }

    const results:
      ImportResult[] = []

    /*
     * Sequential processing is
     * intentional.
     *
     * This avoids firing hundreds
     * of simultaneous Supabase
     * writes and gives us a clean
     * result for every CSV row.
     */
    for (const row of rows) {
      const csv =
        row.data

      const rowNumber =
        Number(
          row.rowNumber,
        )

      const name =
        csvNullableString(
          csv.name,
        )

      try {
        if (!name) {
          throw new Error(
            "Product name is required.",
          )
        }

        const productType =
          csvNullableString(
            csv.product_type,
          )

        if (!productType) {
          throw new Error(
            "Product type is required.",
          )
        }

        const price =
          csvNullableNumber(
            csv.price,
          )

        if (
          price === null ||
          price < 0
        ) {
          throw new Error(
            "A valid selling price is required.",
          )
        }

        const primaryCategory =
          resolveCategory(
            csv.primary_category ??
              "",
          )

        const additionalCategories =
          splitPipeList(
            csv.additional_categories,
          ).map(
            resolveCategory,
          )

        const categoryIds = [
          primaryCategory.id,
          ...additionalCategories.map(
            (category) =>
              category.id,
          ),
        ]

        const uniqueCategoryIds =
          [
            ...new Set(
              categoryIds,
            ),
          ]

        const additionalCategoryIds =
          uniqueCategoryIds.filter(
            (id) =>
              id !==
              primaryCategory.id,
          )

        const allowSingle =
          csvBoolean(
            csv.allow_single_purchase,
            true,
          )

        const allowCase =
          csvBoolean(
            csv.allow_case_purchase,
            false,
          )

        if (
          !allowSingle &&
          !allowCase
        ) {
          throw new Error(
            "Single or case purchasing must be enabled.",
          )
        }

        const unitsPerCase =
          csvInteger(
            csv.units_per_case,
            0,
          )

        const casePrice =
          csvNullableNumber(
            csv.case_price,
          )

        if (
          allowCase &&
          unitsPerCase < 1
        ) {
          throw new Error(
            "Units per case must be at least 1.",
          )
        }

        if (
          allowCase &&
          (casePrice === null ||
            casePrice < 0)
        ) {
          throw new Error(
            "Case selling price is required when case purchasing is enabled.",
          )
        }

        const status =
          [
            "draft",
            "active",
            "sold_out",
            "archived",
          ].includes(
            csv.status,
          )
            ? csv.status
            : "draft"

        const imageUrls =
          normalizeImageUrls(
            csv.image_urls,
          )

        const requestedImage =
          csvNullableString(
            csv.image_url,
          )

        const primaryImage =
          requestedImage ??
          imageUrls[0] ??
          null

        const existing =
          findExistingProduct(
            csv,
          )

        /*
         * Existing products keep
         * their actual variant
         * state. CSV does NOT
         * toggle variants.
         */
        const hasVariants =
          existing
            ? existing.has_variants
            : csvBoolean(
                csv.has_variants,
                false,
              )

        const requestedSlug =
          csvNullableString(
            csv.slug,
          ) ??
          slugifyProductName(
            name,
          )

        if (!requestedSlug) {
          throw new Error(
            "Unable to generate product slug.",
          )
        }

        const payload = {
          name,

          slug:
            requestedSlug,

          description:
            csvNullableString(
              csv.description,
            ),

          sku:
            csvNullableString(
              csv.sku,
            ),

          upc:
            csvNullableString(
              csv.upc,
            ),

          category_id:
            primaryCategory.id,

          additional_category_ids:
            additionalCategoryIds,

          product_type:
            productType,

          set_name:
            csvNullableString(
              csv.set_name,
            ),

          set_release_date:
            normalizeDate(
              csv.set_release_date,
            ),

          pokemon_names:
            normalizeStringArray(
              csv.pokemon_names,
            ),

          brand:
            csvNullableString(
              csv.brand,
            ),

          language:
            csvNullableString(
              csv.language,
            ) ??
            "English",

          tags:
            normalizeStringArray(
              csv.tags,
            ),

          distributor:
            csvNullableString(
              csv.distributor,
            ),

          cost:
            csvNullableNumber(
              csv.cost,
            ),

          price,

          compare_at_price:
            csvNullableNumber(
              csv.compare_at_price,
            ),

          inventory_quantity:
            csvInteger(
              csv.inventory_quantity,
              0,
            ),

          max_per_customer:
            csv.max_per_customer
              ?.trim()
              ? Math.max(
                  1,
                  csvInteger(
                    csv.max_per_customer,
                    1,
                  ),
                )
              : null,

          status,

          featured:
            csvBoolean(
              csv.featured,
              false,
            ),

          is_new_arrival:
            csvBoolean(
              csv.is_new_arrival,
              false,
            ),

          is_fall_exclusive:
            csvBoolean(
              csv.is_fall_exclusive,
              false,
            ),

          is_sale:
            csvBoolean(
              csv.is_sale,
              false,
            ),

          is_preorder:
            csvBoolean(
              csv.is_preorder,
              false,
            ),

          release_date:
            normalizeDate(
              csv.release_date,
            ),

          preorder_closes_at:
            csvNullableString(
              csv.preorder_closes_at,
            ),

          has_variants:
            hasVariants,

          allow_single_purchase:
            allowSingle,

          allow_case_purchase:
            allowCase,

          units_per_case:
            allowCase
              ? unitsPerCase
              : null,

          case_cost:
            allowCase
              ? csvNullableNumber(
                  csv.case_cost,
                )
              : null,

          case_price:
            allowCase
              ? casePrice
              : null,

          case_inventory_quantity:
            allowCase
              ? csvInteger(
                  csv.case_inventory_quantity,
                  0,
                )
              : 0,

          weight_oz:
            csvNullableNumber(
              csv.weight_oz,
            ),

          package_length_in:
            csvNullableNumber(
              csv.package_length_in,
            ),

          package_width_in:
            csvNullableNumber(
              csv.package_width_in,
            ),

          package_height_in:
            csvNullableNumber(
              csv.package_height_in,
            ),

          easyship_category:
            csvNullableString(
              csv.easyship_category,
            ),

          case_weight_oz:
            allowCase
              ? csvNullableNumber(
                  csv.case_weight_oz,
                )
              : null,

          case_length_in:
            allowCase
              ? csvNullableNumber(
                  csv.case_length_in,
                )
              : null,

          case_width_in:
            allowCase
              ? csvNullableNumber(
                  csv.case_width_in,
                )
              : null,

          case_height_in:
            allowCase
              ? csvNullableNumber(
                  csv.case_height_in,
                )
              : null,

          shipping_required:
            csvBoolean(
              csv.shipping_required,
              true,
            ),

          image_url:
            primaryImage,

          image_urls:
            imageUrls,
        }

        /*
         * UPDATE
         */
        if (existing) {
          /*
           * Your existing PATCH API
           * intentionally does not
           * update slug.
           *
           * We mirror that behavior
           * here by excluding slug
           * from updatePayload.
           */
          const {
            slug:
              _ignoredSlug,
            ...updatePayload
          } = payload

          const {
            error:
              updateError,
          } = await supabase
            .from(
              "store_products",
            )
            .update(
              updatePayload,
            )
            .eq(
              "id",
              existing.id,
            )

          if (updateError) {
            if (
              updateError.code ===
              "23505"
            ) {
              throw new Error(
                "Another product already uses this SKU or UPC.",
              )
            }

            throw new Error(
              updateError.message,
            )
          }

          /*
           * Synchronize complete
           * category assignments.
           */
          const {
            error:
              deleteError,
          } = await supabase
            .from(
              "store_product_categories",
            )
            .delete()
            .eq(
              "product_id",
              existing.id,
            )

          if (deleteError) {
            throw new Error(
              "Product updated, but old category assignments could not be cleared.",
            )
          }

          const links =
            uniqueCategoryIds.map(
              (
                category_id,
              ) => ({
                product_id:
                  existing.id,

                category_id,
              }),
            )

          const {
            error:
              linkError,
          } = await supabase
            .from(
              "store_product_categories",
            )
            .insert(
              links,
            )

          if (linkError) {
            /*
             * Restore at least the
             * primary relationship.
             */
            await supabase
              .from(
                "store_product_categories",
              )
              .upsert(
                {
                  product_id:
                    existing.id,

                  category_id:
                    primaryCategory.id,
                },
                {
                  onConflict:
                    "product_id,category_id",
                },
              )

            throw new Error(
              "Product updated, but some category assignments could not be saved.",
            )
          }

          results.push({
            rowNumber,
            action:
              "updated",
            productId:
              existing.id,
            name,
            message:
              "Product updated successfully.",
          })

          continue
        }

        /*
         * CREATE
         */
        const {
          additional_category_ids:
            _categoryIds,
          ...createPayload
        } = payload

        const {
          data:
            createdProduct,
          error:
            createError,
        } = await supabase
          .from(
            "store_products",
          )
          .insert(
            createPayload,
          )
          .select("id")
          .single()

        if (
          createError ||
          !createdProduct
        ) {
          if (
            createError?.code ===
            "23505"
          ) {
            throw new Error(
              "A product with this SKU, UPC, or URL slug already exists.",
            )
          }

          throw new Error(
            createError?.message ??
              "Unable to create product.",
          )
        }

        const links =
          uniqueCategoryIds.map(
            (
              category_id,
            ) => ({
              product_id:
                createdProduct.id,

              category_id,
            }),
          )

        const {
          error:
            linkError,
        } = await supabase
          .from(
            "store_product_categories",
          )
          .upsert(
            links,
            {
              onConflict:
                "product_id,category_id",

              ignoreDuplicates:
                true,
            },
          )

        if (linkError) {
          /*
           * Same safety behavior as
           * your existing product
           * POST endpoint:
           * remove a newly created
           * product if category
           * linking fails.
           */
          await supabase
            .from(
              "store_products",
            )
            .delete()
            .eq(
              "id",
              createdProduct.id,
            )

          throw new Error(
            "Product was created but could not be linked to its categories, so the product was rolled back.",
          )
        }

        /*
         * Add the new product to
         * our in-memory lookup maps
         * so a later CSV row cannot
         * silently create a duplicate.
         */
        const newProduct:
          ExistingProduct = {
            id:
              createdProduct.id,

            name,

            slug:
              requestedSlug,

            sku:
              payload.sku,

            upc:
              payload.upc,

            has_variants:
              hasVariants,
          }

        productsById.set(
          newProduct.id,
          newProduct,
        )

        if (
          newProduct.sku
        ) {
          productsBySku.set(
            normalizeLookup(
              newProduct.sku,
            ),
            newProduct,
          )
        }

        if (
          newProduct.upc
        ) {
          productsByUpc.set(
            normalizeLookup(
              newProduct.upc,
            ),
            newProduct,
          )
        }

        productsBySlug.set(
          normalizeLookup(
            newProduct.slug,
          ),
          newProduct,
        )

        results.push({
          rowNumber,
          action:
            "created",
          productId:
            createdProduct.id,
          name,
          message:
            "Product created successfully.",
        })
      } catch (error) {
        results.push({
          rowNumber,
          action:
            "failed",
          productId: null,
          name:
            name ??
            "(Unnamed product)",

          message:
            error instanceof
              Error
              ? error.message
              : "Unable to import this product.",
        })
      }
    }

    const created =
      results.filter(
        (result) =>
          result.action ===
          "created",
      ).length

    const updated =
      results.filter(
        (result) =>
          result.action ===
          "updated",
      ).length

    const failed =
      results.filter(
        (result) =>
          result.action ===
          "failed",
      ).length

    return NextResponse.json({
      success:
        failed === 0,

      summary: {
        total:
          results.length,

        created,
        updated,
        failed,
      },

      results,
    })
  } catch (error) {
    console.error(
      "Store import confirm exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to complete the product import.",
      },
      {
        status: 500,
      },
    )
  }
}