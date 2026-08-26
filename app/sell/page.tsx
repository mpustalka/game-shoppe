"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Crown,
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
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Sell Center…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card>
          <CardContent className="p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">
              Sell Center unavailable
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
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
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Store className="h-4 w-4" />
            Seller Marketplace
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Sell Center
          </h1>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            Create Sell Binders, choose cards from your Budget, Mid, and Premium collection binders, set your own asking prices, and manage your listings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            disabled={!canCreateBinder}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Sell Binder
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold">Seller Plan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Current plan:{" "}
                <span className="font-medium text-foreground">
                  {planLabel(data.plan)}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {data.entitlement.included} included
              </Badge>

              {data.entitlement.purchased > 0 && (
                <Badge variant="outline">
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

              <Badge variant="outline">
                Additional binder:{" "}
                {money(data.entitlement.additionalBinderPrice)}
              </Badge>
            </div>
          </div>

          {!canCreateBinder && !data.entitlement.unlimited && (
            <div className="mt-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              You&apos;ve used all currently available Sell Binder slots.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Sell Binders</CardTitle>
          <CardDescription>
            Open a Sell Binder to choose cards from your collection, set a separate sell price, and manage active listings.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {binders.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />

              <h3 className="mt-4 text-lg font-semibold">
                No Sell Binders yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
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
        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              1
            </div>
            <h3 className="mt-4 font-semibold">Open a Sell Binder</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Each Sell Binder contains the cards you&apos;re offering on the marketplace.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              2
            </div>
            <h3 className="mt-4 font-semibold">Choose Cards</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse cards already organized in your Budget, Mid, and Premium collection binders.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              3
            </div>
            <h3 className="mt-4 font-semibold">Set Your Sell Price</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Market value stays as a reference. Your asking price is stored separately for the marketplace listing.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
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
  )
}

function SellBinderCard({ binder }: { binder: SellBinder }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{binder.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {binder.description || "Marketplace Sell Binder"}
            </CardDescription>
          </div>

          <Badge variant={binder.is_active ? "default" : "secondary"}>
            {binder.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Badge variant="outline">
          {binder.is_public ? "Public" : "Private"}
        </Badge>

        <Button className="mt-5 w-full" asChild>
          <Link href={`/sell/${binder.id}`}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Manage Listings
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
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="truncate text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}