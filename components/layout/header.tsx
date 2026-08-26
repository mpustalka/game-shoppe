"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Crown,
  LayoutGrid,
  Lock,
  Menu,
  Package,
  PlusCircle,
  QrCode,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Upload,
} from "lucide-react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

import { AuthNav } from "@/components/layout/auth-nav"
import { useEntitlements } from "@/hooks/use-entitlements"

import type { Entitlements } from "@/lib/entitlements"

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutGrid
  gate?: (e: Entitlements) => boolean
  premium?: boolean
}

const primaryNavigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutGrid,
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
  },
  {
    name: "Binders",
    href: "/binders",
    icon: BookOpen,
  },
  {
    name: "Sell",
    href: "/sell",
    icon: ShoppingBag,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    premium: true,
    gate: (e) => e.canUseAnalytics,
  },
]

const browseNavigation: NavItem[] = [
  {
    name: "English Sets",
    href: "/sets",
    icon: Package,
  },
  {
    name: "Japanese Sets",
    href: "/japanese-sets",
    icon: Package,
  },
]

const moreNavigation: NavItem[] = [
  {
    name: "Showcase",
    href: "/showcase",
    icon: Share2,
    premium: true,
    gate: (e) => e.canUseShowcase,
  },
  {
    name: "Customer Lists",
    href: "/customer-lists",
    icon: ClipboardList,
    premium: true,
    gate: (e) => e.canUseCustomerLists,
  },
  {
    name: "Add Card",
    href: "/add",
    icon: PlusCircle,
    gate: (e) => e.canAddCards,
  },
  {
    name: "Import",
    href: "/import",
    icon: Upload,
    premium: true,
    gate: (e) => e.canImport,
  },
  {
    name: "Scan",
    href: "/scan",
    icon: QrCode,
    premium: true,
    gate: (e) => e.canScan,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

const mobileNavigation: NavItem[] = [
  ...primaryNavigation,
  ...browseNavigation,
  ...moreNavigation,
]

export function Header() {
  const pathname = usePathname()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const {
    entitlements,
    loading: entitlementsLoading,
  } = useEntitlements()

  const publicRoutes = [
    "/welcome",
    "/login",
    "/reset-password",
    "/auth",
    "/share",
  ]

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  )

  if (isPublicRoute) {
    return null
  }

  const hasPremiumAccess =
    entitlements.canUseAnalytics &&
    entitlements.canUseShowcase &&
    entitlements.canUseCustomerLists &&
    entitlements.canImport &&
    entitlements.canScan

  function getNavigationHref(item: NavItem) {
    if (entitlementsLoading) {
      return item.href
    }

    const locked = item.gate
      ? !item.gate(entitlements)
      : false

    return locked
      ? "/settings?tab=billing"
      : item.href
  }

  function isLocked(item: NavItem) {
    if (entitlementsLoading) {
      return false
    }

    return item.gate
      ? !item.gate(entitlements)
      : false
  }

  function isActive(item: NavItem) {
    return (
      pathname === item.href ||
      (
        item.href !== "/" &&
        pathname.startsWith(`${item.href}/`)
      )
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">

      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">

        {/* LOGO */}

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>

          <span className="hidden text-lg font-semibold tracking-tight xl:inline-block">
            Card Vault
          </span>
        </Link>


        {/* DESKTOP NAV */}

        <nav className="hidden shrink-0 items-center gap-1 lg:flex">

          {primaryNavigation.map((item) => {
            const locked = isLocked(item)
            const active = isActive(item)

            return (
              <Link
                key={item.name}
                href={getNavigationHref(item)}
                title={
                  locked
                    ? `${item.name} requires Premium`
                    : undefined
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active && !locked
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  locked && "opacity-75",
                )}
              >
                {locked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <item.icon className="h-4 w-4" />
                )}

                <span>{item.name}</span>
              </Link>
            )
          })}


          {/* BROWSE */}

          <NavDropdown
            label="Browse"
            active={
              pathname.startsWith("/sets") ||
              pathname.startsWith("/japanese-sets")
            }
            items={browseNavigation}
            getNavigationHref={getNavigationHref}
            isLocked={isLocked}
          />


          {/* MORE */}

          <NavDropdown
            label="More"
            active={moreNavigation.some(isActive)}
            items={moreNavigation}
            getNavigationHref={getNavigationHref}
            isLocked={isLocked}
          />

        </nav>


        {/* SEARCH */}

        <div className="ml-auto hidden min-w-0 flex-1 justify-end md:flex">

          <form
            action="/search"
            className="relative w-full max-w-[280px]"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="search"
              name="q"
              placeholder="Search cards..."
              className="w-full pl-9"
            />
          </form>

        </div>


        {/* ACCOUNT */}

        <div className="flex shrink-0 items-center gap-2">

          {!entitlementsLoading &&
            !hasPremiumAccess &&
            entitlements.plan === "basic" && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden gap-1.5 2xl:flex"
              >
                <Link href="/settings?tab=billing">
                  <Crown className="h-4 w-4" />
                  Upgrade
                </Link>
              </Button>
            )}

          <AuthNav />


          {/* MOBILE */}

          <Sheet
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
          >
            <SheetTrigger
              asChild
              className="lg:hidden"
            >
              <Button
                variant="ghost"
                size="icon"
              >
                <Menu className="h-5 w-5" />

                <span className="sr-only">
                  Open menu
                </span>
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[310px] sm:w-[360px]"
            >

              <div className="flex flex-col gap-5 py-4">

                {!entitlementsLoading && (
                  <div className="rounded-xl border bg-muted/30 p-3">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Current plan
                        </p>

                        <p className="font-semibold capitalize">
                          {entitlements.plan === "trial"
                            ? "Premium Trial"
                            : entitlements.plan === "grandfathered"
                              ? "Founding Premium"
                              : entitlements.plan === "admin"
                                ? "Admin"
                                : entitlements.plan}
                        </p>
                      </div>

                      {entitlements.plan === "basic" && (
                        <Button
                          asChild
                          size="sm"
                        >
                          <Link
                            href="/settings?tab=billing"
                            onClick={() =>
                              setMobileMenuOpen(false)
                            }
                          >
                            Upgrade
                          </Link>
                        </Button>
                      )}

                    </div>

                  </div>
                )}


                <form
                  action="/search"
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    type="search"
                    name="q"
                    placeholder="Search cards..."
                    className="pl-9"
                  />
                </form>


                <nav className="flex flex-col gap-1">

                  {mobileNavigation.map((item) => {
                    const locked = isLocked(item)
                    const active = isActive(item)

                    return (
                      <Link
                        key={`${item.name}-${item.href}`}
                        href={getNavigationHref(item)}
                        onClick={() =>
                          setMobileMenuOpen(false)
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                          active && !locked
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          locked && "opacity-75",
                        )}
                      >
                        {locked ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <item.icon className="h-5 w-5" />
                        )}

                        <span>{item.name}</span>

                        {item.premium && (
                          <div className="ml-auto">
                            <PremiumBadge locked={locked} />
                          </div>
                        )}
                      </Link>
                    )
                  })}

                </nav>

              </div>

            </SheetContent>
          </Sheet>

        </div>

      </div>

    </header>
  )
}


