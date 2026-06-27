"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { getCardRarityLabel, rarityColors } from "@/lib/card-metadata"
import {
  getFinancialSummary,
  getRarityBreakdown,
  getConditionBreakdown,
  getFinishBreakdown,
  getTopPositions,
  getDeadStock,
  itemMarketValue,
} from "@/lib/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Clock,
  DollarSign,
  Flame,
  LineChart,
  PiggyBank,
  Search,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"

type Mover = {
  cardId: string
  name: string
  set: string
  finish: string
  first: number
  last: number
  change: number
  changePercent: number
}

type Summary = {
  days: number
  topSearches: { query: string; searches: number; last_result_count: number }[]
  dailySearches: { day: string; searches: number }[]
  totalSearches: number
  unmetDemand: { query: string; searches: number }[]
  sales: {
    hasData: boolean
    revenue: number
    cost: number
    profit: number
    units: number
    roi: number
    margin: number
    avgSalePrice: number
    daily: { day: string; revenue: number; units: number }[]
    topByRevenue: {
      name: string
      set: string
      units: number
      revenue: number
      profit: number
    }[]
  }
  priceMovers: {
    trackedCards: number
    gainers: Mover[]
    losers: Mover[]
  }
}

type StreakInsight = {
  cardId: string
  name: string
  set: string
  finish: string
  weeks: number
  last: number
  changePercent: number
}

type UnusualInsight = {
  cardId: string
  name: string
  set: string
  finish: string
  last: number
  changePercent: number
  z: number
  direction: "up" | "down"
}

type Insights = {
  trackedCards: number
  daysTracked: number
  weeksTracked: number
  threshold: number
  bigGainers: Mover[]
  bigDrops: Mover[]
  gainStreaks: StreakInsight[]
  unusual: UnusualInsight[]
}

const EMPTY_INSIGHTS: Insights = {
  trackedCards: 0,
  daysTracked: 0,
  weeksTracked: 0,
  threshold: 10,
  bigGainers: [],
  bigDrops: [],
  gainStreaks: [],
  unusual: [],
}

const EMPTY_SUMMARY: Summary = {
  days: 30,
  topSearches: [],
  dailySearches: [],
  totalSearches: 0,
  unmetDemand: [],
  sales: {
    hasData: false,
    revenue: 0,
    cost: 0,
    profit: 0,
    units: 0,
    roi: 0,
    margin: 0,
    avgSalePrice: 0,
    daily: [],
    topByRevenue: [],
  },
  priceMovers: { trackedCards: 0, gainers: [], losers: [] },
}

const WINDOWS = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
]

const usd = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const pct = (value: number) => `${value >= 0 ? "" : ""}${value.toFixed(1)}%`

