"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import Link from "next/link"
import { useParams } from "next/navigation"

import {
  ArrowLeft,
  Boxes,
  DollarSign,
  Edit,
  ImageOff,
  Languages,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wallet,
} from "lucide-react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type InventoryItem = {
  id: string
  user_id: string | null

  card_id?: string | null

  name?: string | null

  set_name?: string | null
  set_id?: string | null

  number?: string | null

  condition?: string | null

  finish?: string | null

  variant?: string | null

  language?: string | null

  quantity?: number | null

  quantity_sold?: number | null

  price?: number | null

  purchase_price?: number | null

  market_value?: number | null

  notes?: string | null

  image?: string | null
  image_url?: string | null

  created_at?: string | null
  updated_at?: string | null
}

type InventoryResponse = {
  scope: {
    selectedUserId: string
    adminUserId: string
  }

  user: {
    id: string
    email: string | null
    storeName: string | null
  }

  summary: {
    rowCount: number
    totalQuantity: number
    totalSold: number
    estimatedValue: number
    totalCost: number
  }

  items: InventoryItem[]
}

const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
]

const FINISHES = [
  "Normal",
  "Reverse Holo",
  "Pokeball Reverse Holo",
  "Energy Symbol Reverse Holo",
  "Masterball Reverse Holo",
  "Other Reverse Holo",
  "Holo",
  "Non Holo",
  "Rainbow Holo",
  "Baby Shiny Holo",
  "Cosmo Holo",
  "Stamped",
  "Other Holo",
  "Full Art",
]

const LANGUAGES = [
  {
    value: "en",
    label: "English",
  },
  {
    value: "ja",
    label: "Japanese",
  },
]

function money(value: unknown) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return "$0.00"
  }

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  })
}

function numberValue(value: unknown) {
  const amount = Number(value)

  return Number.isFinite(amount) ? amount : 0
}

function displayLanguage(language: string | null | undefined) {
  if (language === "ja") {
    return "Japanese"
  }

  if (language === "en") {
    return "English"
  }

  return language || "Unknown"
}

function cardImage(item: InventoryItem) {
  return item.image_url || item.image || null
}

