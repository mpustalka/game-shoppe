"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useInventory } from "@/lib/inventory-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Database,
  CreditCard,
  Lock,
} from "lucide-react"

import { BillingPanel } from "@/components/settings/billing-panel"
import { useEntitlements } from "@/hooks/use-entitlements"

interface SquareStatus {
  configured: boolean
  environment: string
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  )
}

function SettingsInner() {
  const searchParams = useSearchParams()
  const initialTab =
    searchParams.get("tab") === "billing" ? "billing" : "general"
  const [tab, setTab] = useState(initialTab)

  const { items, updateSquareSync } = useInventory()
  const { entitlements } = useEntitlements()
  const [squareStatus, setSquareStatus] = useState<SquareStatus | null>(null)
  const [isBulkSyncing, setIsBulkSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)

  const canSync = entitlements.canSyncSquare
  const unsyncedItems = items.filter((item) => !item.syncedToSquare)

  useEffect(() => {
    fetch("/api/square/status")
      .then((res) => res.json())
      .then(setSquareStatus)
      .catch(console.error)
  }, [])

  const handleBulkSync = async () => {
    if (!canSync) {
      toast.error("Upgrade to sync with Square")
      return
    }
    if (!squareStatus?.configured) {
      toast.error("Square is not configured")
      return
    }

    setIsBulkSyncing(true)
    setSyncProgress(0)

    let synced = 0
    let failed = 0

    for (let i = 0; i < unsyncedItems.length; i++) {
      const item = unsyncedItems[i]

      try {
        const response = await fetch("/api/square/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item }),
        })

        const result = await response.json()

        if (result.success) {
          updateSquareSync(item.id, result.itemId, result.variationId)
          synced++
        } else {
          failed++
        }
      } catch (error) {
        failed++
      }

      setSyncProgress(Math.round(((i + 1) / unsyncedItems.length) * 100))
    }

    setIsBulkSyncing(false)

    if (failed === 0) {
      toast.success(`Successfully synced ${synced} items to Square`)
    } else {
      toast.warning(`Synced ${synced} items, ${failed} failed`)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Configure integrations, manage billing, and control your inventory
          system
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="general">Integrations</TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" /> Payments
          </TabsTrigger>
        </TabsList>

        {/* Billing / Payments */}
        <TabsContent value="billing" className="space-y-6">
          <BillingPanel />
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="general" className="space-y-6">
          {/* Square Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Square POS Integration</CardTitle>
                    <CardDescription>
                      Sync inventory with Square
                    </CardDescription>
                  </div>
                </div>
                {squareStatus && (
                  <Badge
                    variant={squareStatus.configured ? "default" : "secondary"}
                  >
                    {squareStatus.configured ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Not Configured
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canSync && (
                <Alert className="border-primary/40">
                  <Lock className="h-4 w-4" />
                  <AlertTitle> Square sync is a Premium feature</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {" "}
                      Business User's Only - If you are interested and have an
                      actual registered company please reach out
                      admin@evileevee.com
                    </span>
                    <Button size="sm" onClick={() => setTab("billing")}>
                      Upgrade
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {squareStatus?.configured ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm text-muted-foreground">
                        Environment
                      </p>
                      <p className="font-medium capitalize">
                        {squareStatus.environment}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm text-muted-foreground">
                        Pending Sync
                      </p>
                      <p className="font-medium">
                        {unsyncedItems.length} items
                      </p>
                    </div>
                  </div>

                  {unsyncedItems.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                      <div>
                        <p className="font-medium">Bulk Sync</p>
                        <p className="text-sm text-muted-foreground">
                          Sync all {unsyncedItems.length} unsynced items to
                          Square
                        </p>
                      </div>
                      <Button
                        onClick={handleBulkSync}
                        disabled={isBulkSyncing || !canSync}
                      >
                        {isBulkSyncing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            {syncProgress}%
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync All
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertTitle>Square not configured</AlertTitle>

                  <AlertDescription className="space-y-3">
                    <p>
                      To connect Square, add the following environment variables
                      to your project:
                    </p>

                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">
                          SQUARE_ACCESS_TOKEN
                        </code>
                      </li>

                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">
                          SQUARE_APPLICATION_ID
                        </code>
                      </li>

                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">
                          SQUARE_LOCATION_ID
                        </code>
                      </li>

                      <li>
                        <code className="bg-muted px-1 py-0.5 rounded">
                          SQUARE_ENVIRONMENT
                        </code>{" "}
                        (sandbox or production)
                      </li>
                    </ul>

                    <Button asChild variant="outline" size="sm">
                      <a
                        href="https://developer.squareup.com/apps"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Get Square API Credentials
                      </a>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Database Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <CardTitle>Data Storage</CardTitle>
                  <CardDescription>
                    Current storage configuration
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Alert>
                <AlertTitle>Using Supabase</AlertTitle>

                <AlertDescription>
                  <p className="mb-2">
                    Your inventory, binders, customer lists, and account data
                    are stored in Supabase.
                  </p>

                  <p className="text-sm">
                    Inventory records and other account data are scoped to your
                    signed-in account.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="mt-4 rounded-lg border border-border p-3">
                <p className="text-sm text-muted-foreground">
                  Items in Inventory
                </p>

                <p className="text-2xl font-bold">{items.length}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}