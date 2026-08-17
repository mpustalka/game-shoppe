"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import {
  Search,
  Package,
  LayoutGrid,
  PlusCircle,
  QrCode,
  Menu,
  Settings,
  BookOpen,
  BarChart3,
  Upload,
  ChevronDown,
  ClipboardList,
  Share2,
  Lock,
  Crown,
} from "lucide-react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

import { AuthNav } from "@/components/layout/auth-nav"
import { useEntitlements } from "@/hooks/use-entitlements"

import type { Entitlements } from "@/lib/entitlements"

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutGrid

  /**
   * Optional entitlement gate.
   *
   * If the gate returns false, the item remains visible
   * but redirects to billing.
   */
  gate?: (e: Entitlements) => boolean

  /**
   * Shows the Premium label even when the user currently
   * has access through Premium, trial, grandfathered, etc.
   */
  premium?: boolean
}

const navigation: NavItem[] = [
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
    name: "Showcase",
    href: "/showcase",
    icon: Share2,
    premium: true,
    gate: (e) => e.canUseShowcase,
  },

  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    premium: true,
    gate: (e) => e.canUseAnalytics,
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
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutGrid,
  },

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
    name: "Showcase",
    href: "/showcase",
    icon: Share2,
    premium: true,
    gate: (e) => e.canUseShowcase,
  },

  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    premium: true,
    gate: (e) => e.canUseAnalytics,
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

export function Header() {
  const pathname = usePathname()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { entitlements, loading: entitlementsLoading } = useEntitlements()

  /**
   * Hide app navigation entirely on public pages.
   */
  const publicRoutes = [
    "/welcome",
    "/login",
    "/reset-password",
    "/auth",
    "/share",
  ]

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (isPublicRoute) {
    return null
  }

  /**
   * Determine whether the current user has
   * Premium-equivalent access.
   *
   * Trial, Premium, grandfathered, and admin all
   * resolve Premium feature gates as true.
   */
  const hasPremiumAccess =
    entitlements.canUseAnalytics &&
    entitlements.canUseShowcase &&
    entitlements.canUseCustomerLists &&
    entitlements.canImport &&
    entitlements.canScan

  function getNavigationHref(item: NavItem) {
    /**
     * While entitlements are loading, don't redirect
     * legitimate users to billing.
     */
    if (entitlementsLoading) {
      return item.href
    }

    const locked = item.gate ? !item.gate(entitlements) : false

    return locked ? "/settings?tab=billing" : item.href
  }

  function isLocked(item: NavItem) {
    if (entitlementsLoading) {
      return false
    }

    return item.gate ? !item.gate(entitlements) : false
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>

          <span className="hidden text-lg font-semibold tracking-tight sm:inline-block">
            Card Vault
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Browse Sets */}
          {/* Browse Sets Dropdown */}
          <div className="group relative">
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/sets") ||
                  pathname.startsWith("/japanese-sets")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Package className="h-4 w-4" />
              Browse Sets
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/*
    IMPORTANT:
    pt-1 creates visual spacing WITHOUT creating a hover gap.

    The outer wrapper touches the button at top-full, so moving
    the mouse down into the menu no longer closes it.
  */}
            <div
              className="
      invisible absolute left-0 top-full z-50
      min-w-[220px] pt-1
      opacity-0
      transition-all duration-150
      group-hover:visible
      group-hover:opacity-100
      group-focus-within:visible
      group-focus-within:opacity-100
    "
            >
              <div className="rounded-lg border bg-background p-1 shadow-lg">
                <Link
                  href="/sets"
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                >
                  <Package className="h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="font-medium">English Sets</p>

                    <p className="text-xs text-muted-foreground">
                      Browse Pokémon TCG sets
                    </p>
                  </div>
                </Link>

                <Link
                  href="/japanese-sets"
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                >
                  <Package className="h-4 w-4 text-muted-foreground" />

                  <div>
                    <p className="font-medium">Japanese Sets</p>

                    <p className="text-xs text-muted-foreground">
                      Browse Japanese releases
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {navigation.map((item) => {
            const locked = isLocked(item)

            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))

            const href = getNavigationHref(item)

            return (
              <Link
                key={item.name}
                href={href}
                title={locked ? `${item.name} requires Premium` : undefined}
                className={cn(
                  "group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",

                  isActive && !locked
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

                {item.premium && <PremiumBadge locked={locked} />}
              </Link>
            )
          })}
        </nav>

        {/* Search */}
        <div className="hidden flex-1 justify-end md:flex">
          <form action="/search" className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="search"
              name="q"
              placeholder="Search cards, SKU, or barcode..."
              className="w-full pl-9 pr-4"
            />
          </form>
        </div>

        {/* Account */}
        <div className="flex items-center gap-2">
          {/* Current plan indicator */}
          {!entitlementsLoading &&
            !hasPremiumAccess &&
            entitlements.plan === "basic" && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden gap-1.5 lg:flex"
              >
                <Link href="/settings?tab=billing">
                  <Crown className="h-4 w-4" />
                  Upgrade
                </Link>
              </Button>
            )}

          <AuthNav />

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />

                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[300px] sm:w-[350px]">
              <div className="flex flex-col gap-6 py-4">
                {/* Mobile plan card */}
                {!entitlementsLoading && (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-3">
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
                        <Button asChild size="sm">
                          <Link
                            href="/settings?tab=billing"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Upgrade
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Search */}
                <form action="/search" className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    type="search"
                    name="q"
                    placeholder="Search..."
                    className="w-full pl-9"
                  />
                </form>

                {/* Navigation */}
                <nav className="flex flex-col gap-1">
                  {mobileNavigation.map((item) => {
                    const locked = isLocked(item)

                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href))

                    const href = getNavigationHref(item)

                    return (
                      <Link
                        key={item.name}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",

                          isActive && !locked
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

function PremiumBadge({ locked }: { locked: boolean }) {
  return (
    <Badge
      variant={locked ? "outline" : "secondary"}
      className={cn(
        "h-5 gap-1 px-1.5 text-[10px] font-medium",

        locked && "border-primary/30 text-primary",
      )}
    >
      <Crown className="h-3 w-3" />
      Premium
    </Badge>
  )
}