export default function AdminUserInventoryPage() {
  const params = useParams<{
    id: string
  }>()

  const userId = params.id

  const [data, setData] = useState<InventoryResponse | null>(null)

  const [loading, setLoading] = useState(true)

  const [working, setWorking] = useState(false)

  const [search, setSearch] = useState("")

  const [conditionFilter, setConditionFilter] = useState("all")

  const [finishFilter, setFinishFilter] = useState("all")

  const [languageFilter, setLanguageFilter] = useState("all")

  const [editing, setEditing] = useState<InventoryItem | null>(null)

  const [editCondition, setEditCondition] = useState("")

  const [editFinish, setEditFinish] = useState("")

  const [editLanguage, setEditLanguage] = useState("en")

  const [editQuantity, setEditQuantity] = useState("1")

  const [editPrice, setEditPrice] = useState("0")

  const [editPurchasePrice, setEditPurchasePrice] = useState("0")

  const [editNotes, setEditNotes] = useState("")

  const loadInventory = useCallback(async () => {
    if (!userId) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/inventory?limit=500`,
        {
          cache: "no-store",
        },
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Failed to load user inventory")
      }

      setData(result as InventoryResponse)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load inventory",
      )

      setData(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []

    const query = search.trim().toLowerCase()

    return items.filter((item) => {
      if (query) {
        const haystack = [
          item.name,
          item.card_id,
          item.set_name,
          item.set_id,
          item.number,
          item.condition,
          item.finish,
          item.variant,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        if (!haystack.includes(query)) {
          return false
        }
      }

      if (conditionFilter !== "all" && item.condition !== conditionFilter) {
        return false
      }

      if (finishFilter !== "all" && item.finish !== finishFilter) {
        return false
      }

      if (languageFilter !== "all" && item.language !== languageFilter) {
        return false
      }

      return true
    })
  }, [data, search, conditionFilter, finishFilter, languageFilter])

  const filteredSummary = useMemo(() => {
    const totalQuantity = filteredItems.reduce(
      (total, item) => total + numberValue(item.quantity),
      0,
    )

    const estimatedValue = filteredItems.reduce((total, item) => {
      const quantity = numberValue(item.quantity)

      const value = numberValue(item.market_value ?? item.price)

      return total + quantity * value
    }, 0)

    return {
      totalQuantity,
      estimatedValue,
    }
  }, [filteredItems])

  function openEdit(item: InventoryItem) {
    setEditing(item)

    setEditCondition(item.condition || "Near Mint")

    setEditFinish(item.finish || "Normal")

    setEditLanguage(item.language || "en")

    setEditQuantity(String(numberValue(item.quantity)))

    setEditPrice(String(numberValue(item.price)))

    setEditPurchasePrice(String(numberValue(item.purchase_price)))

    setEditNotes(item.notes || "")
  }

  async function saveItem() {
    if (!editing || !userId) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}/inventory`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          itemId: editing.id,

          condition: editCondition,

          finish: editFinish,

          language: editLanguage,

          quantity: Number(editQuantity),

          price: Number(editPrice),

          purchasePrice: Number(editPurchasePrice),

          notes: editNotes,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Failed to update inventory item")
      }

      toast.success("Inventory item updated")

      setEditing(null)

      await loadInventory()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update inventory item",
      )
    } finally {
      setWorking(false)
    }
  }

  async function deleteItem(item: InventoryItem) {
    if (!userId) {
      return
    }

    const label = item.name || item.card_id || "this inventory item"

    const confirmed = window.confirm(
      `Delete ${label} from this customer's inventory?\n\nThis cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    setWorking(true)

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/inventory?itemId=${encodeURIComponent(
          item.id,
        )}`,
        {
          method: "DELETE",
        },
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete inventory item")
      }

      toast.success("Inventory item deleted")

      await loadInventory()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete inventory item",
      )
    } finally {
      setWorking(false)
    }
  }

  function clearFilters() {
    setSearch("")
    setConditionFilter("all")
    setFinishFilter("all")
    setLanguageFilter("all")
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading customer inventory…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

            <h2 className="text-xl font-semibold">Unable to load inventory</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              The selected customer's inventory could not be loaded.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" asChild>
                <Link href={`/admin/users/${userId}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to User
                </Link>
              </Button>

              <Button onClick={() => void loadInventory()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 -ml-3" asChild>
            <Link href={`/admin/users/${userId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to User
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Customer Inventory
            </h1>

            <Badge variant="outline">Admin View</Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />

              {data.user.storeName || "No store name"}
            </span>

            <span>{data.user.email || "No email"}</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => void loadInventory()}
          disabled={working}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Inventory
        </Button>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Inventory Rows"
          value={data.summary.rowCount}
          description="Unique inventory records"
          icon={Package}
        />

        <SummaryCard
          title="Total Cards"
          value={data.summary.totalQuantity}
          description="Quantity currently owned"
          icon={Boxes}
        />

        <SummaryCard
          title="Cards Sold"
          value={data.summary.totalSold}
          description="Recorded sold quantity"
          icon={Package}
        />

        <SummaryCard
          title="Estimated Value"
          value={money(data.summary.estimatedValue)}
          description="Market / listed value"
          icon={DollarSign}
        />

        <SummaryCard
          title="Total Cost"
          value={money(data.summary.totalCost)}
          description="Recorded purchase cost"
          icon={Wallet}
        />
      </div>

      {/* FILTERS */}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>

          <CardDescription>
            Search this customer's collection without affecting their account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_240px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search card, set, number..."
              />
            </div>

            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Condition" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>

                {CONDITIONS.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={finishFilter} onValueChange={setFinishFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Finish" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Finishes</SelectItem>

                {FINISHES.map((finish) => (
                  <SelectItem key={finish} value={finish}>
                    {finish}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Language" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>

                {LANGUAGES.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {filteredItems.length}
              </strong>{" "}
              rows
            </span>

            <span>
              <strong className="text-foreground">
                {filteredSummary.totalQuantity}
              </strong>{" "}
              cards
            </span>

            <span>
              Filtered value:{" "}
              <strong className="text-foreground">
                {money(filteredSummary.estimatedValue)}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* INVENTORY */}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Inventory</CardTitle>

          <CardDescription>
            Administrative access to this customer's collection.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-16 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/60" />

              <h3 className="mt-4 text-lg font-semibold">
                {data.items.length === 0
                  ? "No inventory yet"
                  : "No matching cards"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {data.items.length === 0
                  ? "This customer does not currently have any inventory records."
                  : "Try changing your search or filters."}
              </p>

              {data.items.length > 0 && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">Card</th>

                    <th className="px-3 py-3">Set</th>

                    <th className="px-3 py-3">Condition</th>

                    <th className="px-3 py-3">Finish</th>

                    <th className="px-3 py-3">Language</th>

                    <th className="px-3 py-3 text-right">Qty</th>

                    <th className="px-3 py-3 text-right">Price</th>

                    <th className="px-3 py-3 text-right">Cost</th>

                    <th className="px-3 py-3 text-right">Value</th>

                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <InventoryRow
                      key={item.id}
                      item={item}
                      working={working}
                      onEdit={() => openEdit(item)}
                      onDelete={() => void deleteItem(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>

            <DialogDescription>
              Update this customer's inventory record.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-5">
              <div className="flex gap-4 rounded-lg border p-3">
                <CardThumbnail item={editing} large />

                <div className="min-w-0">
                  <p className="font-semibold">
                    {editing.name || "Unknown Card"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {editing.set_name || editing.set_id || "Unknown Set"}
                  </p>

                  {editing.number && (
                    <p className="text-xs text-muted-foreground">
                      #{editing.number}
                    </p>
                  )}

                  {editing.card_id && (
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      ID: {editing.card_id}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Condition</Label>

                  <Select
                    value={editCondition}
                    onValueChange={setEditCondition}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {CONDITIONS.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Finish</Label>

                  <Select value={editFinish} onValueChange={setEditFinish}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {FINISHES.map((finish) => (
                        <SelectItem key={finish} value={finish}>
                          {finish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>

                  <Select value={editLanguage} onValueChange={setEditLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language.value} value={language.value}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>

                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editQuantity}
                    onChange={(event) => setEditQuantity(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sale / List Price</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrice}
                    onChange={(event) => setEditPrice(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Purchase Cost</Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPurchasePrice}
                    onChange={(event) =>
                      setEditPurchasePrice(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>

                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Inventory notes..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={working}
            >
              Cancel
            </Button>

            <Button onClick={() => void saveItem()} disabled={working}>
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description: string
  icon: typeof Package
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>

          <p className="mt-1 truncate text-2xl font-bold">{value}</p>

          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function InventoryRow({
  item,
  working,
  onEdit,
  onDelete,
}: {
  item: InventoryItem
  working: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const quantity = numberValue(item.quantity)

  const unitValue = numberValue(item.market_value ?? item.price)

  const totalValue = quantity * unitValue

  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-3 py-3">
        <div className="flex min-w-[220px] items-center gap-3">
          <CardThumbnail item={item} />

          <div className="min-w-0">
            <p className="max-w-[220px] truncate font-medium">
              {item.name || "Unknown Card"}
            </p>

            <p className="max-w-[220px] truncate text-xs text-muted-foreground">
              {item.card_id || item.id}
            </p>

            {item.variant && (
              <Badge variant="outline" className="mt-1">
                {item.variant}
              </Badge>
            )}
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[180px] truncate">
          {item.set_name || item.set_id || "—"}
        </p>

        {item.number && (
          <p className="text-xs text-muted-foreground">#{item.number}</p>
        )}
      </td>

      <td className="px-3 py-3">
        <Badge variant="secondary">{item.condition || "—"}</Badge>
      </td>

      <td className="px-3 py-3">
        <span className="text-sm">{item.finish || "—"}</span>
      </td>

      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5 text-muted-foreground" />

          {displayLanguage(item.language)}
        </span>
      </td>

      <td className="px-3 py-3 text-right font-medium">{quantity}</td>

      <td className="px-3 py-3 text-right">{money(item.price)}</td>

      <td className="px-3 py-3 text-right">{money(item.purchase_price)}</td>

      <td className="px-3 py-3 text-right font-medium">{money(totalValue)}</td>

      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            disabled={working}
          >
            <Edit className="mr-2 h-3.5 w-3.5" />
            Edit
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            disabled={working}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

function CardThumbnail({
  item,
  large = false,
}: {
  item: InventoryItem
  large?: boolean
}) {
  const image = cardImage(item)

  const dimensions = large ? "h-28 w-20" : "h-16 w-12"

  if (!image) {
    return (
      <div
        className={`${dimensions} flex shrink-0 items-center justify-center rounded-md border bg-muted`}
      >
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      className={`${dimensions} shrink-0 overflow-hidden rounded-md border bg-muted`}
    >
      <img
        src={image}
        alt={item.name || "Card"}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  )
}
