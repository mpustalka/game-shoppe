"use client"

import { useEffect, useMemo, useState } from "react"
import { useInventory } from "@/lib/inventory-context"
import * as binderApi from "@/lib/binders"
import {
  CARD_CONDITIONS,
  PRICE_TIERS,
  type CardCondition,
  type InventoryItem,
  type PriceTier,
} from "@/lib/types"
import {
  compareRarity,
  getAvailableRarities,
  getAvailableSets,
  getCardRarityLabel,
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
import { Check, Filter, Package, Plus, Search, X } from "lucide-react"

type SourceMode = "inventory" | "binder"
type SortOption = "price-low" | "price-high" | "name" | "set"

interface ShowcaseCardPickerProps {
  /** IDs already in the active showcase — excluded from results. */
  existingIds: Set<string>
  /** Add the chosen card to the showcase. */
  onAdd: (card: InventoryItem) => void
  /** True while an add request is in flight. */
  busy?: boolean
  /** True when the showcase is at its card limit — disables adding. */
  disabled?: boolean
  /** ID of the card currently being added, for the per-row spinner. */
  addingId?: string | null
}

/**
 * Searchable card picker for adding cards to a Showcase. Cards can be sourced
 * from the full inventory or from an existing Sell Binder (price tier +
 * language), and narrowed with the same free-text / set / condition / rarity
 * search the binder views use — far friendlier than one very long dropdown.
 */
export function ShowcaseCardPicker({
  existingIds,
  onAdd,
  busy = false,
  disabled = false,
  addingId = null,
}: ShowcaseCardPickerProps) {
  const { items: inventoryItems } = useInventory()

  const [source, setSource] = useState<SourceMode>("inventory")
  const [tier, setTier] = useState<PriceTier>("budget")
  const [language, setLanguage] = useState<"en" | "ja">("en")
  const [binderItems, setBinderItems] = useState<InventoryItem[]>([])
  const [binderLoading, setBinderLoading] = useState(false)
  const [binderError, setBinderError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterCondition, setFilterCondition] = useState<CardCondition | "all">(
    "all",
  )
  const [filterRarity, setFilterRarity] = useState("all")
  const [filterSet, setFilterSet] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("name")

  // Load the selected binder whenever the source/tier/language changes.
  useEffect(() => {
    if (source !== "binder") return
    let cancelled = false
    setBinderLoading(true)
    setBinderError(null)
    binderApi
      .loadBinder(tier, language)
      .then((items) => {
        if (!cancelled) setBinderItems(items)
      })
      .catch(() => {
        if (!cancelled) setBinderError("Failed to load binder")
      })
      .finally(() => {
        if (!cancelled) setBinderLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [source, tier, language])

  // The pool of cards we search within, before any filtering.
  const pool = source === "inventory" ? inventoryItems : binderItems

  const allRarities = useMemo(
    () => getAvailableRarities(pool.map((item) => item.card)),
    [pool],
  )
  const availableSets = useMemo(
    () => getAvailableSets(pool.map((item) => item.card)),
    [pool],
  )

  const results = useMemo(() => {
    let result = pool.filter((item) => !existingIds.has(item.id))
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
        result = [...result].sort((a, b) => a.price - b.price)
        break
      case "price-high":
        result = [...result].sort((a, b) => b.price - a.price)
        break
      case "name":
        result = [...result].sort((a, b) =>
          a.card.name.localeCompare(b.card.name),
        )
        break
      case "set":
        result = [...result].sort((a, b) =>
          a.card.set.name.localeCompare(b.card.set.name),
        )
        break
    }
    return result
  }, [
    pool,
    existingIds,
    searchQuery,
    filterCondition,
    filterRarity,
    filterSet,
    sortBy,
  ])

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filterCondition !== "all" ||
    filterRarity !== "all" ||
    filterSet !== "all"

  function resetFilters() {
    setSearchQuery("")
    setFilterCondition("all")
    setFilterRarity("all")
    setFilterSet("all")
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-slate-50/70 p-4">
      {/* Source: inventory vs binder */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={source}
          onValueChange={(v) => {
            setSource(v as SourceMode)
            resetFilters()
          }}
        >
          <TabsList>
            <TabsTrigger value="inventory">From Inventory</TabsTrigger>
            <TabsTrigger value="binder">From a Binder</TabsTrigger>
          </TabsList>
        </Tabs>

        {source === "binder" && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={tier}
              onValueChange={(v) => setTier(v as PriceTier)}
            >
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_TIERS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as "en" | "ja")}
            >
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Search + filters (same controls as the binder views) */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, set or SKU…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white pl-9"
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
          <SelectTrigger className="w-[160px] bg-white">
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
          <SelectTrigger className="w-[170px] bg-white">
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
          className="w-[190px] bg-white"
        />

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name A-Z</SelectItem>
            <SelectItem value="set">Set A-Z</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {source === "binder"
            ? "Cards in the selected binder"
            : "Cards in inventory"}
        </span>
        <span>{results.length} match</span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-white">
        {source === "binder" && binderLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading binder…
          </div>
        ) : source === "binder" && binderError ? (
          <div className="py-12 text-center text-sm text-red-500">
            {binderError}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {pool.length === 0
                ? source === "binder"
                  ? "This binder has no cards yet."
                  : "No cards in inventory yet."
                : hasActiveFilters
                  ? "No cards match your search."
                  : "Every card here is already in this showcase."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {results.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 p-2 hover:bg-muted/50"
              >
                <img
                  src={item.customImage || item.card.images.small}
                  alt={item.card.name}
                  className="h-12 w-9 shrink-0 rounded object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.card.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.card.set.name}
                    {item.card.number ? ` · #${item.card.number}` : ""}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.condition}
                    </Badge>
                    {(item.finish || "Normal") !== "Normal" && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.finish}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-blue-600">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={disabled || busy}
                  onClick={() => onAdd(item)}
                >
                  {addingId === item.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">Add</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
