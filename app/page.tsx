"use client"

import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  DollarSign, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  Plus,
  QrCode,
  RefreshCw
} from "lucide-react"


export default function DashboardPage() {
  const { items } = useInventory()

  // Calculate stats
  const totalItems = items.length
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const lowStockItems = items.filter((item) => item.quantity <= 2)
  const unsyncedItems = items.filter((item) => !item.syncedToSquare)
  const uniqueSets = new Set(items.map((item) => item.card.set.id)).size

  // Recent items (last 5)
  const recentItems = items.slice(0, 5)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your Pokemon card inventory
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/scan">
              <QrCode className="mr-2 h-4 w-4" />
              Scan Card
            </Link>
          </Button>
          <Button asChild>
            <Link href="/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {totalQuantity} cards in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {uniqueSets} sets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Items with 2 or less in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Square Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length - unsyncedItems.length}/{items.length}</div>
            <p className="text-xs text-muted-foreground">
              {unsyncedItems.length} items pending sync
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Inventory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Inventory</CardTitle>
              <CardDescription>Latest cards added to your inventory</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/inventory">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Layers className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No inventory yet</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/sets">Browse sets to add cards</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <img
                      src={item.card.images.small}
                      alt={item.card.name}
                      className="h-16 w-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">{item.card.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.card.set.name} - #{item.card.number}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.condition}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${item.price.toFixed(2)}
                      </p>
                      {!item.syncedToSquare && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Not synced
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for managing your inventory</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link href="/sets">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Browse Pokemon Sets</p>
                    <p className="text-sm text-muted-foreground">
                      View all sets and add cards to inventory
                    </p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link href="/add">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Add Card to Inventory</p>
                    <p className="text-sm text-muted-foreground">
                      Search and add a specific card
                    </p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link href="/scan">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Scan QR Code</p>
                    <p className="text-sm text-muted-foreground">
                      Look up inventory by scanning barcode
                    </p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link href="/search">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Search Inventory</p>
                    <p className="text-sm text-muted-foreground">
                      Find cards by name, SKU, or barcode
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <CardTitle>Low Stock Alert</CardTitle>
              </div>
              <CardDescription>These items have 2 or fewer in stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lowStockItems.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:hover:bg-amber-950"
                  >
                    <img
                      src={item.card.images.small}
                      alt={item.card.name}
                      className="h-12 w-9 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{item.card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {item.quantity}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
