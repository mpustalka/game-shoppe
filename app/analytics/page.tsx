"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { getCardRarityLabel, rarityColors } from "@/lib/card-metadata"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Boxes, DollarSign, Search, Star, TrendingUp } from "lucide-react"

type SearchSummary = {
  topSearches: { query: string; searches: number; last_result_count: number }[]
  dailySearches: { day: string; searches: number }[]
}

export default function AnalyticsPage() {
  const { items } = useInventory()
  const [searchSummary, setSearchSummary] = useState<SearchSummary>({ topSearches: [], dailySearches: [] })

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setSearchSummary(data)
      })
      .catch(() => undefined)
  }, [])

  const analytics = useMemo(() => {
    const soldItems = [...items].filter((item) => (item.quantitySold || 0) > 0)
    const totalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const soldValue = soldItems.reduce((sum, item) => sum + item.price * (item.quantitySold || 0), 0)
    const totalSold = soldItems.reduce((sum, item) => sum + (item.quantitySold || 0), 0)

    const setMap = new Map<string, { name: string; count: number; sold: number; value: number }>()
    const rarityMap = new Map<string, { rarity: string; count: number; value: number }>()

    for (const item of items) {
      const setName = item.card.set.name
      const set = setMap.get(setName) ?? { name: setName, count: 0, sold: 0, value: 0 }
      set.count += item.quantity
      set.sold += item.quantitySold || 0
      set.value += item.price * item.quantity
      setMap.set(setName, set)

      const rarityName = getCardRarityLabel(item.card)
      const rarity = rarityMap.get(rarityName) ?? { rarity: rarityName, count: 0, value: 0 }
      rarity.count += item.quantity
      rarity.value += item.price * item.quantity
      rarityMap.set(rarityName, rarity)
    }

    return {
      totalValue,
      soldValue,
      totalSold,
      topSold: soldItems.sort((a, b) => (b.quantitySold || 0) - (a.quantitySold || 0)).slice(0, 8),
      popularSets: Array.from(setMap.values()).sort((a, b) => b.sold - a.sold || b.count - a.count).slice(0, 8),
      rarityMix: Array.from(rarityMap.values()).sort((a, b) => b.value - a.value).slice(0, 8),
    }
  }, [items])

  const maxDailySearches = Math.max(1, ...searchSummary.dailySearches.map((item) => item.searches))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics
          </h1>
          <p className="mt-2 text-muted-foreground">Search demand, sold cards, set popularity, and inventory value.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/inventory">Review Inventory</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric title="Inventory Value" value={`$${analytics.totalValue.toFixed(2)}`} icon={DollarSign} />
        <Metric title="Sold Revenue" value={`$${analytics.soldValue.toFixed(2)}`} icon={TrendingUp} />
        <Metric title="Cards Sold" value={analytics.totalSold.toString()} icon={Boxes} />
        <Metric title="Tracked Searches" value={searchSummary.topSearches.reduce((sum, item) => sum + item.searches, 0).toString()} icon={Search} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Most Searched Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {searchSummary.topSearches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Search activity will appear here after customers use inventory search.</p>
            ) : (
              searchSummary.topSearches.map((item, index) => (
                <div key={item.query} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium capitalize">{index + 1}. {item.query}</p>
                    <p className="text-xs text-muted-foreground">{item.last_result_count} latest results</p>
                  </div>
                  <Badge variant="secondary">{item.searches} searches</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14-Day Search Trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchSummary.dailySearches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No search trend data yet.</p>
            ) : (
              searchSummary.dailySearches.map((item) => (
                <div key={item.day} className="grid grid-cols-[56px_1fr_34px] items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{item.day}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(item.searches / maxDailySearches) * 100}%` }} />
                  </div>
                  <span className="text-right font-medium">{item.searches}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ListCard title="Most Sold Cards">
          {analytics.topSold.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sold cards will appear after sales are recorded.</p>
          ) : (
            analytics.topSold.map((item) => (
              <Link key={item.id} href={`/inventory/${item.id}`} className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50">
                <img src={item.customImage || item.card.images.small} alt={item.card.name} className="h-14 w-10 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.card.name}</p>
                  <p className="text-xs text-muted-foreground">{item.card.set.name}</p>
                </div>
                <Badge>{item.quantitySold} sold</Badge>
              </Link>
            ))
          )}
        </ListCard>

        <ListCard title="Popular Sets">
          {analytics.popularSets.map((set) => (
            <div key={set.name} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-medium">{set.name}</p>
                <Badge variant="secondary">{set.sold} sold</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{set.count} in stock · ${set.value.toFixed(2)} value</p>
            </div>
          ))}
        </ListCard>

        <ListCard title="Rarity Value Mix">
          {analytics.rarityMix.map((item) => (
            <div key={item.rarity} className="flex items-center justify-between rounded-md border border-border p-3">
              <Badge className={rarityColors[item.rarity] || ""}>{item.rarity}</Badge>
              <div className="text-right text-sm">
                <p className="font-medium">${item.value.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{item.count} cards</p>
              </div>
            </div>
          ))}
        </ListCard>
      </div>
    </div>
  )
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof DollarSign }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ListCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}