function NavDropdown({
  label,
  active,
  items,
  getNavigationHref,
  isLocked,
}: {
  label: string
  active: boolean
  items: NavItem[]
  getNavigationHref: (item: NavItem) => string
  isLocked: (item: NavItem) => boolean
}) {
  return (
    <div className="group relative">

      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {label}

        <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
      </button>


      <div className="invisible absolute left-0 top-full z-50 min-w-[230px] pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100">

        <div className="rounded-lg border bg-background p-1 shadow-xl">

          {items.map((item) => {
            const locked = isLocked(item)

            return (
              <Link
                key={item.name}
                href={getNavigationHref(item)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
              >
                {locked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                )}

                <span className="font-medium">
                  {item.name}
                </span>

                {item.premium && (
                  <div className="ml-auto">
                    <PremiumBadge locked={locked} />
                  </div>
                )}
              </Link>
            )
          })}

        </div>

      </div>

    </div>
  )
}


function PremiumBadge({
  locked,
}: {
  locked: boolean
}) {
  return (
    <Badge
      variant={
        locked
          ? "outline"
          : "secondary"
      }
      className={cn(
        "h-5 gap-1 px-1.5 text-[10px] font-medium",
        locked &&
          "border-primary/30 text-primary",
      )}
    >
      <Crown className="h-3 w-3" />
      Premium
    </Badge>
  )
}