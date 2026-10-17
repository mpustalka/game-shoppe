"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import Link from "next/link"

import {
  ArrowLeft,
  CheckCircle2,
  CircleOff,
  ExternalLink,
  Loader2,
  Plug,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Store,
  Unplug,
  Zap,
} from "lucide-react"

import {
  Badge,
} from "@/components/ui/badge"

import {
  Button,
} from "@/components/ui/button"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Progress,
} from "@/components/ui/progress"

type Integration = {
  id: string
  provider: string
  customProviderName:
    | string
    | null
  status: string
  environment: string
  reportedByBusiness: boolean
  merchantId:
    | string
    | null
  externalAccountName:
    | string
    | null
  locationId:
    | string
    | null
  locationName:
    | string
    | null
  settings: Record<
    string,
    unknown
  >
  connectedAt:
    | string
    | null
  disconnectedAt:
    | string
    | null
  lastSyncAt:
    | string
    | null
  lastSyncStatus:
    | string
    | null
  lastSyncError:
    | string
    | null
  tokenExpiresAt:
    | string
    | null
}

type Provider = {
  id: string
  name: string
  description: string
  category: string
  available: boolean

  integration:
    | Integration
    | null
}

type IntegrationsResponse = {
  company: {
    id: string
    name: string
    subscriptionStatus:
      | string
      | null
    subscriptionPlan:
      | string
      | null
    trialPlan:
      | string
      | null
  }

  currentUser: {
    id: string
    role:
      | string
      | null
    canManage: boolean
  }

  limits: {
    /*
     * null means unlimited.
     */
    included:
      | number
      | null

    connected: number

    available:
      | number
      | null
  }

  providers: Provider[]

  customIntegrations:
    Integration[]
}

function providerIcon(
  provider: string,
) {
  switch (provider) {
    case "square":
      return Store

    case "shopify":
      return ShoppingBag

    case "ebay":
      return Zap

    default:
      return Plug
  }
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Never"
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Never"
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date)
}

function statusLabel(
  status?: string | null,
) {
  switch (status) {
    case "connected":
      return "Connected"

    case "connecting":
      return "Connecting"

    case "error":
      return "Needs attention"

    default:
      return "Not connected"
  }
}

