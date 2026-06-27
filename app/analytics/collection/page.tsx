"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useInventory } from "@/lib/inventory-context"
import { itemMarketValue } from "@/lib/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Coins,
  Layers,
  LineChart as LineChartIcon,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

// ---- types matching /api/analytics/collection ----------------------------

type MoverRow = {
  cardId: string
  finish: string
  name: string
  set: string
  number: string
  rarity: string
  image: string
  quantity: number
  price7: number
  current: number
  changeAbs: number
  changePercent: number
  impact: number
  currentValue: number
}

type SetRow = {
  name: string
  owned: number
  value: number
  weeklyChange: number
  weeklyChangePercent: number
  avgCardMovement: number
  volatility: number
  gainers: number
  losers: number
}

type CollectionData = {
  trendDays: number
  overview: {
    totalValue: number
    change7d: number
    change7dPercent: number
    change30d: number
    change30dPercent: number
    cardsTracked: number
    totalUnits: number
    cardsMovedThisWeek: number
    biggestGainer: MoverRow | null
    biggestLoser: MoverRow | null
    costBasis: number
  }
  trend: { day: string; iso: string; value: number; costBasis: number }[]
  movers: { gainers: MoverRow[]; losers: MoverRow[] }
  contribution: { gainers: MoverRow[]; losers: MoverRow[] }
  winnersLosers: {
    up: number
    down: number
    unchanged: number
    avgGainPercent: number
    avgLossPercent: number
  }
  sets: {
    best: SetRow[]
    worst: SetRow[]
    mostValuable: SetRow[]
    mostVolatile: SetRow[]
  }
}

const EMPTY: CollectionData = {
  trendDays: 90,
  overview: {
    totalValue: 0,
    change7d: 0,
    change7dPercent: 0,
    change30d: 0,
    change30dPercent: 0,
    cardsTracked: 0,
    totalUnits: 0,
    cardsMovedThisWeek: 0,
    biggestGainer: null,
    biggestLoser: null,
    costBasis: 0,
  },
  trend: [],
  movers: { gainers: [], losers: [] },
  contribution: { gainers: [], losers: [] },
  winnersLosers: { up: 0, down: 0, unchanged: 0, avgGainPercent: 0, avgLossPercent: 0 },
  sets: { best: [], worst: [], mostValuable: [], mostVolatile: [] },
}

const TREND_WINDOWS = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 3650, label: "All" },
]

