"use client"

import Link from "next/link"

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type PreviewRow = {
  rowNumber: number

  action:
    | "new"
    | "update"
    | "error"

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

  data: Record<
    string,
    string
  >
}

type PreviewResponse = {
  fileName: string

  unknownHeaders:
    string[]

  summary: {
    total: number
    new: number
    update: number
    error: number
  }

  rows: PreviewRow[]
}

type ImportResult = {
  rowNumber: number
  name: string

  action:
    | "created"
    | "updated"
    | "error"

  productId:
    | string
    | null

  error:
    | string
    | null
}

type ImportResponse = {
  success: boolean

  summary: {
    total: number
    created: number
    updated: number
    failed: number
  }

  results: ImportResult[]
}

export default function StoreImportPage() {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    )

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    )

  const [
    preview,
    setPreview,
  ] =
    useState<PreviewResponse | null>(
      null,
    )

  const [
    result,
    setResult,
  ] =
    useState<ImportResponse | null>(
      null,
    )

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    importing,
    setImporting,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState("")

  const [
    dragging,
    setDragging,
  ] =
    useState(false)

  async function previewFile(
    selectedFile: File,
  ) {
    setFile(
      selectedFile,
    )

    setPreview(null)
    setResult(null)
    setError("")
    setLoading(true)

    try {
      const formData =
        new FormData()

      formData.append(
        "file",
        selectedFile,
      )

      const response =
        await fetch(
          "/api/admin/store/import/preview",
          {
            method: "POST",
            body: formData,
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to preview CSV.",
        )
      }

      setPreview(data)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to preview CSV.",
      )
    } finally {
      setLoading(false)
    }
  }

  async function confirmImport() {
    if (
      !file ||
      !preview ||
      preview.summary.error >
        0 ||
      importing
    ) {
      return
    }

    setError("")
    setImporting(true)

    try {
      const formData =
        new FormData()

      formData.append(
        "file",
        file,
      )

      const response =
        await fetch(
          "/api/admin/store/import/confirm",
          {
            method: "POST",
            body: formData,
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to import products.",
        )
      }

      setResult(data)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to import products.",
      )
    } finally {
      setImporting(false)
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selected =
      event.target
        .files?.[0]

    if (selected) {
      void previewFile(
        selected,
      )
    }

    event.target.value =
      ""
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault()

    setDragging(false)

    const selected =
      event.dataTransfer
        .files?.[0]

    if (selected) {
      void previewFile(
        selected,
      )
    }
  }

  function resetImport() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError("")
  }

  const canImport =
    Boolean(
      preview &&
        file &&
        preview.summary.error ===
          0 &&
        !result,
    )

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <Button
            asChild
            variant="ghost"
            className="-ml-3 mb-3"
          >
            <Link href="/admin/store">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Store Products
            </Link>
          </Button>

          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-500">
            <FileSpreadsheet className="h-4 w-4" />
            Product Import
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Import Products
          </h1>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            Upload a store
            product CSV, review
            every new product,
            update and error,
            then confirm the
            import.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
        >
          <a href="/api/admin/store/export">
            <Download className="mr-2 h-4 w-4" />
            Export Current Catalog
          </a>
        </Button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                Import failed
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED */}

      {result ? (
        <ImportResults
          result={result}
          onReset={
            resetImport
          }
        />
      ) : !preview ? (
        /* UPLOAD */

        <div className="rounded-2xl border bg-card p-5 sm:p-8">
          <div
            onDragEnter={(
              event,
            ) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragOver={(
              event,
            ) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() =>
              setDragging(
                false,
              )
            }
            onDrop={
              handleDrop
            }
            className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragging
                ? "border-rose-500 bg-rose-500/5"
                : "border-border bg-muted/20"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-rose-500" />

                <h2 className="mt-5 text-xl font-black">
                  Checking CSV
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Validating
                  products,
                  categories and
                  existing catalog
                  matches.
                </p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <Upload className="h-8 w-8" />
                </div>

                <h2 className="mt-5 text-xl font-black">
                  Upload Product
                  CSV
                </h2>

                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Drop your CSV
                  here or choose a
                  file. Exporting
                  the current
                  catalog first
                  gives you a
                  ready-to-edit
                  template.
                </p>

                <Button
                  className="mt-6 bg-rose-600 text-white hover:bg-rose-500"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Choose CSV
                </Button>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={
              handleFileChange
            }
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Existing products"
              description="Matched by ID first, then SKU, UPC and slug."
            />

            <InfoCard
              title="Categories"
              description="Full category paths from your export are supported."
            />

            <InfoCard
              title="Safe preview"
              description="Nothing changes in the database until you confirm."
            />
          </div>
        </div>
      ) : (
        <>
          {/* FILE */}

          <div className="mb-6 rounded-2xl border bg-card p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Import File
                </p>

                <p className="mt-1 font-black">
                  {
                    preview.fileName
                  }
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {preview.summary.total.toLocaleString()}{" "}
                  product rows
                  found
                </p>
              </div>

              <Button
                variant="outline"
                disabled={
                  importing
                }
                onClick={
                  resetImport
                }
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Choose Different
                CSV
              </Button>
            </div>
          </div>

          {/* SUMMARY */}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Total Rows"
              value={
                preview.summary
                  .total
              }
            />

            <SummaryCard
              title="New Products"
              value={
                preview.summary
                  .new
              }
              type="new"
            />

            <SummaryCard
              title="Updates"
              value={
                preview.summary
                  .update
              }
              type="update"
            />

            <SummaryCard
              title="Errors"
              value={
                preview.summary
                  .error
              }
              type="error"
            />
          </div>

          {/* UNKNOWN COLUMNS */}

          {preview
            .unknownHeaders
            .length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

                <div>
                  <p className="font-bold">
                    Extra CSV
                    columns
                  </p>

                  <p className="mt-1 text-muted-foreground">
                    These columns
                    are not part of
                    the store
                    import format
                    and will be
                    ignored.
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {preview.unknownHeaders.map(
                      (
                        header,
                      ) => (
                        <Badge
                          key={
                            header
                          }
                          variant="outline"
                        >
                          {
                            header
                          }
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VALIDATION */}

          <div
            className={`mb-6 rounded-xl border p-4 ${
              canImport
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            }`}
          >
            <div className="flex gap-3">
              {canImport ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              )}

              <div>
                <p className="font-bold">
                  {canImport
                    ? "CSV passed validation"
                    : "Fix errors before importing"}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {canImport
                    ? "Every row passed preview validation. No database changes have been made yet."
                    : `${preview.summary.error} row(s) contain errors. Correct those rows and upload the CSV again.`}
                </p>
              </div>
            </div>
          </div>

          {/* PREVIEW TABLE */}

          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b p-5">
              <h2 className="font-black">
                Import Preview
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Review exactly
                what will happen
                before writing to
                the catalog.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 font-bold">
                      Row
                    </th>

                    <th className="px-4 py-3 font-bold">
                      Action
                    </th>

                    <th className="px-4 py-3 font-bold">
                      Product
                    </th>

                    <th className="px-4 py-3 font-bold">
                      SKU
                    </th>

                    <th className="px-4 py-3 font-bold">
                      Category
                    </th>

                    <th className="px-4 py-3 font-bold">
                      Price
                    </th>

                    <th className="px-4 py-3 font-bold">
                      Match
                    </th>

                    <th className="px-4 py-3 font-bold">
                      Validation
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {preview.rows.map(
                    (row) => (
                      <tr
                        key={
                          row.rowNumber
                        }
                        className="align-top"
                      >
                        <td className="px-4 py-4 text-muted-foreground">
                          {
                            row.rowNumber
                          }
                        </td>

                        <td className="px-4 py-4">
                          <ActionBadge
                            action={
                              row.action
                            }
                          />
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold">
                            {
                              row.name
                            }
                          </p>

                          {row.slug && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                row.slug
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {row.sku ??
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.data
                            .primary_category ||
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.data
                            .price ||
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.matchedBy ? (
                            <div>
                              <Badge variant="outline">
                                {
                                  row.matchedBy
                                }
                              </Badge>

                              <p className="mt-1 max-w-[180px] truncate text-xs text-muted-foreground">
                                {
                                  row.matchId
                                }
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              New
                              product
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {row.errors
                            .length ===
                            0 &&
                          row.warnings
                            .length ===
                            0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Valid
                            </span>
                          ) : (
                            <div className="max-w-[340px] space-y-2">
                              {row.errors.map(
                                (
                                  message,
                                  index,
                                ) => (
                                  <p
                                    key={`error-${index}`}
                                    className="text-xs text-red-500"
                                  >
                                    •{" "}
                                    {
                                      message
                                    }
                                  </p>
                                ),
                              )}

                              {row.warnings.map(
                                (
                                  message,
                                  index,
                                ) => (
                                  <p
                                    key={`warning-${index}`}
                                    className="text-xs text-amber-600"
                                  >
                                    •{" "}
                                    {
                                      message
                                    }
                                  </p>
                                ),
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CONFIRM */}

          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-black">
                Ready to import?
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {canImport
                  ? `${preview.summary.new} new product(s) and ${preview.summary.update} existing product update(s) are ready.`
                  : "The import cannot continue until every error row is corrected."}
              </p>

              {canImport && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Product
                  variants are
                  not changed by
                  this import.
                </p>
              )}
            </div>

            <Button
              disabled={
                !canImport ||
                importing
              }
              size="lg"
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={() =>
                void confirmImport()
              }
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <PackagePlus className="mr-2 h-4 w-4" />
                  Confirm Import
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function ImportResults({
  result,
  onReset,
}: {
  result: ImportResponse
  onReset: () => void
}) {
  return (
    <>
      <div
        className={`mb-6 rounded-2xl border p-6 ${
          result.summary.failed ===
          0
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/30 bg-amber-500/10"
        }`}
      >
        <div className="flex gap-4">
          {result.summary.failed ===
          0 ? (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-8 w-8 shrink-0 text-amber-500" />
          )}

          <div>
            <h2 className="text-xl font-black">
              {result.summary.failed ===
              0
                ? "Import Complete"
                : "Import Completed With Errors"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {
                result.summary
                  .created
              }{" "}
              created,{" "}
              {
                result.summary
                  .updated
              }{" "}
              updated and{" "}
              {
                result.summary
                  .failed
              }{" "}
              failed.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ResultSummaryCard
          title="Processed"
          value={
            result.summary.total
          }
        />

        <ResultSummaryCard
          title="Created"
          value={
            result.summary.created
          }
          type="created"
        />

        <ResultSummaryCard
          title="Updated"
          value={
            result.summary.updated
          }
          type="updated"
        />

        <ResultSummaryCard
          title="Failed"
          value={
            result.summary.failed
          }
          type="error"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-black">
            Import Results
          </h2>
        </div>

        <div className="divide-y">
          {result.results.map(
            (row) => (
              <div
                key={`${row.rowNumber}-${row.name}`}
                className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  {row.action ===
                  "error" ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  )}

                  <div>
                    <p className="font-bold">
                      {row.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      CSV row{" "}
                      {
                        row.rowNumber
                      }
                    </p>

                    {row.error && (
                      <p className="mt-1 text-sm text-red-500">
                        {
                          row.error
                        }
                      </p>
                    )}
                  </div>
                </div>

                <ResultBadge
                  action={
                    row.action
                  }
                />
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={
            onReset
          }
        >
          <Upload className="mr-2 h-4 w-4" />
          Import Another CSV
        </Button>

        <Button
          asChild
          className="bg-rose-600 text-white hover:bg-rose-500"
        >
          <Link href="/admin/store">
            Store Products
          </Link>
        </Button>
      </div>
    </>
  )
}

function ActionBadge({
  action,
}: {
  action:
    | "new"
    | "update"
    | "error"
}) {
  if (action === "new") {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        NEW
      </Badge>
    )
  }

  if (action === "update") {
    return (
      <Badge className="bg-sky-600 text-white hover:bg-sky-600">
        UPDATE
      </Badge>
    )
  }

  return (
    <Badge className="bg-red-600 text-white hover:bg-red-600">
      ERROR
    </Badge>
  )
}

function ResultBadge({
  action,
}: {
  action:
    | "created"
    | "updated"
    | "error"
}) {
  if (action === "created") {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        CREATED
      </Badge>
    )
  }

  if (action === "updated") {
    return (
      <Badge className="bg-sky-600 text-white hover:bg-sky-600">
        UPDATED
      </Badge>
    )
  }

  return (
    <Badge className="bg-red-600 text-white hover:bg-red-600">
      FAILED
    </Badge>
  )
}

function SummaryCard({
  title,
  value,
  type,
}: {
  title: string
  value: number

  type?:
    | "new"
    | "update"
    | "error"
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">
        {title}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <p className="text-3xl font-black">
          {value.toLocaleString()}
        </p>

        {type && (
          <ActionBadge
            action={type}
          />
        )}
      </div>
    </div>
  )
}

function ResultSummaryCard({
  title,
  value,
  type,
}: {
  title: string
  value: number

  type?:
    | "created"
    | "updated"
    | "error"
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">
        {title}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <p className="text-3xl font-black">
          {value.toLocaleString()}
        </p>

        {type && (
          <ResultBadge
            action={type}
          />
        )}
      </div>
    </div>
  )
}

function InfoCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="font-bold">
        {title}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}