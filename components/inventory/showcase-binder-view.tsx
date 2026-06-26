"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  CARD_CONDITIONS,
  type CardCondition,
  type InventoryItem,
} from "@/lib/types"
import {
  compareRarity,
  getAvailableRarities,
  getAvailableSets,
  getCardRarityLabel,
  rarityColors,
} from "@/lib/card-metadata"
import { SetFilter } from "@/components/inventory/set-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Filter,
  Grid3X3,
  List,
  Package,
  Search,
  Sparkles,
  X,
} from "lucide-react"

type ViewMode = "grid" | "list"
type SortOption =
  | "price-low"
  | "price-high"
  | "name"
  | "set"
  | "rarity-asc"
  | "rarity-desc"

interface ShowcaseBinderViewProps {
  title: string
  items: InventoryItem[]
  /** When set, each card shows a Remove button wired to this handler. */
  onRemove?: (id: string) => void
  removingId?: string | null
  /** Read-only public view hides edit affordances. */
  readOnly?: boolean
}

/**
 * Renders a showcase binder as a 9-ring binder page with the same search,
 * set/condition/rarity filters and price/name/set/rarity sorting the inventory
 * binders use. Shared by the manager page and the public /share view.
 */
export function ShowcaseBinderView({
  title,
  items,
  onRemove,
  removingId,
  readOnly = false,
}: ShowcaseBinderViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("price-low")
  const [filterCondition, setFilterCondition] = useState<CardCondition | "all">(
    "all",
  )
  const [filterRarity, setFilterRarity] = useState("all")
  const [filterSet, setFilterSet] = useState("all")

  const allRarities = useMemo(
    () => getAvailableRarities(items.map((item) => item.card)),
    [items],
  )
  const availableSets = useMemo(
    () => getAvailableSets(items.map((item) => item.card)),
    [items],
  )

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.card.name.toLowerCase().includes(query) ||
          item.card.set.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query),
      )
    }
    if (filterCondition !== "all") {
      result = result.filter((item) => item.condition === filterCondition)
    }
    if (filterRarity !== "all") {
      result = result.filter(
        (item) => getCardRarityLabel(item.card) === filterRarity,
      )
    }
    if (filterSet !== "all") {
      result = result.filter(
        (item) => (item.card.set.id || item.card.set.name) === filterSet,
      )
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
        result.sort(
          (a, b) =>
            compareRarity(
              getCardRarityLabel(a.card),
              getCardRarityLabel(b.card),
            ) || a.card.name.localeCompare(b.card.name),
        )
        break
      case "rarity-desc":
        result.sort(
          (a, b) =>
            compareRarity(
              getCardRarityLabel(b.card),
              getCardRarityLabel(a.card),
            ) || a.card.name.localeCompare(b.card.name),
        )
        break
    }
    return result
  }, [items, searchQuery, sortBy, filterCondition, filterRarity, filterSet])

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterCondition !== "all" ||
    filterRarity !== "all" ||
    filterSet !== "all"

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
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

        <Select
          value={filterCondition}
          onValueChange={(v) => setFilterCondition(v as CardCondition | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {CARD_CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
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
              <SelectItem key={rarity} value={rarity}>
                {rarity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SetFilter
          sets={availableSets}
          value={filterSet}
          onChange={setFilterSet}
          className="w-[200px]"
        />

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[170px]">
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

        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
          className="hidden sm:block"
        >
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
          <h3 className="mb-2 text-lg font-medium text-foreground">
            No cards to show
          </h3>
          <p className="text-center text-sm text-muted-foreground">
            {hasActiveFilters
              ? "No cards match your filters"
              : "This showcase is empty."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="rounded-[26px] border border-blue-200/80 bg-[linear-gradient(135deg,#fef3c7,#dbeafe_42%,#dcfce7)] p-3 shadow-xl shadow-blue-100/60 sm:p-5">
          <div className="relative overflow-hidden rounded-[20px] border border-white/80 bg-[radial-gradient(circle_at_18%_14%,rgba(239,68,68,.14),transparent_22%),radial-gradient(circle_at_88%_8%,rgba(37,99,235,.12),transparent_24%),linear-gradient(90deg,#f8fafc_0,#e0f2fe_10%,#fffefa_11%,#ffffff_100%)] p-4 pl-9 shadow-inner sm:p-6 sm:pl-14">
            {/* 9-ring binder spine */}
            <div className="absolute left-3 top-0 flex h-full flex-col justify-around py-8 sm:left-5">
              {Array.from({ length: 9 }).map((_, index) => (
                <span
                  key={index}
                  className="h-4 w-4 rounded-full border border-blue-300 bg-white shadow-[inset_0_1px_3px_rgba(37,99,235,.22),0_1px_0_rgba(255,255,255,.9)] sm:h-5 sm:w-5"
                />
              ))}
            </div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  shareable showcase
                </p>
                <h3 className="text-2xl font-bold text-slate-950">{title}</h3>
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
                  <div className="block h-full overflow-hidden rounded-lg bg-sky-50">
                    <img
                      src={item.customImage || item.card.images.small}
                      alt={item.card.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                  {(item.finish || "Normal") !== "Normal" && (
                    <div className="absolute inset-1 rounded-lg bg-[linear-gradient(125deg,transparent_15%,rgba(255,255,255,.68)_35%,transparent_52%,rgba(56,189,248,.22)_75%,transparent)] opacity-0 mix-blend-screen transition-opacity group-hover:opacity-100" />
                  )}
                  <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-1">
                    <Badge className="border-0 bg-blue-600 text-[10px] text-white shadow">
                      ${item.price.toFixed(2)}
                    </Badge>
                    {(item.finish || "Normal") !== "Normal" && (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-white/90 text-[10px] text-blue-950 shadow-sm"
                      >
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                        {item.finish}
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/92 p-2 text-slate-950 opacity-0 shadow-lg ring-1 ring-blue-100 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs font-semibold">
                      {item.card.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-600">
                      {item.condition} - Qty {item.quantity}
                    </p>
                    {!readOnly && onRemove && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-2 h-7 w-full"
                        disabled={removingId === item.id}
                        onClick={() => onRemove(item.id)}
                      >
                        {removingId === item.id ? "Removing..." : "Remove"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const body = (
              <>
                <img
                  src={item.customImage || item.card.images.small}
                  alt={item.card.name}
                  className="h-16 w-11 shrink-0 rounded object-cover"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">
                    {item.card.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.card.set.name}{" "}
                    {item.card.number && `- #${item.card.number}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.condition}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.finish || "Normal"}
                    </Badge>
                    {item.card.rarity && (
                      <Badge
                        className={`text-xs ${rarityColors[getCardRarityLabel(item.card)] || ""}`}
                      >
                        {getCardRarityLabel(item.card)}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-600">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
              </>
            )

            return (
              <div
                key={item.id}
                className="relative flex items-center gap-4 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                {body}
                {!readOnly && onRemove && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={removingId === item.id}
                    onClick={() => onRemove(item.id)}
                  >
                    {removingId === item.id ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
