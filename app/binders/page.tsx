"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { PRICE_TIERS, getPriceTier, compareCardRarity, getDisplayRarity, type PriceTier, CARD_CONDITIONS, type CardCondition, type InventoryItem } from "@/lib/types"
import * as binderApi from "@/lib/binders"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  BookOpen, 
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Eye,
  Printer,
  DollarSign,
  Package,
  X,
  Filter
} from "lucide-react"

type ViewMode = "grid" | "list"
type SortOption = "price-low" | "price-high" | "name" | "set" | "rarity"

export default function BindersPage() {

  const { items: inventoryItems } = useInventory()
  const [activeTier, setActiveTier] = useState<PriceTier>("budget")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("price-low")
  const [filterCondition, setFilterCondition] = useState<CardCondition | "all">("all")
  const [binderItems, setBinderItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addCardId, setAddCardId] = useState<string>("")
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Compute tierStats from binderItems
  const tierStats = useMemo(() => {
    // Initialize stats for each tier
    const stats = {
      budget: { count: 0, totalValue: 0, totalQty: 0 },
      mid: { count: 0, totalValue: 0, totalQty: 0 },
      premium: { count: 0, totalValue: 0, totalQty: 0 },
    }
    for (const item of binderItems) {
      const tier = getPriceTier(item.price)
      stats[tier].count += 1
      stats[tier].totalValue += item.price * (item.quantity ?? 1)
      stats[tier].totalQty += item.quantity ?? 1
    }
    // Ensure values are numbers
    for (const tier of ["budget", "mid", "premium"] as PriceTier[]) {
      stats[tier].totalValue = Number(stats[tier].totalValue)
      stats[tier].totalQty = Number(stats[tier].totalQty)
    }
    return stats
  }, [binderItems])

  // Load binder when tier changes
  useEffect(() => {
    setLoading(true)
    setError(null)
    binderApi.loadBinder(activeTier)
      .then(setBinderItems)
      .catch(e => setError("Failed to load binder"))
      .finally(() => setLoading(false))
  }, [activeTier])

  // Add card to binder
  async function handleAddCard() {
    if (!addCardId) return
    setAdding(true)
    const card = inventoryItems.find(i => i.id === addCardId)
    if (!card) {
      setError("Card not found in inventory")
      setAdding(false)
      return
    }
    try {
      await binderApi.addToBinder(activeTier, card)
      setBinderItems(await binderApi.loadBinder(activeTier))
      setAddCardId("")
    } catch (e) {
      setError("Failed to add card")
    } finally {
      setAdding(false)
    }
  }

  // Remove card from binder
  async function handleRemoveCard(id: string) {
    setRemovingId(id)
    try {
      await binderApi.removeFromBinder(activeTier, id)
      setBinderItems(await binderApi.loadBinder(activeTier))
    } catch (e) {
      setError("Failed to remove card")
    } finally {
      setRemovingId(null)
    }
  }

  // Filtering and sorting
  const filteredItems = useMemo(() => {
    let result = [...binderItems]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.card.name.toLowerCase().includes(query) ||
        item.card.set.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
      )
    }
    if (filterCondition !== "all") {
      result = result.filter(item => item.condition === filterCondition)
    }
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        result.sort((a, b) => b.price - a.price)
        break
      case "name":
        result.sort((a, b) => a.card.name.localeCompare(b.card.name))
        break
      case "set":
        result.sort((a, b) => a.card.set.name.localeCompare(b.card.set.name))
        break
      case "rarity":
        result.sort(compareCardRarity)
        break
    }
    return result
  }, [binderItems, searchQuery, sortBy, filterCondition])

  const activeTierInfo = PRICE_TIERS.find(t => t.id === activeTier)!

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Sell Binders
        </h1>
        <p className="mt-2 text-muted-foreground">
          Cards organized by price tier for in-store binders
        </p>
      </div>

      {/* Price Tier Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {PRICE_TIERS.map((tier) => {
          const stats = tierStats[tier.id]
          const isActive = activeTier === tier.id
          
          return (
            <Card 
              key={tier.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isActive ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => setActiveTier(tier.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.label}</CardTitle>
                  <div className={`h-3 w-3 rounded-full ${tier.color}`} />
                </div>
                <CardDescription>
                  {tier.id === "budget" && "Great for casual players"}
                  {tier.id === "mid" && "Popular competitive cards"}
                  {tier.id === "premium" && "Rare and valuable cards"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stats.count} items</span>
                  <span className="font-semibold text-foreground">
                    ${stats.totalValue.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {stats.totalQty} total cards
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Active Tier Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full ${activeTierInfo.color}`} />
                {activeTierInfo.label} Binder
              </CardTitle>
              <CardDescription>
                {filteredItems.length} cards in this price range
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Print Binder List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cards..."
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
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="set">Set A-Z</SelectItem>
                <SelectItem value="rarity">Rarity</SelectItem>
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              Loading binder...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-medium text-foreground">No cards in this binder</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                {searchQuery || filterCondition !== "all"
                  ? "No cards match your filters"
                  : `Add cards to this binder below.`
                }
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="group overflow-hidden relative">
                  <Link href={`/inventory/${item.id}`}>
                    <div className="relative aspect-[2.5/3.5] w-full overflow-hidden bg-muted">
                      <img
                        src={item.customImage || item.card.images.small}
                        alt={item.card.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <Badge 
                        className={`absolute bottom-2 right-2 ${activeTierInfo.color} text-white border-0`}
                      >
                        ${item.price.toFixed(2)}
                      </Badge>
                    </div>
                  </Link>
                  <CardContent className="p-3">
                    <Link href={`/inventory/${item.id}`}>
                      <h3 className="truncate font-medium text-foreground hover:text-primary">
                        {item.card.name}
                      </h3>
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.card.set.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {getDisplayRarity(item.card.rarity, item.printFinish)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.condition}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    disabled={removingId === item.id}
                    onClick={() => handleRemoveCard(item.id)}
                  >
                    {removingId === item.id ? "Removing..." : "Remove"}
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 relative"
                >
                  <Link href={`/inventory/${item.id}`} className="shrink-0">
                    <img
                      src={item.customImage || item.card.images.small}
                      alt={item.card.name}
                      className="h-16 w-11 rounded object-cover"
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
                      {item.card.set.name} {item.card.number && `- #${item.card.number}`}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{item.condition}</Badge>
                      <Badge variant="outline" className="text-xs">{getDisplayRarity(item.card.rarity, item.printFinish)}</Badge>
                      <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                      <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      activeTier === "budget" ? "text-green-600" :
                      activeTier === "mid" ? "text-blue-600" :
                      "text-amber-600"
                    }`}>
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    disabled={removingId === item.id}
                    onClick={() => handleRemoveCard(item.id)}
                  >
                    {removingId === item.id ? "Removing..." : "Remove"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Card to Binder */}
      <div className="mt-8 mb-8">
        <h2 className="text-lg font-semibold mb-2">Add Card to Binder</h2>
        <div className="flex gap-2 items-center">
          <select
            value={addCardId}
            onChange={e => setAddCardId(e.target.value)}
            className="border rounded px-2 py-1 min-w-[200px]"
            disabled={adding}
          >
            <option value="">Select card from inventory...</option>
            {inventoryItems.map(card => (
              <option key={card.id} value={card.id}>
                {card.card.name} ({card.card.set.name}) - ${card.price}
              </option>
            ))}
          </select>
          <Button onClick={handleAddCard} disabled={adding || !addCardId}>
            {adding ? "Adding..." : "Add to Binder"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Budget Binder</p>
              <p className="text-xl font-semibold">{tierStats.budget.totalQty}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mid-Range Binder</p>
              <p className="text-xl font-semibold">{tierStats.mid.totalQty}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Premium Binder</p>
              <p className="text-xl font-semibold">{tierStats.premium.totalQty}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-xl font-semibold">
                ${(tierStats.budget.totalValue + tierStats.mid.totalValue + tierStats.premium.totalValue).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