export default function AnalyticsPage() {
  const { items } = useInventory()
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY)
  const [insights, setInsights] = useState<Insights>(EMPTY_INSIGHTS)
  const snapshotSent = useRef(false)

  useEffect(() => {
    fetch(`/api/analytics/summary?days=${days}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setSummary(data)
      })
      .catch(() => undefined)
  }, [days])

  useEffect(() => {
    fetch("/api/analytics/insights")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setInsights(data)
      })
      .catch(() => undefined)
  }, [])

  // Capture today's price reading for every inventory line, once per visit.
  // The server keeps one row per card+finish per day, so this safely seeds the
  // price-history that drives the "price movers" view over time.
  useEffect(() => {
    if (snapshotSent.current || items.length === 0) return
    snapshotSent.current = true

    const snapshots = items
      .filter((item) => itemMarketValue(item) > 0)
      .map((item) => ({
        cardId: item.cardId,
        cardName: item.card.name,
        setName: item.card.set.name,
        finish: item.finish,
        marketPrice: itemMarketValue(item),
      }))

    if (snapshots.length === 0) return

    fetch("/api/analytics/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshots }),
    }).catch(() => undefined)
  }, [items])

  const fin = useMemo(() => getFinancialSummary(items), [items])

  const inventory = useMemo(() => {
    const setMap = new Map<
      string,
      {
        name: string
        count: number
        sold: number
        value: number
        uniqueCards: Set<string>
        totalSetCards: number
      }
    >()

    for (const item of items) {
      const setName = item.card.set.name
      const set = setMap.get(setName) ?? {
        name: setName,
        count: 0,
        sold: 0,
        value: 0,
        uniqueCards: new Set<string>(),
        totalSetCards: item.card.set.total || 0,
      }
      set.count += item.quantity
      set.sold += item.quantitySold || 0
      set.value += itemMarketValue(item) * item.quantity
      set.uniqueCards.add(item.card.id)
      setMap.set(setName, set)
    }

    return {
      topSold: [...items]
        .filter((item) => (item.quantitySold || 0) > 0)
        .sort((a, b) => (b.quantitySold || 0) - (a.quantitySold || 0))
        .slice(0, 8),
      popularSets: Array.from(setMap.values())
        .map((set) => ({
          ...set,
          completionPercent:
            set.totalSetCards > 0
              ? (set.uniqueCards.size / set.totalSetCards) * 100
              : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      rarity: getRarityBreakdown(items).slice(0, 8),
      condition: getConditionBreakdown(items),
      finish: getFinishBreakdown(items).slice(0, 8),
      topPositions: getTopPositions(items),
      deadStock: getDeadStock(items),
    }
  }, [items])

  const { sales, priceMovers } = summary

  // Prefer the exact ledger; fall back to the inventory-derived estimate when
  // no sales have been recorded through the ledger yet.
  const realizedRevenue = sales.hasData ? sales.revenue : fin.realizedRevenue
  const realizedProfit = sales.hasData ? sales.profit : fin.realizedProfit
  const realizedMargin = sales.hasData ? sales.margin : fin.realizedMargin
  const unitsSold = sales.hasData ? sales.units : fin.unitsSold
  const avgSalePrice = sales.hasData ? sales.avgSalePrice : fin.avgSalePrice

  const maxDailySearches = Math.max(
    1,
    ...summary.dailySearches.map((item) => item.searches),
  )
  const maxDailyRevenue = Math.max(
    1,
    ...sales.daily.map((item) => item.revenue),
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics
          </h1>
          <p className="mt-2 text-muted-foreground">
            Inventory value, realized ROI, price movement, sales, and search
            demand.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-border p-1">
            {WINDOWS.map((window) => (
              <button
                key={window.days}
                onClick={() => setDays(window.days)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === window.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {window.label}
              </button>
            ))}
          </div>
          <Button asChild>
            <Link href="/analytics/collection">Collection Insights</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inventory">Inventory</Link>
          </Button>
        </div>
      </div>

      {/* Financial position */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          title="Inventory Value"
          value={usd(fin.inventoryValue)}
          sub={`${fin.unitsOnHand.toLocaleString()} cards on hand`}
          icon={DollarSign}
        />
        <Metric
          title="Cost Basis"
          value={usd(fin.inventoryCost)}
          sub="Total paid for current stock"
          icon={PiggyBank}
        />
        <Metric
          title="Unrealized P/L"
          value={usd(fin.unrealizedProfit)}
          sub={`${pct(fin.unrealizedRoi)} ROI vs cost`}
          tone={fin.unrealizedProfit >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
        />
        <Metric
          title={`Realized Revenue · ${days}D`}
          value={usd(realizedRevenue)}
          sub={
            sales.hasData
              ? `${unitsSold.toLocaleString()} cards sold`
              : "Estimated from sold counts"
          }
          icon={LineChart}
        />
        <Metric
          title="Realized Profit"
          value={usd(realizedProfit)}
          sub={`${pct(realizedMargin)} margin`}
          tone={realizedProfit >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
        />
        <Metric
          title="Sell-Through"
          value={pct(fin.sellThrough)}
          sub="Sold ÷ (sold + on hand)"
          icon={Boxes}
        />
        <Metric
          title="Avg Sale Price"
          value={usd(avgSalePrice)}
          sub={`${unitsSold.toLocaleString()} cards sold`}
          icon={DollarSign}
        />
        <Metric
          title={`Searches · ${days}D`}
          value={summary.totalSearches.toLocaleString()}
          sub={`${summary.topSearches.length} unique terms`}
          icon={Search}
        />
      </div>

      {/* Price movers — the price-increase tracker */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ListCard
          title="Top Price Increases"
          icon={TrendingUp}
          hint={`${priceMovers.trackedCards} cards tracked`}
        >
          {priceMovers.gainers.length === 0 ? (
            <EmptyMovers />
          ) : (
            priceMovers.gainers.map((mover) => (
              <MoverRow key={`${mover.cardId}-${mover.finish}`} mover={mover} />
            ))
          )}
        </ListCard>
        <ListCard title="Top Price Drops" icon={TrendingDown}>
          {priceMovers.losers.length === 0 ? (
            <EmptyMovers />
          ) : (
            priceMovers.losers.map((mover) => (
              <MoverRow key={`${mover.cardId}-${mover.finish}`} mover={mover} />
            ))
          )}
        </ListCard>
      </div>

      {/* Smart insights — watchlist-style alerts on top of the price history */}
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Insights & Alerts</h2>
        <span className="text-xs font-normal text-muted-foreground">
          {insights.trackedCards} cards · {insights.daysTracked} day
          {insights.daysTracked === 1 ? "" : "s"} of history
        </span>
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ListCard
          title={`Up more than ${insights.threshold}% this week`}
          icon={TrendingUp}
          hint={insights.bigGainers.length ? `${insights.bigGainers.length} cards` : undefined}
        >
          {insights.bigGainers.length === 0 ? (
            <InsightEmpty
              ready={insights.daysTracked >= 2}
              label="No cards are up more than 10% over the last week yet."
            />
          ) : (
            insights.bigGainers.map((mover) => (
              <MoverRow key={`${mover.cardId}-${mover.finish}`} mover={mover} />
            ))
          )}
        </ListCard>

        <ListCard
          title={`Down more than ${insights.threshold}% this week`}
          icon={TrendingDown}
          hint={insights.bigDrops.length ? `${insights.bigDrops.length} cards` : undefined}
        >
          {insights.bigDrops.length === 0 ? (
            <InsightEmpty
              ready={insights.daysTracked >= 2}
              label="No cards are down more than 10% over the last week yet."
            />
          ) : (
            insights.bigDrops.map((mover) => (
              <MoverRow key={`${mover.cardId}-${mover.finish}`} mover={mover} />
            ))
          )}
        </ListCard>

        <ListCard
          title="On a winning streak"
          icon={Flame}
          hint={insights.gainStreaks.length ? `${insights.gainStreaks.length} cards` : undefined}
        >
          {insights.gainStreaks.length === 0 ? (
            <InsightEmpty
              ready={insights.weeksTracked >= 4}
              label="Cards with 3+ consecutive weeks of gains will appear here."
              weekly
            />
          ) : (
            insights.gainStreaks.map((s) => (
              <StreakRow key={`${s.cardId}-${s.finish}`} streak={s} />
            ))
          )}
        </ListCard>

        <ListCard
          title="Unusual movement"
          icon={Zap}
          hint={insights.unusual.length ? `${insights.unusual.length} cards` : undefined}
        >
          {insights.unusual.length === 0 ? (
            <InsightEmpty
              ready={insights.weeksTracked >= 5}
              label="Cards moving far outside their normal weekly trend will appear here."
              weekly
            />
          ) : (
            insights.unusual.map((u) => (
              <UnusualRow key={`${u.cardId}-${u.finish}`} unusual={u} />
            ))
          )}
        </ListCard>
      </div>

      {/* Sales */}
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                Sales Revenue · last {days} days
              </span>
              {sales.hasData && (
                <Badge variant="secondary">{pct(sales.roi)} ROI</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sales.daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Recorded sales will chart here. Sales logged through the
                inventory sale action build this trend with exact revenue and
                profit.
              </p>
            ) : (
              sales.daily.map((entry) => (
                <div
                  key={entry.day}
                  className="grid grid-cols-[56px_1fr_72px] items-center gap-2 text-sm"
                >
                  <span className="text-muted-foreground">{entry.day}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(entry.revenue / maxDailyRevenue) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-right font-medium">
                    {usd(entry.revenue)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <ListCard title="Best Sellers by Revenue" icon={Star}>
          {(sales.hasData ? sales.topByRevenue : []).length === 0 &&
          inventory.topSold.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sold cards appear after sales are recorded.
            </p>
          ) : sales.hasData && sales.topByRevenue.length > 0 ? (
            sales.topByRevenue.map((card) => (
              <div
                key={`${card.name}-${card.set}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{card.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {card.set} · {card.units} sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{usd(card.revenue)}</p>
                  <p className="text-xs text-muted-foreground">
                    {usd(card.profit)} profit
                  </p>
                </div>
              </div>
            ))
          ) : (
            inventory.topSold.map((item) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50"
              >
                <img
                  src={item.customImage || item.card.images.small}
                  alt={item.card.name}
                  className="h-14 w-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.card.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.card.set.name}
                  </p>
                </div>
                <Badge>{item.quantitySold} sold</Badge>
              </Link>
            ))
          )}
        </ListCard>
      </div>

      {/* Search demand */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <ListCard title="Most Searched" icon={Search}>
          {summary.topSearches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Search activity appears here after customers use inventory search.
            </p>
          ) : (
            summary.topSearches.slice(0, 8).map((item, index) => (
              <div
                key={item.query}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <p className="min-w-0 truncate font-medium capitalize">
                  {index + 1}. {item.query}
                </p>
                <Badge variant="secondary">{item.searches}</Badge>
              </div>
            ))
          )}
        </ListCard>

        <ListCard title="Restock Signals" icon={Search} hint="Searched, 0 in stock">
          {summary.unmetDemand.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No unmet search demand in this window.
            </p>
          ) : (
            summary.unmetDemand.map((item) => (
              <div
                key={item.query}
                className="flex items-center justify-between gap-3 rounded-md border border-amber-300/60 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-900/10"
              >
                <p className="min-w-0 truncate font-medium capitalize">
                  {item.query}
                </p>
                <Badge variant="secondary">{item.searches} searches</Badge>
              </div>
            ))
          )}
        </ListCard>

        <ListCard title="14-Day Search Trend" icon={BarChart3}>
          {summary.dailySearches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No search trend data yet.
            </p>
          ) : (
            summary.dailySearches.map((item) => (
              <div
                key={item.day}
                className="grid grid-cols-[56px_1fr_34px] items-center gap-2 text-sm"
              >
                <span className="text-muted-foreground">{item.day}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(item.searches / maxDailySearches) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-right font-medium">{item.searches}</span>
              </div>
            ))
          )}
        </ListCard>
      </div>

      {/* Inventory breakdowns */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <ListCard title="Set Performance" icon={Boxes}>
          {inventory.popularSets.map((set) => (
            <div key={set.name} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-medium">{set.name}</p>
                <Badge variant="secondary">{set.sold} sold</Badge>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {set.count} in stock · {usd(set.value)} value
                </p>
                <p className="text-xs text-muted-foreground">
                  {set.uniqueCards.size}/{set.totalSetCards} cards ·{" "}
                  {set.completionPercent.toFixed(1)}% complete
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${set.completionPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </ListCard>

        <ListCard title="Value by Rarity" icon={Star}>
          {inventory.rarity.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <Badge className={rarityColors[item.key] || ""}>{item.key}</Badge>
              <div className="text-right text-sm">
                <p className="font-medium">{usd(item.value)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.units} cards
                </p>
              </div>
            </div>
          ))}
        </ListCard>

        <ListCard title="Stock by Condition" icon={Boxes}>
          {inventory.condition.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <span className="font-medium">{item.key}</span>
              <div className="text-right text-sm">
                <p className="font-medium">{item.units} cards</p>
                <p className="text-xs text-muted-foreground">
                  {usd(item.value)}
                </p>
              </div>
            </div>
          ))}
        </ListCard>
      </div>

      {/* Positions & dead stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard title="Highest-Value Positions" icon={DollarSign}>
          {inventory.topPositions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock yet.</p>
          ) : (
            inventory.topPositions.map(({ item, value }) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50"
              >
                <img
                  src={item.customImage || item.card.images.small}
                  alt={item.card.name}
                  className="h-14 w-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.card.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.quantity} × {usd(itemMarketValue(item))} ·{" "}
                    {getCardRarityLabel(item.card)}
                  </p>
                </div>
                <span className="font-semibold">{usd(value)}</span>
              </Link>
            ))
          )}
        </ListCard>

        <ListCard
          title="Aging Stock"
          icon={Clock}
          hint="60+ days, never sold"
        >
          {inventory.deadStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No aging stock — everything is moving.
            </p>
          ) : (
            inventory.deadStock.map(({ item, value, ageDays }) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50"
              >
                <img
                  src={item.customImage || item.card.images.small}
                  alt={item.card.name}
                  className="h-14 w-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.card.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.quantity} in stock · {usd(value)} tied up
                  </p>
                </div>
                <Badge variant="outline">{ageDays}d</Badge>
              </Link>
            ))
          )}
        </ListCard>
      </div>
    </div>
  )
}

function Metric({
  title,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  title: string
  value: string
  sub?: string
  icon: typeof DollarSign
  tone?: "neutral" | "positive" | "negative"
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground"

  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-xl font-semibold ${toneClass}`}>{value}</p>
          {sub && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {sub}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ListCard({
  title,
  icon: Icon = Star,
  hint,
  children,
}: {
  title: string
  icon?: typeof Star
  hint?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </span>
          {hint && (
            <span className="text-xs font-normal text-muted-foreground">
              {hint}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function MoverRow({ mover }: { mover: Mover }) {
  const up = mover.change > 0
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{mover.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {mover.set ? `${mover.set} · ` : ""}
          {mover.finish} · {usd(mover.first)} → {usd(mover.last)}
        </p>
      </div>
      <div
        className={`flex items-center gap-1 text-right font-semibold ${
          up
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {up ? (
          <ArrowUpRight className="h-4 w-4" />
        ) : (
          <ArrowDownRight className="h-4 w-4" />
        )}
        {up ? "+" : ""}
        {mover.changePercent.toFixed(1)}%
      </div>
    </div>
  )
}

function EmptyMovers() {
  return (
    <p className="text-sm text-muted-foreground">
      Price movement needs at least two days of readings. A snapshot of every
      card&apos;s market value is now captured automatically each day — check
      back tomorrow to see gainers and drops.
    </p>
  )
}

function StreakRow({ streak }: { streak: StreakInsight }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{streak.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {streak.set ? `${streak.set} · ` : ""}
          {streak.finish} · now {usd(streak.last)}
        </p>
      </div>
      <div className="flex flex-col items-end">
        <Badge variant="secondary" className="gap-1">
          <Flame className="h-3.5 w-3.5" />
          {streak.weeks} wks up
        </Badge>
        <span className="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          +{streak.changePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function UnusualRow({ unusual }: { unusual: UnusualInsight }) {
  const up = unusual.direction === "up"
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{unusual.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {unusual.set ? `${unusual.set} · ` : ""}
          {unusual.finish} · now {usd(unusual.last)} ·{" "}
          {Math.abs(unusual.z).toFixed(1)}× normal
        </p>
      </div>
      <div
        className={`flex items-center gap-1 text-right font-semibold ${
          up
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {up ? (
          <ArrowUpRight className="h-4 w-4" />
        ) : (
          <ArrowDownRight className="h-4 w-4" />
        )}
        {up ? "+" : ""}
        {unusual.changePercent.toFixed(1)}%
      </div>
    </div>
  )
}

function InsightEmpty({
  ready,
  label,
  weekly,
}: {
  ready: boolean
  label: string
  weekly?: boolean
}) {
  if (ready) {
    return <p className="text-sm text-muted-foreground">{label}</p>
  }
  return (
    <p className="text-sm text-muted-foreground">
      {label} Still gathering {weekly ? "a few weeks" : "a second day"} of price
      readings — this fills in automatically as daily snapshots accrue.
    </p>
  )
}