const usd = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const usdCompact = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`

const signedPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
const signedUsd = (value: number) => `${value >= 0 ? "+" : ""}${usd(value)}`

export default function CollectionInsightsPage() {
  const { items } = useInventory()
  const [days, setDays] = useState(90)
  const [data, setData] = useState<CollectionData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const snapshotSent = useRef(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics/collection?days=${days}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload) setData(payload)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [days])

  // Seed today's price reading for every inventory line, once per visit. The
  // server keeps one row per card+finish per day, so this safely grows the
  // price history that every section on this page is built from.
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

  const { overview, trend, movers, contribution, winnersLosers, sets } = data
  const hasTrend = trend.length >= 2

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <Sparkles className="h-8 w-8 text-primary" />
            Collection Insights
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            What happened to your collection value, which cards drove the change,
            and what to watch next — every number weighted by how many copies you
            actually own.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/analytics">All Analytics</Link>
        </Button>
      </div>

      {/* 1. Collection overview ------------------------------------------- */}
      <section className="mb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            title="Total Collection Value"
            value={usd(overview.totalValue)}
            sub={`${overview.totalUnits.toLocaleString()} cards · ${overview.cardsTracked.toLocaleString()} tracked`}
            icon={Wallet}
          />
          <Metric
            title="7-Day Change"
            value={signedUsd(overview.change7d)}
            sub={`${signedPct(overview.change7dPercent)} this week`}
            tone={overview.change7d >= 0 ? "positive" : "negative"}
            icon={overview.change7d >= 0 ? TrendingUp : TrendingDown}
          />
          <Metric
            title="30-Day Change"
            value={signedUsd(overview.change30d)}
            sub={`${signedPct(overview.change30dPercent)} over 30 days`}
            tone={overview.change30d >= 0 ? "positive" : "negative"}
            icon={overview.change30d >= 0 ? TrendingUp : TrendingDown}
          />
          <Metric
            title="Cards Moved This Week"
            value={overview.cardsMovedThisWeek.toLocaleString()}
            sub={`of ${overview.cardsTracked.toLocaleString()} with price history`}
            icon={LineChartIcon}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <HighlightCard
            label="Biggest Gainer This Week"
            mover={overview.biggestGainer}
            positive
          />
          <HighlightCard
            label="Biggest Loser This Week"
            mover={overview.biggestLoser}
            positive={false}
          />
        </div>
      </section>

      {/* 2. Weekly collection trend -------------------------------------- */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-primary" />
                Collection Value Trend
              </span>
              <div className="inline-flex rounded-lg border border-border p-1">
                {TREND_WINDOWS.map((window) => (
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTrend ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <p className="max-w-md text-sm text-muted-foreground">
                  {loading
                    ? "Loading collection history…"
                    : "The trend chart needs at least two days of price readings. A snapshot of every card's value is captured each day this page is opened — check back tomorrow to watch the line take shape."}
                </p>
              </div>
            ) : (
              <>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={trend}
                      margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        minTickGap={24}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        width={64}
                        tickFormatter={(v) => usdCompact(Number(v))}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<TrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Collection value"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#valueFill)"
                      />
                      <Line
                        type="monotone"
                        dataKey="costBasis"
                        name="Cost basis"
                        stroke="var(--muted-foreground)"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Current value
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 bg-muted-foreground" />
                    Cost basis ({usd(overview.costBasis)})
                  </span>
                  <span className="ml-auto">
                    Today&apos;s holdings valued at each day&apos;s market price.
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 3. Top movers --------------------------------------------------- */}
      <section className="mb-8">
        <TopMovers gainers={movers.gainers} losers={movers.losers} loading={loading} />
      </section>

      {/* 4. Weekly gain/loss contribution -------------------------------- */}
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <ContributionCard
          title="Top Gain Contributors"
          icon={TrendingUp}
          rows={contribution.gainers}
          positive
        />
        <ContributionCard
          title="Top Loss Contributors"
          icon={TrendingDown}
          rows={contribution.losers}
          positive={false}
        />
      </section>

      {/* 5. Winners vs losers summary ------------------------------------ */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              This Week at a Glance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Stat label="Cards up" value={winnersLosers.up.toLocaleString()} tone="positive" icon={ArrowUpRight} />
              <Stat label="Cards down" value={winnersLosers.down.toLocaleString()} tone="negative" icon={ArrowDownRight} />
              <Stat label="Unchanged" value={winnersLosers.unchanged.toLocaleString()} tone="neutral" icon={Minus} />
              <Stat label="Avg gain" value={signedPct(winnersLosers.avgGainPercent)} tone="positive" icon={TrendingUp} />
              <Stat label="Avg loss" value={signedPct(winnersLosers.avgLossPercent)} tone="negative" icon={TrendingDown} />
            </div>
            <BreadthBar up={winnersLosers.up} down={winnersLosers.down} unchanged={winnersLosers.unchanged} />
          </CardContent>
        </Card>
      </section>

      {/* 6. Set-level analytics ------------------------------------------ */}
      <section className="grid gap-6 lg:grid-cols-2">
        <SetCard title="Best Performing Sets" icon={TrendingUp} rows={sets.best} mode="change" positive />
        <SetCard title="Worst Performing Sets" icon={TrendingDown} rows={sets.worst} mode="change" positive={false} />
        <SetCard title="Most Valuable Sets" icon={Coins} rows={sets.mostValuable} mode="value" />
        <SetCard title="Most Volatile Sets" icon={BarChart3} rows={sets.mostVolatile} mode="volatility" />
      </section>
    </div>
  )
}

// ---- components ----------------------------------------------------------

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
  icon: typeof Wallet
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
          {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function HighlightCard({
  label,
  mover,
  positive,
}: {
  label: string
  mover: MoverRow | null
  positive: boolean
}) {
  const tone = positive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400"
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        {mover?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mover.image} alt={mover.name} className="h-16 w-12 shrink-0 rounded object-cover" />
        ) : (
          <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded bg-muted">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {mover ? (
            <>
              <p className="truncate font-semibold">{mover.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {mover.set ? `${mover.set} · ` : ""}
                {mover.finish} · {mover.quantity}× owned
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No movement recorded yet.</p>
          )}
        </div>
        {mover && (
          <div className={`text-right ${tone}`}>
            <p className="text-lg font-bold">{signedUsd(mover.impact)}</p>
            <p className="text-xs">{signedPct(mover.changePercent)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TopMovers({
  gainers,
  losers,
  loading,
}: {
  gainers: MoverRow[]
  losers: MoverRow[]
  loading: boolean
}) {
  const [view, setView] = useState<"gainers" | "losers">("gainers")
  const [count, setCount] = useState(25)
  const rows = (view === "gainers" ? gainers : losers).slice(0, count)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            {view === "gainers" ? (
              <TrendingUp className="h-5 w-5 text-primary" />
            ) : (
              <TrendingDown className="h-5 w-5 text-primary" />
            )}
            Top Movers This Week
          </span>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border p-1">
              <Toggle active={view === "gainers"} onClick={() => setView("gainers")}>
                Gainers
              </Toggle>
              <Toggle active={view === "losers"} onClick={() => setView("losers")}>
                Losers
              </Toggle>
            </div>
            <div className="inline-flex rounded-lg border border-border p-1">
              <Toggle active={count === 25} onClick={() => setCount(25)}>
                Top 25
              </Toggle>
              <Toggle active={count === 50} onClick={() => setCount(50)}>
                Top 50
              </Toggle>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {loading
              ? "Loading movers…"
              : "No measured price movement this week yet. Movement appears once two days of readings exist."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Card</th>
                  <th className="px-3 py-2 font-medium">Set</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">7d ago</th>
                  <th className="px-3 py-2 text-right font-medium">Current</th>
                  <th className="px-3 py-2 text-right font-medium">Change $</th>
                  <th className="px-3 py-2 text-right font-medium">Change %</th>
                  <th className="py-2 pl-3 text-right font-medium">Impact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const up = row.changeAbs >= 0
                  const tone = up
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                  return (
                    <tr
                      key={`${row.cardId}-${row.finish}`}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-right text-xs text-muted-foreground">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{row.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.number ? `#${row.number} · ` : ""}
                              {row.rarity || row.finish}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <span className="line-clamp-1">{row.set || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{row.quantity}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {usd(row.price7)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{usd(row.current)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${tone}`}>
                        {signedUsd(row.changeAbs)}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${tone}`}>
                        {signedPct(row.changePercent)}
                      </td>
                      <td className={`py-2.5 pl-3 text-right font-semibold tabular-nums ${tone}`}>
                        {signedUsd(row.impact)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Impact = change × quantity owned — the dollars this card added to or
          removed from your collection this week.
        </p>
      </CardContent>
    </Card>
  )
}

function ContributionCard({
  title,
  icon: Icon,
  rows,
  positive,
}: {
  title: string
  icon: typeof TrendingUp
  rows: MoverRow[]
  positive: boolean
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.impact)))
  const tone = positive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400"
  const bar = positive ? "bg-emerald-500" : "bg-red-500"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {positive ? "gains" : "losses"} to attribute this week.
          </p>
        ) : (
          rows.slice(0, 12).map((row) => (
            <div key={`${row.cardId}-${row.finish}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{row.name}</span>
                <span className={`shrink-0 font-semibold tabular-nums ${tone}`}>
                  {signedUsd(row.impact)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${bar}`}
                    style={{ width: `${(Math.abs(row.impact) / max) * 100}%` }}
                  />
                </div>
                <span className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground">
                  {row.quantity}× · {signedPct(row.changePercent)}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  tone: "positive" | "negative" | "neutral"
  icon: typeof TrendingUp
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground"
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}

function BreadthBar({ up, down, unchanged }: { up: number; down: number; unchanged: number }) {
  const total = Math.max(1, up + down + unchanged)
  return (
    <div className="mt-4">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-emerald-500" style={{ width: `${(up / total) * 100}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${(unchanged / total) * 100}%` }} />
        <div className="bg-red-500" style={{ width: `${(down / total) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {((up / total) * 100).toFixed(0)}% of tracked cards rose,{" "}
        {((down / total) * 100).toFixed(0)}% fell this week.
      </p>
    </div>
  )
}

function SetCard({
  title,
  icon: Icon,
  rows,
  mode,
  positive,
}: {
  title: string
  icon: typeof TrendingUp
  rows: SetRow[]
  mode: "change" | "value" | "volatility"
  positive?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough data yet.</p>
        ) : (
          rows.map((set) => {
            const changeTone =
              set.weeklyChange >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            return (
              <div
                key={set.name}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{set.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {set.owned} cards · {usd(set.value)} value · {set.gainers}↑ {set.losers}↓
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {mode === "value" && (
                    <>
                      <p className="font-semibold tabular-nums">{usd(set.value)}</p>
                      <p className={`text-xs tabular-nums ${changeTone}`}>
                        {signedPct(set.weeklyChangePercent)} wk
                      </p>
                    </>
                  )}
                  {mode === "change" && (
                    <>
                      <p className={`font-semibold tabular-nums ${changeTone}`}>
                        {signedPct(set.weeklyChangePercent)}
                      </p>
                      <p className={`text-xs tabular-nums ${changeTone}`}>
                        {signedUsd(set.weeklyChange)}
                      </p>
                    </>
                  )}
                  {mode === "volatility" && (
                    <>
                      <Badge variant="secondary">±{set.volatility}%</Badge>
                      <p className={`mt-0.5 text-xs tabular-nums ${changeTone}`}>
                        {signedPct(set.weeklyChangePercent)} wk
                      </p>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as { day: string; value: number; costBasis: number }
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{point.day}</p>
      <p className="text-sm font-semibold">{usd(point.value)}</p>
      <p className="text-xs text-muted-foreground">Cost basis {usd(point.costBasis)}</p>
    </div>
  )
}
