"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import type { CardCondition } from "@/lib/types"
import { CARD_CONDITIONS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Plus,
  Grid3X3,
  List,
  MoreVertical,
  Pencil,
  Trash2,
  Package,
  Filter,
  X,
} from "lucide-react"
import { EditInventoryModal } from "@/components/inventory/edit-inventory-modal"
import { DeleteConfirmDialog } from "@/components/inventory/delete-confirm-dialog"
import { SetFilter } from "@/components/inventory/set-filter"
import { getAvailableSets } from "@/lib/card-metadata"
import { useEntitlements } from "@/hooks/use-entitlements"
import { TrialBanner } from "@/components/billing/trial-banner"

type ViewMode = "grid" | "list"
type SortOption = "newest" | "oldest" | "price-high" | "price-low" | "name"

export default function InventoryPage() {
  const { items, deleteItem } = useInventory()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterCondition, setFilterCondition] = useState<CardCondition | "all">(
    "all",
  )
  const [filterSet, setFilterSet] = useState("all")
  const [editItem, setEditItem] = useState<string | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.card.name.toLowerCase().includes(query) ||
          item.card.set.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.barcode.includes(searchQuery),
      )
    }

    // Condition filter
    if (filterCondition !== "all") {
      result = result.filter((item) => item.condition === filterCondition)
    }

    // Set filter
    if (filterSet !== "all") {
      result = result.filter(
        (item) => (item.card.set.id || item.card.set.name) === filterSet,
      )
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        break
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        break
      case "price-high":
        result.sort((a, b) => b.price - a.price)
        break
      case "price-low":
        result.sort((a, b) => a.price - b.price)
        break
      case "name":
        result.sort((a, b) => a.card.name.localeCompare(b.card.name))
        break
    }

    return result
  }, [items, searchQuery, sortBy, filterCondition, filterSet])

  const availableSets = useMemo(
    () => getAvailableSets(items.map((item) => item.card)),
    [items],
  )

  // Trial accounts can only see a capped slice of their inventory.
  const { entitlements } = useEntitlements()
  const inventoryLimit = entitlements.maxInventoryVisible
  const visibleItems = useMemo(
    () =>
      inventoryLimit != null
        ? filteredItems.slice(0, inventoryLimit)
        : filteredItems,
    [filteredItems, inventoryLimit],
  )
  const hiddenCount = filteredItems.length - visibleItems.length

  const totalValue = filteredItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const totalQuantity = filteredItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )

  const [isDeleting, setIsDeleting] = useState(false)
  const handleDelete = async () => {
    if (deleteItemId) {
      setIsDeleting(true)
      try {
        await deleteItem(deleteItemId)
        setDeleteItemId(null)
      } catch (e) {
        // Optionally show error toast
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const itemToEdit = editItem ? items.find((i) => i.id === editItem) : null

  return (
    <div className="min-h-screen bg-[#070708] px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <TrialBanner />
      </div>

      {/* Header */}
      <div className="mx-auto mb-6 flex max-w-[1500px] flex-col gap-5 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(225,29,72,.16),transparent_34%),rgba(255,255,255,.025)] p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Inventory
          </h1>
          <p className="mt-2 text-sm text-white/45 sm:text-base">
            {filteredItems.length} items - {totalQuantity} total cards - $
            {totalValue.toFixed(2)} value
          </p>
        </div>
        <Button asChild>
          <Link href="/sets">
            <Plus className="mr-2 h-4 w-4" />
            Add Cards
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="mx-auto mb-6 grid max-w-[1500px] gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(280px,1fr)_220px_190px_180px_auto] lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cards, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Set Filter */}
        <SetFilter
          sets={availableSets}
          value={filterSet}
          onChange={setFilterSet}
          className="h-11 w-full !border-white/10 !bg-white/[0.045] !text-white [&_svg]:text-white/35 [&_[data-slot=select-value]]:text-white"
        />

        {/* Condition Filter */}
        <Select
          value={filterCondition}
          onValueChange={(v) => setFilterCondition(v as CardCondition | "all")}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#111114] text-white">
            <SelectItem value="all" className="focus:bg-white/10 focus:text-white">All Conditions</SelectItem>
            {CARD_CONDITIONS.map((c) => (
              <SelectItem
                key={c}
                value={c}
                className="focus:bg-white/10 focus:text-white"
              >
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-white/[0.045] text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#111114] text-white">
            <SelectItem value="newest" className="focus:bg-white/10 focus:text-white">Newest First</SelectItem>
            <SelectItem value="oldest" className="focus:bg-white/10 focus:text-white">Oldest First</SelectItem>
            <SelectItem value="price-high" className="focus:bg-white/10 focus:text-white">Price: High to Low</SelectItem>
            <SelectItem value="price-low" className="focus:bg-white/10 focus:text-white">Price: Low to High</SelectItem>
            <SelectItem value="name" className="focus:bg-white/10 focus:text-white">Name A-Z</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode */}
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
          className="hidden sm:block"
        >
          <TabsList className="h-11 rounded-xl border border-white/10 bg-white/[0.045] p-1">
            <TabsTrigger
              value="grid"
              className="rounded-lg text-white/45 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
            >
              <Grid3X3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="rounded-lg text-white/45 data-[state=active]:bg-white data-[state=active]:text-zinc-950"
            >
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium text-white">
            No inventory items
          </h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {searchQuery || filterCondition !== "all" || filterSet !== "all"
              ? "No items match your search or filters"
              : "Start by browsing Pokemon sets and adding cards to your inventory"}
          </p>
          {!searchQuery && filterCondition === "all" && filterSet === "all" && (
            <Button asChild>
              <Link href="/sets">Browse Pokemon Sets</Link>
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {visibleItems.map((item) => (
            <Card key={item.id} className="group overflow-hidden rounded-2xl border-white/10 bg-white/[0.035] text-white shadow-none transition duration-300 hover:-translate-y-1 hover:border-rose-400/25 hover:bg-white/[0.05]">
              <Link href={`/inventory/${item.id}`}>
                <div className="relative aspect-[2.5/3.5] w-full overflow-hidden bg-muted">
                  <img
                    src={item.card.images.small}
                    alt={item.card.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                    loading="lazy"
                  />
                  {/* Sync Status */}
                  {!item.syncedToSquare && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs"
                    >
                      Not Synced
                    </Badge>
                  )}
                </div>
              </Link>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/inventory/${item.id}`}>
                      <h3 className="truncate font-medium text-white hover:text-rose-300">
                        {item.card.name}
                      </h3>
                    </Link>
                    <p className="truncate text-xs text-white/40">
                      {item.card.set.name}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-white/65 hover:bg-white/10 hover:text-white"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditItem(item.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteItemId(item.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border border-white/10 bg-white/90 text-xs font-semibold text-zinc-900"
                  >
                    {item.condition}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-white/20 bg-white/[0.04] text-xs text-white/75"
                  >
                    {item.finish || "Normal"}
                  </Badge>
                  <span className="text-xs text-white/40">
                    Qty: {item.quantity}
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold text-primary">
                  ${item.price.toFixed(2)}
                </p>
                <p className="text-xs text-white/40">SKU: {item.sku}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-[1500px] space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-white transition hover:border-rose-400/20 hover:bg-white/[0.05] sm:gap-4 sm:p-4"
            >
              <Link href={`/inventory/${item.id}`} className="shrink-0 text-white/65 hover:bg-white/10 hover:text-white">
                <img
                  src={item.card.images.small}
                  alt={item.card.name}
                  className="h-20 w-14 rounded object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/inventory/${item.id}`}>
                  <h3 className="font-medium text-white hover:text-rose-300">
                    {item.card.name}
                  </h3>
                </Link>
                <p className="text-sm text-white/40">
                  {item.card.set.name} - #{item.card.number}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border border-white/10 bg-white/90 text-xs font-semibold text-zinc-900"
                  >
                    {item.condition}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-white/20 bg-white/[0.04] text-xs text-white/75"
                  >
                    {item.finish || "Normal"}
                  </Badge>
                  <span className="text-xs text-white/40">
                    Qty: {item.quantity}
                  </span>
                  <span className="text-xs text-white/40">
                    SKU: {item.sku}
                  </span>
                  {!item.syncedToSquare && (
                    <Badge variant="outline" className="text-xs">
                      Not Synced
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-white">
                  ${item.price.toFixed(2)}
                </p>
                <p className="text-sm text-white/40">
                  Total: ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditItem(item.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteItemId(item.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {hiddenCount > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-6 py-8 text-center">
          <p className="text-sm font-medium text-white">
            {hiddenCount} more {hiddenCount === 1 ? "card is" : "cards are"} hidden
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Your free trial shows the first {inventoryLimit} cards. Upgrade to
            see and manage your entire inventory.
          </p>
          <Button asChild size="sm" className="mt-1">
            <Link href="/settings?tab=billing">Upgrade to view all</Link>
          </Button>
        </div>
      )}

      <EditInventoryModal
        item={itemToEdit}
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        onConfirm={handleDelete}
        itemName={items.find((i) => i.id === deleteItemId)?.card.name || ""}
      />
    </div>
  )
}