export default function BusinessIntegrationsPage() {
  const [
    data,
    setData,
  ] =
    useState<
      IntegrationsResponse | null
    >(null)

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    )

  const [
    actionProvider,
    setActionProvider,
  ] =
    useState<string | null>(
      null,
    )

  const loadIntegrations =
    useCallback(
      async () => {
        try {
          setError(null)

          const response =
            await fetch(
              "/api/business/integrations",
              {
                cache:
                  "no-store",
              },
            )

          const payload =
            await response
              .json()
              .catch(
                () => null,
              )

          if (!response.ok) {
            throw new Error(
              payload?.error ||
                "Unable to load integrations.",
            )
          }

          setData(
            payload as IntegrationsResponse,
          )
        } catch (loadError) {
          console.error(
            "Unable to load integrations:",
            loadError,
          )

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load integrations.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadIntegrations()
  }, [loadIntegrations])

  const usagePercent =
    useMemo(() => {
      if (!data) {
        return 0
      }

      if (
        data.limits.included ===
        null
      ) {
        return 0
      }

      if (
        data.limits.included <=
        0
      ) {
        return 0
      }

      return Math.min(
        100,
        Math.round(
          (data.limits.connected /
            data.limits.included) *
            100,
        ),
      )
    }, [data])

  function connectProvider(
    provider: Provider,
  ) {
    if (
      !data?.currentUser
        .canManage
    ) {
      return
    }

    /*
     * Square will be wired to its
     * OAuth endpoint next.
     *
     * Shopify/eBay are displayed now
     * so the integrations center is
     * ready for those providers later.
     */
    if (
      provider.id ===
        "square" &&
      provider.available
    ) {
      window.location.href =
        "/api/business/integrations/square/connect"

      return
    }

    setActionProvider(
      provider.id,
    )

    window.setTimeout(
      () => {
        setActionProvider(
          null,
        )
      },
      600,
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />

          Loading integrations...
        </div>
      </div>
    )
  }

  if (
    error ||
    !data
  ) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Unable to load integrations
            </CardTitle>

            <CardDescription>
              {error ??
                "The integrations service is unavailable."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              type="button"
              onClick={() => {
                setLoading(
                  true,
                )

                void loadIntegrations()
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />

              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const unlimited =
    data.limits.included ===
    null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button
            asChild
            variant="ghost"
            className="mb-2 -ml-3"
          >
            <Link href="/business">
              <ArrowLeft className="mr-2 h-4 w-4" />

              Business dashboard
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border bg-card p-3">
              <Plug className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Integrations
              </h1>

              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                Connect{" "}
                {data.company.name}{" "}
                with the services your
                business already uses.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void loadIntegrations()
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />

          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Connected
            </CardDescription>

            <CardTitle className="text-3xl">
              {
                data.limits
                  .connected
              }
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Plan allowance
            </CardDescription>

            <CardTitle className="text-3xl">
              {unlimited
                ? "Unlimited"
                : data.limits
                    .included}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Available connections
            </CardDescription>

            <CardTitle className="text-3xl">
              {unlimited
                ? "Unlimited"
                : data.limits
                    .available}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!unlimited && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  Integration usage
                </CardTitle>

                <CardDescription>
                  {
                    data.limits
                      .connected
                  }{" "}
                  of{" "}
                  {
                    data.limits
                      .included
                  }{" "}
                  connections used
                </CardDescription>
              </div>

              <Badge variant="secondary">
                {usagePercent}%
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <Progress
              value={
                usagePercent
              }
            />
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold">
          Available integrations
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Connect external sales
          channels and point-of-sale
          platforms to your business
          inventory.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {data.providers.map(
          (provider) => {
            const Icon =
              providerIcon(
                provider.id,
              )

            const integration =
              provider.integration

            const connected =
              integration?.status ===
              "connected"

            const working =
              actionProvider ===
              provider.id

            const noSlots =
              !unlimited &&
              (data.limits
                .available ??
                0) <= 0 &&
              !connected

            return (
              <Card
                key={
                  provider.id
                }
                className="flex h-full flex-col"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-xl border bg-muted/40 p-3">
                      <Icon className="h-6 w-6" />
                    </div>

                    {connected ? (
                      <Badge className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />

                        Connected
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1"
                      >
                        <CircleOff className="h-3.5 w-3.5" />

                        Not connected
                      </Badge>
                    )}
                  </div>

                  <div className="pt-3">
                    <CardTitle>
                      {
                        provider.name
                      }
                    </CardTitle>

                    <CardDescription className="mt-2 min-h-10">
                      {
                        provider.description
                      }
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  <div className="space-y-3 text-sm">
                    {integration
                      ?.reportedByBusiness && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          Registration
                        </span>

                        <Badge variant="outline">
                          Used by your
                          business
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        Status
                      </span>

                      <span className="font-medium">
                        {statusLabel(
                          integration
                            ?.status,
                        )}
                      </span>
                    </div>

                    {connected && (
                      <>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Account
                          </span>

                          <span className="max-w-[180px] truncate font-medium">
                            {integration
                              ?.externalAccountName ||
                              integration
                                ?.merchantId ||
                              "Connected account"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Location
                          </span>

                          <span className="max-w-[180px] truncate font-medium">
                            {integration
                              ?.locationName ||
                              "Default"}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        Last sync
                      </span>

                      <span className="text-right font-medium">
                        {formatDate(
                          integration
                            ?.lastSyncAt,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {!connected ? (
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={
                          !data
                            .currentUser
                            .canManage ||
                          noSlots ||
                          working ||
                          !provider.available
                        }
                        onClick={() =>
                          connectProvider(
                            provider,
                          )
                        }
                      >
                        {working ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plug className="mr-2 h-4 w-4" />
                        )}

                        {provider.available
                          ? "Connect"
                          : "Coming soon"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          className="flex-1"
                          variant="outline"
                          disabled={
                            !data
                              .currentUser
                              .canManage
                          }
                        >
                          <Settings2 className="mr-2 h-4 w-4" />

                          Manage
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            !data
                              .currentUser
                              .canManage
                          }
                        >
                          <Unplug className="h-4 w-4" />

                          <span className="sr-only">
                            Disconnect
                          </span>
                        </Button>
                      </>
                    )}
                  </div>

                  {!data.currentUser
                    .canManage && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Your team role
                      does not allow
                      integration
                      changes.
                    </p>
                  )}

                  {noSlots && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Your current
                      plan has no
                      remaining
                      integration
                      connections.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          },
        )}
      </div>

      {data.customIntegrations
        .length > 0 && (
        <>
          <div>
            <h2 className="text-xl font-semibold">
              Other integrations
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Additional systems
              reported by your
              business.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.customIntegrations.map(
              (integration) => (
                <Card
                  key={
                    integration.id
                  }
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Plug className="h-5 w-5" />

                      <CardTitle className="text-base">
                        {integration
                          .customProviderName ||
                          integration
                            .provider}
                      </CardTitle>
                    </div>

                    <CardDescription>
                      Reported during
                      business setup
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <Badge variant="secondary">
                      {statusLabel(
                        integration.status,
                      )}
                    </Badge>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Need another integration?
          </CardTitle>

          <CardDescription>
            Additional commerce,
            marketplace, and POS
            integrations can be added
            as the platform expands.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            asChild
            variant="outline"
          >
            <Link href="/business/support">
              Contact support

              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
