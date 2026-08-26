"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"

import Link from "next/link"
import { useParams } from "next/navigation"

import {
  ArrowLeft,
  BadgeDollarSign,
  BookOpen,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Store,
  User,
} from "lucide-react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


type SellBinder = {
  id: string
  name: string
  description: string | null
  slug: string | null
  is_public: boolean
  is_active: boolean
  created_at: string
}

type SellListing = {
  id: string
  sell_binder_id: string
  inventory_item_id: string
  quantity: number
  asking_price: number
  status: string
  shipping_method: string
  created_at: string
}

type AdminSellerResponse = {
  user: {
    id: string
    email: string | null
    storeName: string | null
    isAdmin: boolean
  }

  summary: {
    binderCount: number
    listingCount: number
    activeCount: number
    soldCount: number
    listedValue: number
    estimatedPlatformRevenue: number
  }

  binders: SellBinder[]

  listings: SellListing[]
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


export default function AdminSellerPage() {
  const params =
    useParams<{
      id: string
    }>()

  const userId =
    params.id

  const [
    data,
    setData,
  ] =
    useState<AdminSellerResponse | null>(
      null,
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const load =
    useCallback(
      async () => {
        if (!userId) {
          return
        }

        setLoading(true)

        try {
          const response =
            await fetch(
              `/api/admin/sell/users/${userId}`,
              {
                cache:
                  "no-store",
              },
            )

          const result =
            await response
              .json()
              .catch(
                () => null,
              )

          if (!response.ok) {
            throw new Error(
              result?.error ||
                "Unable to load seller",
            )
          }

          setData(
            result as AdminSellerResponse,
          )
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load seller",
          )

          setData(null)
        } finally {
          setLoading(false)
        }
      },
      [userId],
    )


  useEffect(() => {
    void load()
  }, [load])


  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />

        Loading seller…
      </div>
    )
  }


  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card>
          <CardContent className="p-10 text-center">
            <User className="mx-auto h-10 w-10 text-muted-foreground" />

            <h2 className="mt-4 text-xl font-semibold">
              Seller unavailable
            </h2>

            <Button
              className="mt-5"
              asChild
            >
              <Link href="/admin/sell">
                Back to Marketplace Admin
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">

      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-3"
            asChild
          >
            <Link href="/admin/sell">
              <ArrowLeft className="mr-2 h-4 w-4" />

              Marketplace Admin
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {data.user.storeName ||
                data.user.email ||
                "Seller"}
            </h1>

            {data.user.isAdmin && (
              <Badge>
                Admin
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {data.user.email}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            void load()
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />

          Refresh
        </Button>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Sell Binders"
          value={
            data.summary
              .binderCount
          }
          icon={BookOpen}
        />

        <StatCard
          title="Listings"
          value={
            data.summary
              .listingCount
          }
          icon={ShoppingBag}
        />

        <StatCard
          title="Active"
          value={
            data.summary
              .activeCount
          }
          icon={Store}
        />

        <StatCard
          title="Sold"
          value={
            data.summary
              .soldCount
          }
          icon={BadgeDollarSign}
        />

        <StatCard
          title="Listed Value"
          value={money(
            data.summary
              .listedValue,
          )}
          icon={BadgeDollarSign}
        />

        <StatCard
          title="Est. Platform Revenue"
          value={money(
            data.summary
              .estimatedPlatformRevenue,
          )}
          icon={BadgeDollarSign}
        />
      </div>


      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Sell Binders
          </CardTitle>

          <CardDescription>
            Marketplace binders owned by this seller.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {data.binders.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />

              <p className="mt-3 font-medium">
                No Sell Binders
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.binders.map(
                (binder) => (
                  <Card
                    key={
                      binder.id
                    }
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {
                              binder.name
                            }
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {
                              binder.description ||
                              "Sell Binder"
                            }
                          </p>
                        </div>

                        <Badge
                          variant={
                            binder.is_active
                              ? "default"
                              : "secondary"
                          }
                        >
                          {binder.is_active
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {binder.is_public
                            ? "Public"
                            : "Private"}
                        </Badge>
                      </div>

                      <Button
                        className="mt-5 w-full"
                        variant="outline"
                        asChild
                      >
                        <Link
                          href={`/sell/${binder.id}`}
                        >
                          View Binder
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>


      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Listings
          </CardTitle>

          <CardDescription>
            All listings belonging to this seller.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {data.listings.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />

              <p className="mt-3 font-medium">
                No listings yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">
                      Inventory ID
                    </th>

                    <th className="px-3 py-3">
                      Status
                    </th>

                    <th className="px-3 py-3 text-right">
                      Qty
                    </th>

                    <th className="px-3 py-3 text-right">
                      Price
                    </th>

                    <th className="px-3 py-3">
                      Shipping
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.listings.map(
                    (listing) => (
                      <tr
                        key={
                          listing.id
                        }
                        className="border-b"
                      >
                        <td className="px-3 py-4 font-mono text-xs">
                          {
                            listing.inventory_item_id
                          }
                        </td>

                        <td className="px-3 py-4">
                          <Badge
                            variant={
                              listing.status ===
                              "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {
                              listing.status
                            }
                          </Badge>
                        </td>

                        <td className="px-3 py-4 text-right">
                          {
                            listing.quantity
                          }
                        </td>

                        <td className="px-3 py-4 text-right font-medium">
                          {money(
                            listing.asking_price,
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {
                            listing.shipping_method ===
                            "envelope"
                              ? "USPS Envelope"
                              : "USPS Ground Advantage"
                          }
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


function StatCard({
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {title}
          </p>

          <p className="truncate text-xl font-bold">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}