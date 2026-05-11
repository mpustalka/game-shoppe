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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  X
} from "lucide-react"
import { EditInventoryModal } from "@/components/inventory/edit-inventory-modal"
import { DeleteConfirmDialog } from "@/components/inventory/delete-confirm-dialog"

type ViewMode = "grid" | "list"
type SortOption = "newest" | "oldest" | "price-high" | "price-low" | "name"

export default function InventoryPage() {
  const { items, deleteItem } = useInventory()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterCondition, setFilterCondition] = useState<CardCondition | "all">("all")
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
          item.barcode.includes(searchQuery)
      )
    }

    // Condition filter
    if (filterCondition !== "all") {
      result = result.filter((item) => item.condition === filterCondition)
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
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
  }, [items, searchQuery, sortBy, filterCondition])

  const totalValue = filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0)

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventory</h1>
          <p className="mt-1 text-muted-foreground">
            {filteredItems.length} items - {totalQuantity} total cards - ${totalValue.toFixed(2)} value
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
      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cards, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Condition Filter */}
        <Select value={filterCondition} onValueChange={(v) => setFilterCondition(v as CardCondition | "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {CARD_CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="hidden sm:block">
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3X3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium text-foreground">No inventory items</h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {searchQuery || filterCondition !== "all" 
              ? "No items match your search or filters"
              : "Start by browsing Pokemon sets and adding cards to your inventory"
            }
          </p>
          {!searchQuery && filterCondition === "all" && (
            <Button asChild>
              <Link href="/sets">Browse Pokemon Sets</Link>
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group overflow-hidden">
              <Link href={`/inventory/${item.id}`}>
                <div className="relative aspect-[2.5/3.5] w-full overflow-hidden bg-muted">
                  <img
                    src={item.card.images.small}
                    alt={item.card.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Sync Status */}
                  {!item.syncedToSquare && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                      Not Synced
                    </Badge>
                  )}
                </div>
              </Link>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/inventory/${item.id}`}>
                      <h3 className="truncate font-medium text-foreground hover:text-primary">
                        {item.card.name}
                      </h3>
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.card.set.name}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
                  <Badge variant="secondary" className="text-xs">
                    {item.condition}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Qty: {item.quantity}
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold text-primary">
                  ${item.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  SKU: {item.sku}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <Link href={`/inventory/${item.id}`} className="shrink-0">
                <img
                  src={item.card.images.small}
                  alt={item.card.name}
                  className="h-20 w-14 rounded object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/inventory/${item.id}`}>
                  <h3 className="font-medium text-foreground hover:text-primary">
                    {item.card.name}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {item.card.set.name} - #{item.card.number}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{item.condition}</Badge>
                  <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                  <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
                  {!item.syncedToSquare && (
                    <Badge variant="outline" className="text-xs">Not Synced</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground">${item.price.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
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
