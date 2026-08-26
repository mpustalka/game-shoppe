"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"

import Link from "next/link"

import {
  BadgeDollarSign,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
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


type AdminSellSummary = {
  sellers: number
  binders: number
  activeListings: number
  soldListings: number
  listedValue: number
  platformRevenue: number
}


type SellerRow = {
  userId: string
  email: string | null
  storeName: string | null
  binderCount: number
  activeListings: number
  soldListings: number
  listedValue: number
}


type AdminSellResponse = {
  summary: AdminSellSummary
  sellers: SellerRow[]
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


export default function AdminSellPage() {
  const [data, setData] =
    useState<AdminSellResponse | null>(null)

  const [loading, setLoading] =
    useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch(
        "/api/admin/sell",
        {
          cache: "no-store",
        },
      )

      const result = await response
        .json()
        .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to load marketplace admin",
        )
      }

      setData(result)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load marketplace admin",
      )

      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])


  useEffect(() => {
    void load()
  }, [load])


  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />

        Loading Marketplace Admin…
      </div>
    )
  }


  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Card>
          <CardContent className="p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />

            <h2 className="mt-4 text-xl font-semibold">
              Marketplace Admin unavailable
            </h2>

            <Button
              className="mt-5"
              onClick={() => void load()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
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
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Store className="h-4 w-4" />
            Marketplace Administration
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Sell Marketplace
          </h1>

          <p className="mt-2 text-muted-foreground">
            Manage sellers, Sell Binders, listings, sales and marketplace fees.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void load()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Sellers"
          value={data.summary.sellers}
          icon={Users}
        />

        <StatCard
          title="Sell Binders"
          value={data.summary.binders}
          icon={ShoppingBag}
        />

        <StatCard
          title="Active Listings"
          value={data.summary.activeListings}
          icon={ShoppingBag}
        />

        <StatCard
          title="Sold Listings"
          value={data.summary.soldListings}
          icon={BadgeDollarSign}
        />

        <StatCard
          title="Listed Value"
          value={money(
            data.summary.listedValue,
          )}
          icon={BadgeDollarSign}
        />

        <StatCard
          title="Platform Revenue"
          value={money(
            data.summary.platformRevenue,
          )}
          icon={BadgeDollarSign}
        />
      </div>


      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Marketplace Sellers
          </CardTitle>

          <CardDescription>
            Seller accounts currently using Sell Binders.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {data.sellers.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />

              <p className="mt-3 font-medium">
                No marketplace sellers yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">
                      Seller
                    </th>

                    <th className="px-3 py-3 text-right">
                      Binders
                    </th>

                    <th className="px-3 py-3 text-right">
                      Active
                    </th>

                    <th className="px-3 py-3 text-right">
                      Sold
                    </th>

                    <th className="px-3 py-3 text-right">
                      Listed Value
                    </th>

                    <th className="px-3 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.sellers.map(
                    (seller) => (
                      <tr
                        key={seller.userId}
                        className="border-b"
                      >
                        <td className="px-3 py-4">
                          <p className="font-medium">
                            {seller.storeName ||
                              seller.email ||
                              "Seller"}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {seller.email ||
                              seller.userId}
                          </p>
                        </td>

                        <td className="px-3 py-4 text-right">
                          {seller.binderCount}
                        </td>

                        <td className="px-3 py-4 text-right">
                          <Badge>
                            {
                              seller.activeListings
                            }
                          </Badge>
                        </td>

                        <td className="px-3 py-4 text-right">
                          {
                            seller.soldListings
                          }
                        </td>

                        <td className="px-3 py-4 text-right font-medium">
                          {money(
                            seller.listedValue,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <Link
                              href={`/admin/sell/users/${seller.userId}`}
                            >
                              Manage
                            </Link>
                          </Button>
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