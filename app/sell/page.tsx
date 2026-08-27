"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Crown,
  ArrowRight,
  BadgeDollarSign,
  ShieldCheck,
  Sparkles,
  Zap,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingBag,
  Store,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SellBinder = {
  id: string
  user_id: string
  name: string
  description: string | null
  slug: string | null
  is_public: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type SellBinderEntitlement = {
  included: number
  purchased: number
  maximum: number
  used: number
  remaining: number
  unlimited: boolean
  additionalBinderPrice: number
}

type SellCenterResponse = {
  plan: "basic" | "premium" | "admin"
  entitlement: SellBinderEntitlement
  binders: SellBinder[]
}

function money(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : "$0.00"
}

function planLabel(plan: SellCenterResponse["plan"]) {
  if (plan === "admin") return "Admin"
  if (plan === "premium") return "Premium"
  return "Basic"
}

export default function SellCenterPage() {
  const [data, setData] = useState<SellCenterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/sell-binders", {
        cache: "no-store",
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Unable to load Sell Center")
      }

      setData(result as SellCenterResponse)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load Sell Center",
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const binders = useMemo(
    () => (Array.isArray(data?.binders) ? data.binders : []),
    [data],
  )

  const activeBinders = useMemo(
    () => binders.filter((binder) => binder.is_active),
    [binders],
  )

  const publicBinders = useMemo(
    () => binders.filter((binder) => binder.is_public),
    [binders],
  )

  const canCreateBinder = useMemo(() => {
    if (!data) return false
    if (data.entitlement.unlimited) return true
    return data.entitlement.remaining > 0
  }, [data])

  async function createBinder() {
    const trimmedName = name.trim()

    if (!trimmedName) {
      toast.error("Enter a Sell Binder name.")
      return
    }

    setCreating(true)

    try {
      const response = await fetch("/api/sell-binders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Unable to create Sell Binder")
      }

      toast.success("Sell Binder created")
      setCreateOpen(false)
      setName("")
      setDescription("")
      await load()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create Sell Binder",
      )
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#09090b] text-zinc-200">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Sell Center…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#09090b] px-4 py-10 text-zinc-100">
        <Card className="text-zinc-100 mx-auto max-w-5xl border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/30">
          <CardContent className="p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-zinc-400" />
            <h2 className="mt-4 text-xl font-semibold">
              Sell Center unavailable
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              We couldn&apos;t load your Sell Binders.
            </p>
            <Button className="mt-5" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="relative mb-7 overflow-hidden rounded-[28px] border border-rose-500/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-rose-950/30 p-5 shadow-2xl shadow-black/30 sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
            <Store className="h-3.5 w-3.5" />
            Team Rocket Marketplace
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Sell Center
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            Turn your collection into a storefront. Build Sell Binders, choose cards from your collection, set your own prices, and connect directly with collectors.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><BadgeDollarSign className="mr-1.5 inline h-3.5 w-3.5 text-emerald-400" />0% selling fees</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-rose-400" />Peer-to-peer</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            className="bg-rose-600 font-bold text-white shadow-lg shadow-rose-950/30 hover:bg-rose-500"
            disabled={!canCreateBinder}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Sell Binder
          </Button>
        </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Sell Binders" value={binders.length} icon={BookOpen} />
        <SummaryCard
          title="Active Binders"
          value={activeBinders.length}
          icon={ShoppingBag}
        />
        <SummaryCard
          title="Public Binders"
          value={publicBinders.length}
          icon={Store}
        />
        <SummaryCard
          title="Binder Slots Left"
          value={data.entitlement.unlimited ? "Unlimited" : data.entitlement.remaining}
          icon={Crown}
        />
      </div>

      <Card className="text-zinc-100 mt-6 border-white/10 bg-zinc-950/70 shadow-xl shadow-black/20">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-zinc-100">Seller Plan</p>
              <p className="mt-1 text-sm text-zinc-400">
                Current plan:{" "}
                <span className="font-semibold text-white">
                  {planLabel(data.plan)}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-zinc-600 bg-zinc-900 text-zinc-200">
                {data.entitlement.included} included
              </Badge>

              {data.entitlement.purchased > 0 && (
                <Badge variant="outline" className="border-zinc-600 bg-zinc-900 text-zinc-200">
                  {data.entitlement.purchased} purchased
                </Badge>
              )}

              <Badge variant="secondary">
                {data.entitlement.used} used
              </Badge>

              {!data.entitlement.unlimited && (
                <Badge variant="secondary">
                  {data.entitlement.remaining} remaining
                </Badge>
              )}

              {data.entitlement.unlimited && <Badge>Unlimited</Badge>}

              <Badge variant="outline" className="border-zinc-600 bg-zinc-900 text-zinc-200">
                Additional binder:{" "}
                {money(data.entitlement.additionalBinderPrice)}
              </Badge>
            </div>
          </div>

          {!canCreateBinder && !data.entitlement.unlimited && (
            <div className="mt-4 rounded-lg border border-dashed p-3 text-sm text-zinc-400">
              You&apos;ve used all currently available Sell Binder slots.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="text-zinc-100 mt-6 border-white/10 bg-zinc-950/70 shadow-xl shadow-black/20">
        <CardHeader>
          <CardTitle className="text-zinc-100">My Sell Binders</CardTitle>
          <CardDescription className="text-zinc-400">
            Open a Sell Binder to choose cards from your collection, set a separate sell price, and manage active listings.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {binders.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-zinc-400" />

              <h3 className="mt-4 text-lg font-semibold">
                No Sell Binders yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                Create your first Sell Binder, then choose cards from your collection and set individual selling prices.
              </p>

              <Button
                className="mt-5"
                disabled={!canCreateBinder}
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Sell Binder
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {binders.map((binder) => (
                <SellBinderCard key={binder.id} binder={binder} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="text-zinc-100 border-white/10 bg-zinc-950/70">
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-rose-400">
              1
            </div>
            <h3 className="mt-4 font-semibold">Open a Sell Binder</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Each Sell Binder contains the cards you&apos;re offering on the marketplace.
            </p>
          </CardContent>
        </Card>

        <Card className="text-zinc-100 border-white/10 bg-zinc-950/70">
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-rose-400">
              2
            </div>
            <h3 className="mt-4 font-semibold">Choose Cards</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Browse cards already organized in your Budget, Mid, and Premium collection binders.
            </p>
          </CardContent>
        </Card>

        <Card className="text-zinc-100 border-white/10 bg-zinc-950/70">
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-rose-400">
              3
            </div>
            <h3 className="mt-4 font-semibold">Set Your Sell Price</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Market value stays as a reference. Your asking price is stored separately for the marketplace listing.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Sell Binder</DialogTitle>
            <DialogDescription>
              Give this marketplace binder a name. You&apos;ll add cards after it&apos;s created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sell-binder-name">Binder Name</Label>
              <Input
                id="sell-binder-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Singles For Sale"
                className="border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sell-binder-description">Description</Label>
              <Input
                id="sell-binder-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Pokémon singles from my collection"
                className="border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600"
                maxLength={200}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>

            <Button
              disabled={creating || !name.trim() || !canCreateBinder}
              onClick={() => void createBinder()}
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Binder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

function SellBinderCard({ binder }: { binder: SellBinder }) {
  return (
    <Card className="text-zinc-100 group overflow-hidden border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950 transition duration-300 hover:-translate-y-1 hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-950/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-zinc-100">{binder.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2 text-zinc-400">
              {binder.description || "Marketplace Sell Binder"}
            </CardDescription>
          </div>

          <Badge variant={binder.is_active ? "default" : "secondary"}>
            {binder.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Badge variant="outline" className="border-zinc-600 bg-zinc-900 text-zinc-200">
          {binder.is_public ? "Public" : "Private"}
        </Badge>

        <Button className="mt-5 w-full bg-rose-600 font-bold text-white hover:bg-rose-500" asChild>
          <Link href={`/sell/${binder.id}`}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Manage Listings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string | number
  icon: typeof ShoppingBag
}) {
  return (
    <Card className="text-zinc-100 border-white/10 bg-zinc-950/80 shadow-lg shadow-black/20">
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
          <Icon className="h-5 w-5 text-rose-400" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-zinc-400">{title}</p>
          <p className="truncate text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}