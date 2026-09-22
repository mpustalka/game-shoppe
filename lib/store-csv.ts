export type CsvRow = Record<string, string>

export type ImportAction =
  | "new"
  | "update"
  | "error"

export type ImportPreviewRow = {
  rowNumber: number
  action: ImportAction

  matchId: string | null
  matchedBy:
    | "id"
    | "sku"
    | "upc"
    | "slug"
    | null

  name: string
  sku: string | null
  upc: string | null
  slug: string | null

  errors: string[]
  warnings: string[]

  data: CsvRow
}

export const STORE_CSV_COLUMNS = [
  "id",
  "name",
  "slug",
  "sku",
  "upc",
  "brand",
  "product_type",

  "primary_category",
  "additional_categories",

  "pokemon_names",

  "set_name",
  "set_release_date",
  "language",

  "tags",
  "description",

  "distributor",

  "cost",
  "price",
  "compare_at_price",

  "inventory_quantity",
  "max_per_customer",

  "status",
  "featured",

  "is_new_arrival",
  "is_fall_exclusive",
  "is_sale",

  "is_preorder",
  "release_date",
  "preorder_closes_at",

  "has_variants",

  "allow_single_purchase",
  "allow_case_purchase",

  "units_per_case",
  "case_cost",
  "case_price",
  "case_inventory_quantity",

  "weight_oz",

  "package_length_in",
  "package_width_in",
  "package_height_in",

  "easyship_category",

  "case_weight_oz",
  "case_length_in",
  "case_width_in",
  "case_height_in",

  "shipping_required",

  "image_url",
  "image_urls",

  "created_at",
  "updated_at",
] as const

export function parseCsv(
  input: string,
): {
  headers: string[]
  rows: CsvRow[]
} {
  const text = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")

  const records: string[][] = []

  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    const char = text[index]
    const next = text[index + 1]

    if (inQuotes) {
      if (
        char === '"' &&
        next === '"'
      ) {
        field += '"'
        index += 1
        continue
      }

      if (char === '"') {
        inQuotes = false
        continue
      }

      field += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ",") {
      row.push(field)
      field = ""
      continue
    }

    if (char === "\n") {
      row.push(field)

      if (
        row.some(
          (value) =>
            value.trim() !== "",
        )
      ) {
        records.push(row)
      }

      row = []
      field = ""
      continue
    }

    field += char
  }

  row.push(field)

  if (
    row.some(
      (value) =>
        value.trim() !== "",
    )
  ) {
    records.push(row)
  }

  if (records.length === 0) {
    return {
      headers: [],
      rows: [],
    }
  }

  const headers =
    records[0].map(
      (header) =>
        header.trim(),
    )

  const rows =
    records
      .slice(1)
      .map((values) => {
        const result: CsvRow = {}

        headers.forEach(
          (header, index) => {
            result[header] =
              values[index] ?? ""
          },
        )

        return result
      })

  return {
    headers,
    rows,
  }
}

export function splitPipeList(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return []
  }

  return [
    ...new Set(
      value
        .split("|")
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean),
    ),
  ]
}

export function csvBoolean(
  value: unknown,
  fallback = false,
) {
  if (
    typeof value === "boolean"
  ) {
    return value
  }

  if (
    typeof value !== "string"
  ) {
    return fallback
  }

  const normalized =
    value
      .trim()
      .toLowerCase()

  if (
    [
      "true",
      "1",
      "yes",
      "y",
      "on",
    ].includes(normalized)
  ) {
    return true
  }

  if (
    [
      "false",
      "0",
      "no",
      "n",
      "off",
    ].includes(normalized)
  ) {
    return false
  }

  return fallback
}

export function csvNullableString(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null
  }

  const cleaned =
    value.trim()

  return cleaned || null
}

export function csvNullableNumber(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const number =
    Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

export function csvInteger(
  value: unknown,
  fallback = 0,
) {
  const number =
    Number(value)

  if (
    !Number.isFinite(number)
  ) {
    return fallback
  }

  return Math.max(
    0,
    Math.floor(number),
  )
}

export function slugifyProduct(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(/^-+|-+$/g, "")
}

export function normalizeLookup(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value
      ?.trim()
      .toLowerCase() ?? ""
  )
}