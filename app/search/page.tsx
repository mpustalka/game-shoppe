"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Package, ArrowRight } from "lucide-react"

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const [query, setQuery] = useState(initialQuery)
  const { items, searchItems } = useInventory()

  // Update query when URL param changes
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    return searchItems(query.trim())
  }, [query, searchItems])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Search Inventory</h1>
        <p className="mt-2 text-muted-foreground">
          Search your inventory by card name, set, SKU, or barcode
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-8 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, set, SKU, or barcode..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      {query.trim() === "" ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium">Start typing to search</h3>
          <p className="text-center text-sm text-muted-foreground">
            Search results will appear as you type
          </p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium">No results found</h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            No inventory items match &ldquo;{query}&rdquo;
          </p>
          <Button asChild variant="outline">
            <Link href="/add">Search Pokemon Database</Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Found {searchResults.length} item(s) matching &ldquo;{query}&rdquo;
          </p>
          <div className="space-y-3">
            {searchResults.map((item) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <img
                  src={item.card.images.small}
                  alt={item.card.name}
                  className="h-20 w-14 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{item.card.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.card.set.name} - #{item.card.number}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{item.condition}</Badge>
                    <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                    <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">${item.price.toFixed(2)}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-9 w-48 bg-muted rounded mb-8" />
          <div className="h-10 w-full max-w-xl bg-muted rounded" />
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
