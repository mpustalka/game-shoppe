"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { PRICE_TIERS, getPriceTier, type PriceTier, CARD_CONDITIONS, type CardCondition, type InventoryItem } from "@/lib/types"
import { compareRarity, getAvailableRarities, getCardRarityLabel, rarityColors } from "@/lib/card-metadata"
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
  Filter,
  Sparkles
} from "lucide-react"

type ViewMode = "grid" | "list"
type SortOption = "price-low" | "price-high" | "name" | "set" | "rarity-asc" | "rarity-desc"

export default function BindersPage() {

  const { items: inventoryItems } = useInventory()
  const [activeTier, setActiveTier] = useState<PriceTier>("budget")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("price-low")
  const [filterCondition, setFilterCondition] = useState<CardCondition | "all">("all")
  const [filterRarity, setFilterRarity] = useState("all")
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
    if (filterRarity !== "all") {
      result = result.filter(item => getCardRarityLabel(item.card) === filterRarity)
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
      case "rarity-asc":
        result.sort((a, b) => compareRarity(getCardRarityLabel(a.card), getCardRarityLabel(b.card)) || a.card.name.localeCompare(b.card.name))
        break
      case "rarity-desc":
        result.sort((a, b) => compareRarity(getCardRarityLabel(b.card), getCardRarityLabel(a.card)) || a.card.name.localeCompare(b.card.name))
        break
    }
    return result
  }, [binderItems, searchQuery, sortBy, filterCondition, filterRarity])

  const activeTierInfo = PRICE_TIERS.find(t => t.id === activeTier)!
  const allRarities = useMemo(() => getAvailableRarities(binderItems.map((item) => item.card)), [binderItems])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_6%,rgba(255,213,79,.34),transparent_28%),radial-gradient(circle_at_92%_2%,rgba(59,130,246,.18),transparent_24%),linear-gradient(180deg,#fffdf4_0%,#f4fbff_48%,#fff9ea_100%)]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-yellow-200/70 bg-white/72 p-5 shadow-sm backdrop-blur">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-red-500 bg-white shadow-sm">
            <BookOpen className="h-6 w-6 text-blue-700" />
          </span>
          Sell Binders
        </h1>
        <p className="mt-2 text-slate-600">
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
              className={`cursor-pointer border-yellow-200/80 bg-white/82 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${
                isActive ? "border-blue-500 ring-2 ring-yellow-300/50" : ""
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
      <Card className="border-blue-100/80 bg-white/88 shadow-xl shadow-blue-100/40 backdrop-blur">
        <CardHeader className="border-b border-yellow-100 bg-[linear-gradient(90deg,rgba(255,236,153,.55),rgba(219,234,254,.48),rgba(220,252,231,.38))]">
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

            <Select value={filterRarity} onValueChange={setFilterRarity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                {allRarities.map((rarity) => (
                  <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>
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
                <SelectItem value="rarity-asc">Rarity: Common to Secret</SelectItem>
                <SelectItem value="rarity-desc">Rarity: Secret to Common</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="set">Set A-Z</SelectItem>
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
            <div className="rounded-[26px] border border-blue-200/80 bg-[linear-gradient(135deg,#fef3c7,#dbeafe_42%,#dcfce7)] p-3 shadow-xl shadow-blue-100/60 sm:p-5">
              <div className="relative overflow-hidden rounded-[20px] border border-white/80 bg-[radial-gradient(circle_at_18%_14%,rgba(239,68,68,.14),transparent_22%),radial-gradient(circle_at_88%_8%,rgba(37,99,235,.12),transparent_24%),linear-gradient(90deg,#f8fafc_0,#e0f2fe_10%,#fffefa_11%,#ffffff_100%)] p-4 pl-9 shadow-inner sm:p-6 sm:pl-14">
                <div className="absolute left-3 top-0 flex h-full flex-col justify-around py-8 sm:left-5">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <span key={index} className="h-4 w-4 rounded-full border border-blue-300 bg-white shadow-[inset_0_1px_3px_rgba(37,99,235,.22),0_1px_0_rgba(255,255,255,.9)] sm:h-5 sm:w-5" />
                  ))}
                </div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">light league binder</p>
                    <h3 className="text-2xl font-bold text-slate-950">{activeTierInfo.label} Sell Binder</h3>
                  </div>
                  <div className="rounded-full border border-yellow-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    {filteredItems.length} listings
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-[2.5/3.5] rounded-xl border border-blue-100 bg-white/72 p-1 shadow-[inset_0_0_18px_rgba(37,99,235,.08),0_10px_22px_rgba(15,23,42,.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"
                    >
                      <div className="absolute inset-1 rounded-md bg-[linear-gradient(115deg,rgba(255,255,255,.7),rgba(255,255,255,.08)_42%,rgba(255,255,255,.35)_58%,rgba(255,255,255,.05))] opacity-70 pointer-events-none" />
                      <Link href={`/inventory/${item.id}`} className="block h-full overflow-hidden rounded-lg bg-sky-50">
                        <img
                          src={item.customImage || item.card.images.small}
                          alt={item.card.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      </Link>
                      {(item.finish || "Normal") !== "Normal" && (
                        <div className="absolute inset-1 rounded-lg bg-[linear-gradient(125deg,transparent_15%,rgba(255,255,255,.68)_35%,transparent_52%,rgba(56,189,248,.22)_75%,transparent)] opacity-0 mix-blend-screen transition-opacity group-hover:opacity-100" />
                      )}
                      <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-1">
                        <Badge className={`${activeTierInfo.color} border-0 text-[10px] text-white shadow`}>
                          ${item.price.toFixed(2)}
                        </Badge>
                        {(item.finish || "Normal") !== "Normal" && (
                          <Badge variant="secondary" className="gap-1 bg-white/90 text-[10px] text-blue-950 shadow-sm">
                            <Sparkles className="h-3 w-3 text-yellow-500" />
                            {item.finish}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/92 p-2 text-slate-950 opacity-0 shadow-lg ring-1 ring-blue-100 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-xs font-semibold">{item.card.name}</p>
                        <p className="truncate text-[11px] text-slate-600">{item.condition} - Qty {item.quantity}</p>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="mt-2 h-7 w-full"
                          disabled={removingId === item.id}
                          onClick={() => handleRemoveCard(item.id)}
                        >
                          {removingId === item.id ? "Removing..." : "Remove"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                      <Badge variant="outline" className="text-xs">{item.finish || "Normal"}</Badge>
                      {item.card.rarity && (
                        <Badge className={`text-xs ${rarityColors[getCardRarityLabel(item.card)] || ""}`}>
                          {getCardRarityLabel(item.card)}
                        </Badge>
                      )}
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
    </div>
  )
}
